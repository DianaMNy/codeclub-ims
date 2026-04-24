// src/pages/Teachers.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9',
  'Kajiado': '#F7941D',
  "Murang'a": '#1eb457',
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [filterSafeguarding, setFilterSafeguarding] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/teachers')
      .then(res => setTeachers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = teachers.filter(t => {
    if (filterCounty && t.county !== filterCounty) return false;
    if (filterTraining === 'yes' && !t.training_completed) return false;
    if (filterTraining === 'no' && t.training_completed) return false;
    if (filterSafeguarding === 'yes' && !t.safeguarding_done) return false;
    if (filterSafeguarding === 'no' && t.safeguarding_done) return false;
    if (search && !t.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !t.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalTraining = teachers.filter(t => t.training_completed).length;
  const totalSafeguarding = teachers.filter(t => t.safeguarding_done).length;
  const clubLeaders = teachers.filter(t => t.role === 'club_leader').length;
  const additional = teachers.filter(t => t.role === 'additional').length;

  const exportCSV = () => {
    const headers = ['Name','Role','School','County','Area','Mentor','Training','Safeguarding'];
    const rows = filtered.map(t => [
      t.full_name, t.role, t.school_name || '', t.county || '',
      t.subcounty_area || '', t.mentor_name || '',
      t.training_completed ? 'Yes' : 'No',
      t.safeguarding_done ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'teachers_export.csv'; a.click();
  };

  return (
    <Layout title="Teachers & Club Leaders" subtitle="Educators · Code Club facilitators · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL EDUCATORS', value: teachers.length, sub:'enrolled in system', color:'#69A9C9' },
          { label:'CLUB LEADERS', value: clubLeaders, sub:'main facilitators', color:'#1eb457' },
          { label:'ADDITIONAL TEACHERS', value: additional, sub:'supporting educators', color:'#F7941D' },
          { label:'TRAINING COMPLETED', value: totalTraining, sub:`of ${teachers.length} enrolled`, color:'#9b59b6' },
          { label:'SAFEGUARDING DONE', value: totalSafeguarding, sub:`of ${teachers.length} enrolled`, color:'#1abc9c' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={styles.cardValue}>{card.value}</p>
            <p style={{...styles.cardSub, color: card.color}}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <input
            style={styles.search}
            placeholder="🔍 Search teacher or school..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={styles.select} value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            <option value="Kiambu">Kiambu</option>
            <option value="Kajiado">Kajiado</option>
            <option value="Murang'a">Murang'a</option>
          </select>
          <select style={styles.select} value={filterTraining} onChange={e => setFilterTraining(e.target.value)}>
            <option value="">All Training</option>
            <option value="yes">Training Complete</option>
            <option value="no">Not Trained</option>
          </select>
          <select style={styles.select} value={filterSafeguarding} onChange={e => setFilterSafeguarding(e.target.value)}>
            <option value="">All Safeguarding</option>
            <option value="yes">Safeguarding Done</option>
            <option value="no">Not Done</option>
          </select>
          {(filterCounty || filterTraining || filterSafeguarding || search) && (
            <button style={styles.clearBtn} onClick={() => {
              setFilterCounty(''); setFilterTraining('');
              setFilterSafeguarding(''); setSearch('');
            }}>✕ Clear</button>
          )}
        </div>
        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>All teachers & club leaders — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} educators · live database</p>
        </div>

        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>TEACHER / CLUB LEADER</th>
                <th style={styles.th}>ROLE</th>
                <th style={styles.th}>SCHOOL</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>AREA</th>
                <th style={styles.th}>MENTOR</th>
                <th style={styles.th}>TRAINING</th>
                <th style={styles.th}>SAFEGUARDING</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher, i) => (
                <tr key={teacher.id} style={{
                  background: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>
                    {teacher.full_name}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.roleBadge,
                      background: teacher.role === 'club_leader' ? '#e8f4fd' : '#f0f4f8',
                      color: teacher.role === 'club_leader' ? '#2980b9' : '#666',
                    }}>
                      {teacher.role === 'club_leader' ? '⭐ Club Leader' : '+ Additional'}
                    </span>
                  </td>
                  <td style={styles.td}>{teacher.school_name || '—'}</td>
                  <td style={styles.td}>
                    {teacher.county && (
                      <span style={{
                        ...styles.countyBadge,
                        background: (COUNTY_COLORS[teacher.county] || '#888') + '20',
                        color: COUNTY_COLORS[teacher.county] || '#888',
                      }}>
                        {teacher.county}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{teacher.subcounty_area || '—'}</td>
                  <td style={styles.td}>{teacher.mentor_name || '—'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.checkBadge,
                      background: teacher.training_completed ? '#eafaf1' : '#fef9e7',
                      color: teacher.training_completed ? '#1a8a4a' : '#a0720a',
                    }}>
                      {teacher.training_completed ? '✅ Done' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.checkBadge,
                      background: teacher.safeguarding_done ? '#eafaf1' : '#fdedec',
                      color: teacher.safeguarding_done ? '#1a8a4a' : '#e74c3c',
                    }}>
                      {teacher.safeguarding_done ? '✅ Done' : '❌ Not done'}
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
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'220px' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  actions: { display:'flex', gap:'10px' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  roleBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  checkBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
};
