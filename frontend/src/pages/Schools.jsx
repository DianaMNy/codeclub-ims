// src/pages/Schools.jsx
import { useEffect, useState } from 'react';
import { getSchools, getMentors } from '../api/index';
import Layout from '../components/Layout';

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9',
  'Kajiado': '#F7941D',
  "Murang'a": '#1eb457',
};

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMentor, setFilterMentor] = useState('');

  useEffect(() => {
    Promise.all([getSchools(), getMentors()])
      .then(([s, m]) => { setSchools(s.data); setMentors(m.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter logic
  const filtered = schools.filter(s => {
    if (filterCounty && s.county !== filterCounty) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterMentor && s.mentor_name !== filterMentor) return false;
    return true;
  });

  const schoolsOnly = schools.filter(s => s.type === 'school');
  const active = schools.filter(s => s.status === 'active').length;
  const notStarted = schools.filter(s => s.status === 'enrolled').length;
  const centres = schools.filter(s => s.type === 'community_centre').length;
  const totalLearners = schools.reduce((sum, s) => sum + (s.learner_count || 0), 0);
  const mentorNames = [...new Set(schools.map(s => s.mentor_name).filter(Boolean))].sort();

  // Export CSV
  const exportCSV = () => {
    const headers = ['Club ID','School Name','Type','County','Area','Mentor','Club Leader','Learners','Status'];
    const rows = filtered.map(s => [
      s.club_id || '',
      s.official_name,
      s.type,
      s.county,
      s.subcounty_area || '',
      s.mentor_name || '',
      s.club_leader_name || '',
      s.learner_count || 0,
      s.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schools_export.csv';
    a.click();
  };

  return (
    <Layout title="Schools & Community Centres" subtitle="Enrolled venues · Live records">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL ENROLLED', value: schoolsOnly.length, sub:'schools', color:'#69A9C9' },
          { label:'ACTIVE CLUBS', value: active, sub:'sessions running', color:'#1eb457' },
          { label:'NOT YET STARTED', value: notStarted, sub:'need activation', color:'#e74c3c' },
          { label:'COMMUNITY CENTRES', value: centres, sub:'3 counties', color:'#F7941D' },
          { label:'TOTAL LEARNERS', value: totalLearners.toLocaleString(), sub:'registered', color:'#9b59b6' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={styles.cardValue}>{card.value}</p>
            <p style={{...styles.cardSub, color: card.color}}>{card.sub}</p>
          </div>
        ))}
      </div>

   <div style={styles.filterBar}>
  <div style={styles.filters}>
    <select style={styles.select} value={filterCounty} 
      onChange={e => setFilterCounty(e.target.value)}>
      <option value="">All Counties</option>
      <option value="Kiambu">Kiambu</option>
      <option value="Kajiado">Kajiado</option>
      <option value="Murang'a">Murang'a</option>
    </select>
    <select style={styles.select} value={filterStatus}
      onChange={e => setFilterStatus(e.target.value)}>
      <option value="">All Statuses</option>
      <option value="active">Active</option>
      <option value="enrolled">Not Started</option>
    </select>
    <select style={styles.select} value={filterMentor}
      onChange={e => setFilterMentor(e.target.value)}>
      <option value="">All Mentors</option>
      {mentorNames.map(m => <option key={m} value={m}>{m}</option>)}
    </select>
    {(filterCounty || filterStatus || filterMentor) && (
      <button style={styles.clearBtn}
        onClick={() => { setFilterCounty(''); setFilterStatus(''); setFilterMentor(''); }}>
        ✕ Clear filters
      </button>
    )}
  </div>
  <div style={styles.actions}>
    <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
    <button style={styles.enrolBtn}>+ Enrol School</button>
  </div>
</div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div>
            <p style={styles.tableTitle}>All schools & community centres — RPF 2026</p>
            <p style={styles.tableSub}>{filtered.length} schools · {centres} community centres · 3 counties · live database</p>
          </div>
        </div>

        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>SCHOOL / CENTRE</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>AREA</th>
                <th style={styles.th}>MENTOR</th>
                <th style={styles.th}>CLUB LEADER</th>
                <th style={styles.th}>LEARNERS</th>
                <th style={styles.th}>CLUB</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school, i) => (
                <tr key={school.id} style={{
                  background: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <td style={styles.td}>
                    <span style={styles.clubId}>{school.club_id || '—'}</span>
                  </td>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>
                    {school.official_name}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.countyBadge,
                      background: (COUNTY_COLORS[school.county] || '#888') + '20',
                      color: COUNTY_COLORS[school.county] || '#888',
                    }}>
                      {school.county}
                    </span>
                  </td>
                  <td style={styles.td}>{school.subcounty_area || '—'}</td>
                  <td style={styles.td}>{school.mentor_name || '—'}</td>
                  <td style={styles.td}>{school.club_leader_name || '—'}</td>
                  <td style={styles.td}>{school.learner_count || 0}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: school.status === 'active' ? '#eafaf1' : '#fdedec',
                      color: school.status === 'active' ? '#1a8a4a' : '#e74c3c',
                    }}>
                      ● {school.status === 'active' ? 'Active' : 'Not started'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'16px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 8px 0' },
  cardValue: { fontSize:'36px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'12px', margin:0, fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px' },
  filters: { display:'flex', gap:'10px' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  actions: { display:'flex', gap:'10px' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  enrolBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#F7941D', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  clubId: { fontFamily:'monospace', fontSize:'12px', color:'#8a96a3', fontWeight:'600' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  statusBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
};
