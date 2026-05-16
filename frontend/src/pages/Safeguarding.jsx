// src/pages/Safeguarding.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const KENYA_COUNTIES = [
  'Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta',
  'Garissa','Wajir','Mandera','Marsabit','Isiolo','Meru',
  'Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua',
  'Nyeri','Kirinyaga',"Murang'a",'Kiambu','Turkana','West Pokot',
  'Samburu','Trans Nzoia','Uasin Gishu','Elgeyo-Marakwet','Nandi',
  'Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet',
  'Kakamega','Vihiga','Bungoma','Busia','Siaya','Kisumu','Homa Bay',
  'Migori','Kisii','Nyamira','Nairobi'
];

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9', 'Kajiado': '#F7941D', "Murang'a": '#1eb457',
};

const ROLE_LABELS = {
  'club_leader':        { label: '⭐ Club Leader',           color: '#2980b9', bg: '#e8f4fd' },
  'centre_club_leader': { label: '🏢 Centre Club Leader',    color: '#1abc9c', bg: '#e8f8f5' },
  'additional':         { label: '👩‍🏫 Additional Teacher',   color: '#1eb457', bg: '#eafaf1' },
  'head_of_school':     { label: '🏫 Head of School',        color: '#8e44ad', bg: '#f5eef8' },
  'centre_manager':     { label: '🏢 Centre Manager',        color: '#9b59b6', bg: '#f0e6ff' },
  'ict_intern':         { label: '💻 ICT Intern',            color: '#F7941D', bg: '#fdecd5' },
  'subcounty_director': { label: '📋 Sub-County Director',   color: '#e74c3c', bg: '#fdedec' },
  'mentor':             { label: '👤 Mentor',                color: '#1eb457', bg: '#eafaf1' },
};

