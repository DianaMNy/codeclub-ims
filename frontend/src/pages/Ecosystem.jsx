// src/pages/Ecosystem.jsx
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

const ROLE_LABELS = {
  'centre_manager': { label: '🏢 Centre Manager', color: '#8e44ad', bg: '#f5eef8' },
  'head_of_school': { label: '🏫 Head of School', color: '#2980b9', bg: '#e8f4fd' },
  'additional_teacher': { label: '👩‍🏫 Additional Teacher', color: '#1eb457', bg: '#eafaf1' },
  'ict_intern': { label: '💻 ICT Intern', color: '#F7941D', bg: '#fdecd5' },
  'cde': { label: '🏛️ CDE', color: '#e74c3c', bg: '#fdedec' },
  'sub_county_director': { label: '📋 Sub-County Director', color: '#1abc9c', bg: '#e8f8f5' },
};

export default function Ecosystem() {
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/ecosystem')
      .then(res => setBuilders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = builders.filter(b => {
    if (filterRole && b.role !== filterRole) return false;
    if (filterCounty && b.county !== filterCounty) return false;
    if (filterTraining === 'yes' && !b.training_completed) return false;
    if (filterTraining === 'no' && b.training_completed) return false;
    if (search && !b.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !b.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const centreManagers = builders.filter(b => b.role === 'centre_manager').length;
  const headsOfSchool = builders.filter(b => b.role === 'head_of_school').length;
  const trained = builders.filter(b => b.training_completed).length;
  const safeguarded = builders.filter(b => b.safeguarding_done).length;
  const surveyed = builders.filter(b => b.survey_done).length;

  const exportCSV = () => {
    const headers = ['Name','Role','School/Centre','County','Training','Safeguarding','Survey'];
    const rows = filtered.map(b => [
      b.full_name, b.role, b.school_name || '',
      b.county || '',
      b.training_completed ? 'Yes' : 'No',
      b.safeguarding_done ? 'Yes' : 'No',
      b.survey_done ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'ecosystem_export.csv'; a.click();
  };

  return (
    <Layout title="Ecosystem Building" subtitle="Managers · Educators · Partners · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL ECOSYSTEM BUILDERS', value: builders.length, sub:'across all categories', color:'#69A9C9' },
          { label:'CENTER MANAGERS', value: centreManagers, sub:'community code clubs', color:'#8e44ad' },
          { label:'HEADS OF SCHOOL', value: headsOfSchool, sub:'school clubs', color:'#2980b9' },
          { label:'TRAINING COMPLETED', value: trained, sub:`of ${builders.length} enrolled`, color:'#1eb457' },
          { label:'SAFEGUARDING DONE', value: safeguarded, sub:`of ${builders.length} enrolled`, color:'#F7941D' },
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
            placeholder="🔍 Search name or school..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={styles.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="centre_manager">Centre Manager</option>
            <option value="head_of_school">Head of School</option>
            <option value="additional_teacher">Additional Teacher</option>
            <option value="ict_intern">ICT Intern</option>
            <option value="cde">CDE</option>
            <option value="sub_county_director">Sub-County Director</option>
          </select>
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
          {(filterRole || filterCounty || filterTraining || search) && (
            <button style={styles.clearBtn} onClick={() => {
              setFilterRole(''); setFilterCounty('');
              setFilterTraining(''); setSearch('');
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
          <p style={styles.tableTitle}>Ecosystem builders directory — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} people · centre managers · heads of school · live database</p>
        </div>

        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>NAME</th>
                <th style={styles.th}>ROLE</th>
                <th style={styles.th}>SCHOOL / CENTRE</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>TRAINING</th>
                <th style={styles.th}>SAFEGUARDING</th>
                <th style={styles.th}>SURVEY</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((builder, i) => {
                const roleInfo = ROLE_LABELS[builder.role] || { label: builder.role, color: '#888', bg: '#f0f0f0' };
                return (
                  <tr key={builder.id} style={{
                    background: i % 2 === 0 ? '#fff' : '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>
                      {builder.full_name}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.roleBadge,
                        background: roleInfo.bg,
                        color: roleInfo.color,
                      }}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={styles.td}>{builder.school_name || '—'}</td>
                    <td style={styles.td}>
                      {builder.county && (
                        <span style={{
                          ...styles.countyBadge,
                          background: (COUNTY_COLORS[builder.county] || '#888') + '20',
                          color: COUNTY_COLORS[builder.county] || '#888',
                        }}>
                          {builder.county}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.checkBadge,
                        background: builder.training_completed ? '#eafaf1' : '#fef9e7',
                        color: builder.training_completed ? '#1a8a4a' : '#a0720a',
                      }}>
                        {builder.training_completed ? '✅ Done' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.checkBadge,
                        background: builder.safeguarding_done ? '#eafaf1' : '#fdedec',
                        color: builder.safeguarding_done ? '#1a8a4a' : '#e74c3c',
                      }}>
                        {builder.safeguarding_done ? '✅ Done' : '❌ Not done'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.checkBadge,
                        background: builder.survey_done ? '#eafaf1' : '#fef9e7',
                        color: builder.survey_done ? '#1a8a4a' : '#a0720a',
                      }}>
                        {builder.survey_done ? '✅ Done' : '⏳ Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
  roleBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  checkBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
};
