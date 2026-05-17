// src/pages/Ecosystem.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useIsMobile } from '../hooks/useIsMobile';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const ROLE_LABELS = {
  head_of_school: 'Head of School',
  centre_manager: 'Centre Manager',
  additional: 'Additional Educator',
  ict_intern: 'ICT Intern',
  subcounty_director: 'Sub-county Director',
};

const ROLE_COLORS = {
  head_of_school: '#69A9C9',
  centre_manager: '#9b59b6',
  additional: '#1eb457',
  ict_intern: '#f39c12',
  subcounty_director: '#e74c3c',
};

export default function Ecosystem() {
  const isMobile = useIsMobile();
  const [hos, setHos] = useState([]);
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [filterCounty, setFilterCounty] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/hos').catch(() => ({ data: [] })),
      api.get('/ecosystem-extras').catch(() => ({ data: [] })),
    ]).then(([h, e]) => {
      setHos(h.data || []);
      setExtras(e.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const all = [
    ...hos.map(h => ({
      id: h.id,
      full_name: h.full_name,
      role: h.role || 'head_of_school',
      phone: h.phone,
      email: h.email,
      county: h.county,
      school_name: h.school_name,
      training_completed: h.training_completed,
      safeguarding_done: h.safeguarding_done,
      survey_done: h.survey_done,
      source: 'hos',
    })),
    ...extras.map(e => ({
      id: e.id,
      full_name: e.full_name,
      role: e.role || 'additional',
      phone: e.phone,
      email: e.email,
      county: e.county,
      school_name: e.subcounty_area,
      training_completed: e.training_completed,
      safeguarding_done: e.safeguarding_done,
      survey_done: e.survey_done,
      source: 'extras',
    })),
  ];

  const counties = [...new Set(all.map(p => p.county).filter(Boolean))].sort();
  const roles = [...new Set(all.map(p => p.role).filter(Boolean))];

  const filtered = all.filter(p => {
    const matchRole = filterRole === 'all' || p.role === filterRole;
    const matchCounty = !filterCounty || p.county === filterCounty;
    const matchSearch = !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.school_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.county || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchCounty && matchSearch;
  });

  const totalTrained = all.filter(p => p.training_completed).length;
  const totalSafeguarding = all.filter(p => p.safeguarding_done).length;
  const totalSurvey = all.filter(p => p.survey_done).length;

  return (
    <Layout title="Ecosystem Building" subtitle="Heads of School · Centre Managers · Additional Educators · Partners">

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total Builders', value:all.length,         color:'#9b59b6', icon:'🌱' },
          { label:'Training Done',  value:totalTrained,        color:'#1eb457', icon:'📚' },
          { label:'Safeguarding',   value:totalSafeguarding,   color:'#69A9C9', icon:'🛡️' },
          { label:'Survey Done',    value:totalSurvey,         color:'#F7941D', icon:'📋' },
        ].map(stat => (
          <div key={stat.label} style={{ background:'#fff', borderRadius:'10px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', borderTop:`3px solid ${stat.color}` }}>
            <p style={{ margin:'0 0 6px 0', fontSize:'22px' }}>{stat.icon}</p>
            <p style={{ margin:'0 0 2px 0', fontSize:'24px', fontWeight:'700', color:stat.color }}>{stat.value}</p>
            <p style={{ margin:0, fontSize:'11px', color:'#8a96a3', fontWeight:'600' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Role breakdown chips */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'20px' }}>
        {roles.map(role => {
          const count = all.filter(p => p.role === role).length;
          const color = ROLE_COLORS[role] || '#888';
          return (
            <div key={role} style={{ background:'#fff', borderRadius:'20px', padding:'6px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', border:`1.5px solid ${filterRole===role ? color : '#e2e8f0'}` }}
              onClick={() => setFilterRole(filterRole === role ? 'all' : role)}>
              <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, display:'inline-block' }} />
              <span style={{ fontSize:'12px', fontWeight:'600', color:'#1a2332' }}>{ROLE_LABELS[role] || role}</span>
              <span style={{ fontSize:'12px', color:color, fontWeight:'700' }}>{count}</span>
            </div>
          );
        })}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div>
            <p style={styles.sectionTitle}>🌱 Ecosystem Builders Directory</p>
            <p style={styles.sectionSub}>{filtered.length} of {all.length} people</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filterBar}>
          <input style={{ ...styles.filterInput, minWidth: isMobile ? '100%' : '180px' }}
            placeholder="Search name, school or county..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select style={styles.filterSelect} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
          </select>
          <select style={styles.filterSelect} value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {counties.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || filterRole !== 'all' || filterCounty) && (
            <button style={styles.clearBtn} onClick={() => { setSearch(''); setFilterRole('all'); setFilterCounty(''); }}>✕ Clear</button>
          )}
        </div>

        {loading ? (
          <p style={{ color:'#888', padding:'20px' }}>Loading...</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ ...styles.table, minWidth:'700px' }}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>NAME</th>
                  <th style={styles.th}>ROLE</th>
                  <th style={styles.th}>SCHOOL / AREA</th>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>PHONE</th>
                  <th style={{ ...styles.th, textAlign:'center' }}>TRAINING</th>
                  <th style={{ ...styles.th, textAlign:'center' }}>SAFEGUARDING</th>
                  <th style={{ ...styles.th, textAlign:'center' }}>SURVEY</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const color = ROLE_COLORS[p.role] || '#888';
                  return (
                    <tr key={`${p.source}-${p.id}`} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ ...styles.td, fontWeight:'500', color:'#1a2332' }}>{p.full_name}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background:color+'20', color }}>
                          {ROLE_LABELS[p.role] || p.role}
                        </span>
                      </td>
                      <td style={styles.td}>{p.school_name || '—'}</td>
                      <td style={styles.td}>{p.county || '—'}</td>
                      <td style={styles.td}>{p.phone || '—'}</td>
                      <td style={{ ...styles.td, textAlign:'center' }}>{p.training_completed ? '✅' : '❌'}</td>
                      <td style={{ ...styles.td, textAlign:'center' }}>{p.safeguarding_done ? '✅' : '❌'}</td>
                      <td style={{ ...styles.td, textAlign:'center' }}>{p.survey_done ? '✅' : '❌'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#888' }}>
                      {all.length === 0 ? 'No ecosystem builders found. Run the seed script to import data.' : 'No results match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  filterBar: { display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' },
  filterInput: { padding:'9px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  filterSelect: { padding:'9px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'9px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#e74c3c', fontSize:'13px', cursor:'pointer', fontWeight:'600' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
};