export default function Safeguarding() {
  const [people, setPeople]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterCounty, setFilterCounty]   = useState('');
  const [filterRole, setFilterRole]       = useState('');
  const [filterSafeguarding, setFilterSafeguarding] = useState('');
  const [filterTraining, setFilterTraining]         = useState('');
  const [search, setSearch]               = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/safeguarding');
      // Sort alphabetically by full_name
      const sorted = res.data.sort((a, b) => (a.full_name||'').localeCompare(b.full_name||''));
      setPeople(sorted);
    } catch (err) {
      console.error('Safeguarding fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (person, field) => {
    try {
      await api.patch(`/safeguarding/${person.id}/toggle`, {
        field,
        person_type: person.person_type,
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const filtered = people.filter(p => {
    if (filterCounty && p.county !== filterCounty) return false;
    if (filterRole && p.role !== filterRole) return false;
    if (filterSafeguarding === 'yes' && !p.safeguarding_done) return false;
    if (filterSafeguarding === 'no' && p.safeguarding_done) return false;
    if (filterTraining === 'yes' && !p.training_completed) return false;
    if (filterTraining === 'no' && p.training_completed) return false;
    if (search && !p.full_name?.toLowerCase().includes(search.toLowerCase()) &&
        !p.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const total        = people.length;
  const safeDone     = people.filter(p => p.safeguarding_done).length;
  const pending      = total - safeDone;
  const trainDone    = people.filter(p => p.training_completed).length;
  const rate         = total ? Math.round((safeDone / total) * 100) : 0;

  // Role counts
  const clubLeaders    = people.filter(p => p.role === 'club_leader').length;
  const centreLeaders  = people.filter(p => p.role === 'centre_club_leader').length;
  const additional     = people.filter(p => p.role === 'additional').length;
  const hos            = people.filter(p => p.role === 'head_of_school').length;
  const managers       = people.filter(p => p.role === 'centre_manager').length;
  const ict            = people.filter(p => p.role === 'ict_intern').length;
  const directors      = people.filter(p => p.role === 'subcounty_director').length;
  const mentors        = people.filter(p => p.role === 'mentor').length;

  const exportCSV = () => {
    const headers = ['Name','Role','School/Centre','County','Mentor','Safeguarding Done','Training Done'];
    const rows = filtered.map(p => [
      p.full_name, p.role, p.school_name||'', p.county||'',
      p.mentor_name||'',
      p.safeguarding_done?'Yes':'No',
      p.training_completed?'Yes':'No',
    ]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='safeguarding_export.csv'; a.click();
  };

  const ToggleBtn = ({ person, field, yesLabel, noLabel, noColor, noBg }) => (
    <span
      style={{...styles.badge, cursor:'pointer',
        background: person[field] ? '#eafaf1' : (noBg||'#fdedec'),
        color: person[field] ? '#1a8a4a' : (noColor||'#e74c3c'),
      }}
      onClick={() => handleToggle(person, field)}
      title="Click to toggle"
    >
      {person[field] ? yesLabel : noLabel}
    </span>
  );

  return (
    <Layout title="Safeguarding" subtitle="All actors · Module completion · RPF 2026">

      {/* Top stat cards */}
      <div style={styles.cards}>
        {[
          { label:'SAFEGUARDING DONE', value:safeDone,   sub:'completed module',    color:'#1eb457' },
          { label:'PENDING',           value:pending,     sub:'not yet done',        color:'#e74c3c' },
          { label:'TRAINING DONE',     value:trainDone,   sub:`of ${total} total`,   color:'#9b59b6' },
          { label:'COMPLETION RATE',   value:`${rate}%`,  sub:'safeguarding rate',   color:'#69A9C9' },
          { label:'TOTAL TRACKED',     value:total,       sub:'all roles',           color:'#F7941D' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={{...styles.cardValue, color:card.color}}>{card.value}</p>
            <p style={styles.cardSub}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Role breakdown cards */}
      <div style={styles.roleCards}>
        {[
          { label:'Club Leaders',        value:clubLeaders,  color:'#2980b9' },
          { label:'Centre Club Leaders', value:centreLeaders,color:'#1abc9c' },
          { label:'Additional Teachers', value:additional,   color:'#1eb457' },
          { label:'Heads of School',     value:hos,          color:'#8e44ad' },
          { label:'Centre Managers',     value:managers,     color:'#9b59b6' },
          { label:'ICT Interns',         value:ict,          color:'#F7941D' },
          { label:'Sub-County Directors',value:directors,    color:'#e74c3c' },
          { label:'Mentors',             value:mentors,      color:'#1eb457' },
        ].map(card => (
          <div key={card.label} style={{...styles.roleCard, borderLeft:`3px solid ${card.color}`}}>
            <p style={{...styles.roleCardValue, color:card.color}}>{card.value}</p>
            <p style={styles.roleCardLabel}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <input style={styles.search} placeholder="🔍 Search name or school..."
            value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={styles.select} value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="club_leader">⭐ Club Leaders</option>
            <option value="centre_club_leader">🏢 Centre Club Leaders</option>
            <option value="additional">👩‍🏫 Additional Teachers</option>
            <option value="head_of_school">🏫 Heads of School</option>
            <option value="centre_manager">🏢 Centre Managers</option>
            <option value="ict_intern">💻 ICT Interns</option>
            <option value="subcounty_director">📋 Sub-County Directors</option>
            <option value="mentor">👤 Mentors</option>
          </select>
          <select style={styles.select} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={filterSafeguarding} onChange={e=>setFilterSafeguarding(e.target.value)}>
            <option value="">All Safeguarding</option>
            <option value="yes">✅ Safeguarding Done</option>
            <option value="no">❌ Not Done</option>
          </select>
          <select style={styles.select} value={filterTraining} onChange={e=>setFilterTraining(e.target.value)}>
            <option value="">All Training</option>
            <option value="yes">✅ Training Done</option>
            <option value="no">❌ Not Trained</option>
          </select>
          {(filterCounty||filterRole||filterSafeguarding||filterTraining||search) && (
            <button style={styles.clearBtn} onClick={()=>{
              setFilterCounty('');setFilterRole('');
              setFilterSafeguarding('');setFilterTraining('');setSearch('');
            }}>✕ Clear</button>
          )}
        </div>
        <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>Safeguarding tracker — all actors · RPF 2026</p>
          <p style={styles.tableSub}>
            {filtered.length} of {total} people · sorted alphabetically · click badges to toggle
          </p>
        </div>
        {loading ? (
          <p style={{color:'#888', padding:'20px'}}>Loading...</p>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>NAME</th>
                  <th style={styles.th}>ROLE</th>
                  <th style={styles.th}>SCHOOL / CENTRE</th>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>MENTOR</th>
                  <th style={styles.th}>SAFEGUARDING</th>
                  <th style={styles.th}>TRAINING</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const roleInfo = ROLE_LABELS[p.role] || { label:p.role, color:'#888', bg:'#f0f0f0' };
                  return (
                    <tr key={`${p.person_type}-${p.id}`}
                      style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{p.full_name}</td>
                      <td style={styles.td}>
                        <span style={{...styles.roleBadge, background:roleInfo.bg, color:roleInfo.color}}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td style={styles.td}>{p.school_name||'—'}</td>
                      <td style={styles.td}>
                        {p.county ? (
                          <span style={{...styles.countyBadge,
                            background:(COUNTY_COLORS[p.county]||'#888')+'20',
                            color:COUNTY_COLORS[p.county]||'#888'}}>
                            {p.county}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={styles.td}>{p.mentor_name||'—'}</td>
                      <td style={styles.td}>
                        <ToggleBtn person={p} field="safeguarding_done"
                          yesLabel="✅ Done" noLabel="❌ Not done" />
                      </td>
                      <td style={styles.td}>
                        <ToggleBtn person={p} field="training_completed"
                          yesLabel="✅ Done" noLabel="⏳ Pending"
                          noColor="#a0720a" noBg="#fef9e7" />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{padding:'40px', textAlign:'center', color:'#888'}}>
                      No records match your filters.
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
  cards: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'16px' },
  card: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', margin:'0 0 4px 0' },
  cardSub: { fontSize:'11px', color:'#8a96a3', margin:0 },

  roleCards: { display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:'8px', marginBottom:'20px' },
  roleCard: { background:'#fff', borderRadius:'8px', padding:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  roleCardValue: { fontSize:'22px', fontWeight:'700', margin:'0 0 2px 0' },
  roleCardLabel: { fontSize:'10px', color:'#8a96a3', margin:0, fontWeight:'500' },

  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'180px' },
  select: { padding:'8px 10px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'12px', color:'#333', background:'#fff', cursor:'pointer' },
  clearBtn: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555', whiteSpace:'nowrap' },

  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'800px' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'10px 16px', fontSize:'13px', color:'#4a5568' },
  roleBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
};