// src/pages/CommandCentre.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
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

const STATUS_COLORS = {
  'active': { bg:'#eafaf1', color:'#1a8a4a', label:'● Active' },
  'enrolled': { bg:'#fff3e0', color:'#F7941D', label:'● Not Started' },
  'inactive': { bg:'#fdedec', color:'#e74c3c', label:'● Inactive' },
};

const AVATAR_COLORS = ['#1eb457','#F7941D','#69A9C9','#9b59b6','#e74c3c','#1abc9c','#f39c12','#2980b9'];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '??'; }
function getColor(name) { let s=0; for(let c of (name||'')) s+=c.charCodeAt(0); return AVATAR_COLORS[s%AVATAR_COLORS.length]; }

export default function CommandCentre() {
  const [schools, setSchools] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMentor, setFilterMentor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [view, setView] = useState('table'); // table | cards

  useEffect(() => {
    Promise.all([
      api.get('/schools'),
      api.get('/mentors'),
      api.get('/flagalerts'),
    ]).then(([s, m, f]) => {
      setSchools(s.data);
      setMentors(m.data);
      setFlags(f.data);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const filtered = schools.filter(s => {
    if (filterCounty && s.county !== filterCounty) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterMentor && s.mentor_name !== filterMentor) return false;
    if (filterType && s.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.official_name?.toLowerCase().includes(q) &&
          !s.club_id?.toLowerCase().includes(q) &&
          !s.mentor_name?.toLowerCase().includes(q) &&
          !s.club_leader_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const mentorNames = [...new Set(schools.map(s => s.mentor_name).filter(Boolean))].sort();
  const openFlags = flags.filter(f => f.status === 'open');
  const activeSchools = schools.filter(s => s.status === 'active').length;
  const totalLearners = schools.reduce((sum, s) => sum + (s.learner_count || 0), 0);

  const exportCSV = () => {
    const headers = ['Club ID','School Name','Type','County','Area','Mentor','Club Leader','Learners','Status','Flags'];
    const rows = filtered.map(s => [
      s.club_id||'', s.official_name, s.type, s.county,
      s.subcounty_area||'', s.mentor_name||'', s.club_leader_name||'',
      s.learner_count||0, s.status,
      openFlags.filter(f=>f.school_id===s.id).length,
    ]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='command_centre_export.csv'; a.click();
  };

  return (
    <Layout title="Command Centre" subtitle="All data · One view · Live database · RPF 2026">

      {/* Top Stats */}
      <div style={styles.topStats}>
        {[
          { label:'TOTAL RECORDS', value: schools.length, color:'#69A9C9', icon:'📋' },
          { label:'ACTIVE CLUBS', value: activeSchools, color:'#1eb457', icon:'✅' },
          { label:'TOTAL LEARNERS', value: totalLearners.toLocaleString(), color:'#F7941D', icon:'👨‍💻' },
          { label:'MENTORS', value: mentors.length, color:'#9b59b6', icon:'👤' },
          { label:'OPEN FLAGS', value: openFlags.length, color:'#e74c3c', icon:'🚩' },
          { label:'SHOWING', value: filtered.length, color:'#1abc9c', icon:'🔍' },
        ].map(stat => (
          <div key={stat.label} style={{...styles.statCard, borderTop:`3px solid ${stat.color}`}}>
            <div style={styles.statRow}>
              <span style={{fontSize:'20px'}}>{stat.icon}</span>
              <div>
                <p style={styles.statLabel}>{stat.label}</p>
                <p style={{...styles.statValue, color: stat.color}}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Open Flags Alert */}
      {openFlags.length > 0 && (
        <div style={styles.flagAlert}>
          <span style={{fontSize:'18px'}}>🚨</span>
          <div style={{flex:1}}>
            <p style={styles.flagAlertTitle}>{openFlags.length} open flag{openFlags.length>1?'s':''} require attention</p>
            <div style={styles.flagList}>
              {openFlags.slice(0,3).map(f => (
                <span key={f.id} style={styles.flagPill}>
                  🚩 {f.school_name} — {f.county}
                </span>
              ))}
              {openFlags.length > 3 && <span style={styles.flagPill}>+{openFlags.length-3} more</span>}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <input style={styles.search} placeholder="🔍 Search school, club ID, mentor, teacher..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select style={styles.select} value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            <option value="Kiambu">Kiambu</option>
            <option value="Kajiado">Kajiado</option>
            <option value="Murang'a">Murang'a</option>
          </select>
          <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="enrolled">Not Started</option>
          </select>
          <select style={styles.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="school">Schools</option>
            <option value="community_centre">Community Centres</option>
          </select>
          <select style={styles.select} value={filterMentor} onChange={e => setFilterMentor(e.target.value)}>
            <option value="">All Mentors</option>
            {mentorNames.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {(filterCounty||filterStatus||filterType||filterMentor||search) && (
            <button style={styles.clearBtn} onClick={() => {
              setFilterCounty(''); setFilterStatus(''); setFilterType('');
              setFilterMentor(''); setSearch('');
            }}>✕ Clear</button>
          )}
        </div>
        <div style={styles.actions}>
          <div style={styles.viewToggle}>
            <button style={{...styles.toggleBtn, background: view==='table'?'#1a2332':'transparent', color: view==='table'?'#fff':'#555'}}
              onClick={() => setView('table')}>≡ Table</button>
            <button style={{...styles.toggleBtn, background: view==='cards'?'#1a2332':'transparent', color: view==='cards'?'#fff':'#555'}}
              onClick={() => setView('cards')}>⊞ Cards</button>
          </div>
          <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.loading}>Loading all data...</div>
      ) : view === 'table' ? (

        /* TABLE VIEW */
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <p style={styles.tableTitle}>All Schools & Community Centres — RPF 2026</p>
            <p style={styles.tableSub}>{filtered.length} records · {schools.filter(s=>s.type==='school').length} schools · {schools.filter(s=>s.type==='community_centre').length} centres · live database</p>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>CLUB ID</th>
                  <th style={styles.th}>SCHOOL / CENTRE</th>
                  <th style={styles.th}>TYPE</th>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>AREA</th>
                  <th style={styles.th}>MENTOR</th>
                  <th style={styles.th}>CLUB LEADER</th>
                  <th style={styles.th}>LEARNERS</th>
                  <th style={styles.th}>STATUS</th>
                  <th style={styles.th}>FLAGS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school, i) => {
                  const schoolFlags = openFlags.filter(f => f.school_id === school.id);
                  const statusStyle = STATUS_COLORS[school.status] || STATUS_COLORS.enrolled;
                  return (
                    <tr key={school.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={{...styles.td, fontFamily:'monospace', color:'#8a96a3', fontWeight:'600'}}>
                        {school.club_id || '—'}
                      </td>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332', maxWidth:'220px'}}>
                        {school.official_name}
                      </td>
                      <td style={styles.td}>
                        <span style={{fontSize:'13px'}}>
                          {school.type === 'school' ? '🏫' : '🏢'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: (COUNTY_COLORS[school.county]||'#888')+'20',
                          color: COUNTY_COLORS[school.county]||'#888'}}>
                          {school.county}
                        </span>
                      </td>
                      <td style={styles.td}>{school.subcounty_area || '—'}</td>
                      <td style={styles.td}>
                        {school.mentor_name ? (
                          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            <div style={{width:'24px', height:'24px', borderRadius:'50%', background:getColor(school.mentor_name), color:'#fff', fontSize:'9px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                              {getInitials(school.mentor_name)}
                            </div>
                            <span style={{fontSize:'12px'}}>{school.mentor_name}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={styles.td}>{school.club_leader_name || '—'}</td>
                      <td style={{...styles.td, fontWeight:'600', color:'#1a2332'}}>{school.learner_count || 0}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background: statusStyle.bg, color: statusStyle.color}}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {schoolFlags.length > 0 ? (
                          <span style={{...styles.badge, background:'#fdedec', color:'#e74c3c'}}>
                            🚩 {schoolFlags.length}
                          </span>
                        ) : (
                          <span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>✅</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{padding:'60px', textAlign:'center', color:'#888'}}>
                      No records match your filters. Try clearing some filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* CARDS VIEW */
        <div style={styles.cardsGrid}>
          {filtered.map(school => {
            const schoolFlags = openFlags.filter(f => f.school_id === school.id);
            const statusStyle = STATUS_COLORS[school.status] || STATUS_COLORS.enrolled;
            return (
              <div key={school.id} style={{
                ...styles.schoolCard,
                borderTop: `3px solid ${COUNTY_COLORS[school.county]||'#888'}`,
                opacity: school.status === 'enrolled' ? 0.85 : 1,
              }}>
                {/* Card header */}
                <div style={styles.schoolCardHead}>
                  <div>
                    <p style={styles.schoolName}>{school.official_name}</p>
                    <p style={styles.schoolMeta}>{school.club_id || '—'} · {school.subcounty_area || school.county}</p>
                  </div>
                  <span style={{fontSize:'20px'}}>{school.type==='school'?'🏫':'🏢'}</span>
                </div>

                {/* Stats row */}
                <div style={styles.schoolStats}>
                  <div style={styles.schoolStat}>
                    <p style={styles.schoolStatValue}>{school.learner_count||0}</p>
                    <p style={styles.schoolStatLabel}>Learners</p>
                  </div>
                  <div style={styles.schoolStat}>
                    <span style={{...styles.badge,
                      background:(COUNTY_COLORS[school.county]||'#888')+'20',
                      color:COUNTY_COLORS[school.county]||'#888'}}>
                      {school.county}
                    </span>
                  </div>
                  <div style={styles.schoolStat}>
                    <span style={{...styles.badge, background:statusStyle.bg, color:statusStyle.color}}>
                      {statusStyle.label}
                    </span>
                  </div>
                </div>

                {/* Mentor */}
                {school.mentor_name && (
                  <div style={styles.mentorRow}>
                    <div style={{width:'28px', height:'28px', borderRadius:'50%', background:getColor(school.mentor_name), color:'#fff', fontSize:'10px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      {getInitials(school.mentor_name)}
                    </div>
                    <span style={{fontSize:'12px', color:'#555'}}>{school.mentor_name}</span>
                  </div>
                )}

                {/* Flag indicator */}
                {schoolFlags.length > 0 && (
                  <div style={styles.flagIndicator}>
                    🚩 {schoolFlags.length} open flag{schoolFlags.length>1?'s':''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

const styles = {
  topStats: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'16px' },
  statCard: { background:'#fff', borderRadius:'10px', padding:'14px', boxShadow:'0 2px 6px rgba(0,0,0,0.06)' },
  statRow: { display:'flex', alignItems:'center', gap:'10px' },
  statLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 2px 0' },
  statValue: { fontSize:'22px', fontWeight:'700', margin:0 },
  flagAlert: { display:'flex', alignItems:'flex-start', gap:'12px', background:'#fde8e8', border:'1px solid #fcc', borderRadius:'10px', padding:'14px 18px', marginBottom:'16px' },
  flagAlertTitle: { fontSize:'13px', fontWeight:'600', color:'#c0392b', margin:'0 0 6px 0' },
  flagList: { display:'flex', gap:'8px', flexWrap:'wrap' },
  flagPill: { background:'#fdedec', color:'#e74c3c', borderRadius:'999px', padding:'3px 10px', fontSize:'12px', fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', flex:1 },
  search: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'260px' },
  select: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  actions: { display:'flex', gap:'10px', alignItems:'center' },
  viewToggle: { display:'flex', border:'1.5px solid #e2e8f0', borderRadius:'8px', overflow:'hidden' },
  toggleBtn: { padding:'7px 14px', border:'none', cursor:'pointer', fontSize:'13px', transition:'all 0.15s' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  loading: { textAlign:'center', padding:'60px', color:'#888', fontSize:'16px' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'900px' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'11px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  cardsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px' },
  schoolCard: { background:'#fff', borderRadius:'12px', padding:'18px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  schoolCardHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' },
  schoolName: { fontSize:'14px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0', lineHeight:1.3 },
  schoolMeta: { fontSize:'11px', color:'#8a96a3', margin:0, fontFamily:'monospace' },
  schoolStats: { display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'12px' },
  schoolStat: { display:'flex', flexDirection:'column', alignItems:'center' },
  schoolStatValue: { fontSize:'18px', fontWeight:'700', color:'#1a2332', margin:'0 0 2px 0' },
  schoolStatLabel: { fontSize:'10px', color:'#8a96a3', margin:0 },
  mentorRow: { display:'flex', alignItems:'center', gap:'8px', marginTop:'8px', paddingTop:'8px', borderTop:'1px solid #f0f0f0' },
  flagIndicator: { marginTop:'8px', background:'#fdedec', color:'#e74c3c', borderRadius:'6px', padding:'6px 10px', fontSize:'12px', fontWeight:'600' },
};
