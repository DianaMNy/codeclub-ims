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

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9',
  'Kajiado': '#F7941D',
  "Murang'a": '#1eb457',
};

export default function Safeguarding() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/safeguarding')
      .then(res => setPeople(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = people.filter(p => {
    if (filterCounty && p.county !== filterCounty) return false;
    if (filterStatus === 'done' && !p.safeguarding_done) return false;
    if (filterStatus === 'pending' && p.safeguarding_done) return false;
    if (filterType && p.person_type !== filterType) return false;
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !p.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const done = people.filter(p => p.safeguarding_done).length;
  const pending = people.filter(p => !p.safeguarding_done).length;
  const teachers = people.filter(p => p.person_type === 'teacher').length;
  const managers = people.filter(p => p.person_type === 'ecosystem').length;
  const pct = people.length ? Math.round((done / people.length) * 100) : 0;

  const exportCSV = () => {
    const headers = ['Name','Type','School','County','Safeguarding','Training'];
    const rows = filtered.map(p => [
      p.full_name, p.person_type, p.school_name || '',
      p.county || '',
      p.safeguarding_done ? 'Done' : 'Pending',
      p.training_completed ? 'Done' : 'Pending',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'safeguarding_export.csv'; a.click();
  };

  return (
    <Layout title="Safeguarding" subtitle="Module completion · Club leaders · Centre managers · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        <div style={{...styles.card, borderTop:'4px solid #1eb457'}}>
          <p style={styles.cardLabel}>SAFEGUARDING DONE</p>
          <p style={styles.cardValue}>{done}</p>
          <p style={{...styles.cardSub, color:'#1eb457'}}>completed module</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #e74c3c'}}>
          <p style={styles.cardLabel}>PENDING</p>
          <p style={styles.cardValue}>{pending}</p>
          <p style={{...styles.cardSub, color:'#e74c3c'}}>not yet done</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #69A9C9'}}>
          <p style={styles.cardLabel}>COMPLETION RATE</p>
          <p style={styles.cardValue}>{pct}%</p>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width:`${pct}%`, background:'#1eb457'}} />
          </div>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #9b59b6'}}>
          <p style={styles.cardLabel}>CLUB LEADERS</p>
          <p style={styles.cardValue}>{teachers}</p>
          <p style={{...styles.cardSub, color:'#9b59b6'}}>teachers tracked</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #F7941D'}}>
          <p style={styles.cardLabel}>CENTRE MANAGERS</p>
          <p style={styles.cardValue}>{managers}</p>
          <p style={{...styles.cardSub, color:'#F7941D'}}>community clubs</p>
        </div>
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
          <select style={styles.select} value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            <option value="Kiambu">Kiambu</option>
            <option value="Kajiado">Kajiado</option>
            <option value="Murang'a">Murang'a</option>
          </select>
          <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="done">✅ Done</option>
            <option value="pending">❌ Pending</option>
          </select>
          <select style={styles.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="teacher">Club Leaders</option>
            <option value="ecosystem">Centre Managers</option>
          </select>
          {(filterCounty || filterStatus || filterType || search) && (
            <button style={styles.clearBtn} onClick={() => {
              setFilterCounty(''); setFilterStatus('');
              setFilterType(''); setSearch('');
            }}>✕ Clear</button>
          )}
        </div>
        <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>Safeguarding module tracker — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} people · club leaders + centre managers · live database</p>
        </div>

        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>NAME</th>
                <th style={styles.th}>TYPE</th>
                <th style={styles.th}>SCHOOL / CENTRE</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>MENTOR</th>
                <th style={styles.th}>SAFEGUARDING MODULE</th>
                <th style={styles.th}>TRAINING</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((person, i) => (
                <tr key={`${person.id}-${person.person_type}`} style={{
                  background: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>
                    {person.full_name}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.typeBadge,
                      background: person.person_type === 'teacher' ? '#e8f4fd' : '#f5eef8',
                      color: person.person_type === 'teacher' ? '#2980b9' : '#8e44ad',
                    }}>
                      {person.person_type === 'teacher' ? '⭐ Club Leader' : '🏢 Centre Manager'}
                    </span>
                  </td>
                  <td style={styles.td}>{person.school_name || '—'}</td>
                  <td style={styles.td}>
                    {person.county && (
                      <span style={{
                        ...styles.countyBadge,
                        background: (COUNTY_COLORS[person.county] || '#888') + '20',
                        color: COUNTY_COLORS[person.county] || '#888',
                      }}>
                        {person.county}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{person.mentor_name || '—'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: person.safeguarding_done ? '#eafaf1' : '#fdedec',
                      color: person.safeguarding_done ? '#1a8a4a' : '#e74c3c',
                    }}>
                      {person.safeguarding_done ? '✅ Completed' : '❌ Not done'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: person.training_completed ? '#eafaf1' : '#fef9e7',
                      color: person.training_completed ? '#1a8a4a' : '#a0720a',
                    }}>
                      {person.training_completed ? '✅ Done' : '⏳ Pending'}
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
  progressBar: { height:'6px', background:'#f0f0f0', borderRadius:'999px', marginTop:'8px', overflow:'hidden' },
  progressFill: { height:'6px', borderRadius:'999px', transition:'width 0.6s' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'220px' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  typeBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  statusBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
};
