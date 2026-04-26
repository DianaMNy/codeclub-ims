// src/pages/Reports.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import {
  exportProgrammeSummaryPDF,
  exportCountyPDF,
  exportMentorActivityPDF,
  exportSchoolProgressPDF,
  exportSafeguardingPDF,
} from '../utils/generatePDF';

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

const REPORTS = [
  { key: 'summary', label: '📊 Programme Summary', desc: 'Overall RPF 2026 health snapshot' },
  { key: 'county', label: '🗺️ County Breakdown', desc: 'Schools, learners and clubs by county' },
  { key: 'mentor-activity', label: '👤 Mentor Activity', desc: 'Mentor performance and school coverage' },
  { key: 'school-progress', label: '🏫 School Progress', desc: 'Per-school status, observations and flags' },
  { key: 'safeguarding', label: '🛡️ Safeguarding Compliance', desc: 'Training and safeguarding completion rates' },
];

function ProgressBar({ value, max, color }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '999px', height: '8px' }}>
        <div style={{ width: `${pct}%`, background: color, height: '8px', borderRadius: '999px' }} />
      </div>
      <span style={{ fontSize: '12px', color: '#555', minWidth: '45px', textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState('summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');
  const [filterCounty, setFilterCounty] = useState('');

  const loadReport = async (key) => {
    setLoading(true);
    setData(null);
    try {
      const res = await api.get(`/reports/${key}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const handleExportPDF = () => {
    if (!data) return;
    const dateRange = `${dateFrom} to ${dateTo}`;
    if (activeReport === 'summary') exportProgrammeSummaryPDF(data, dateRange);
    else if (activeReport === 'county') exportCountyPDF(data, dateRange);
    else if (activeReport === 'mentor-activity') exportMentorActivityPDF(data, dateRange);
    else if (activeReport === 'school-progress') exportSchoolProgressPDF(data, dateRange, filterCounty);
    else if (activeReport === 'safeguarding') exportSafeguardingPDF(data, dateRange);
  };

  const exportCSV = () => {
    if (!data) return;
    let rows = [];
    let headers = [];

    if (activeReport === 'summary') {
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Schools', data.schools.total],
        ['Active Clubs', data.schools.active],
        ['Community Centres', data.schools.centres],
        ['Total Learners', data.schools.learners],
        ['Total Mentors', data.mentors.total],
        ['Active Mentors', data.mentors.active],
        ['Total Teachers', data.teachers.total],
        ['Training Completed', data.teachers.trained],
        ['Safeguarding Done', data.teachers.safeguarded],
        ['Session Observations', data.observations.total],
        ['Open Flags', data.flags.open],
      ];
    } else if (Array.isArray(data)) {
      headers = Object.keys(data[0] || {});
      rows = data.map(row => headers.map(h => row[h] ?? ''));
    }

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}_report.csv`;
    a.click();
  };

  return (
    <Layout title="Reports" subtitle="Programme insights · Exportable · RPF 2026">

      {/* Report Selector */}
      <div style={styles.reportGrid}>
        {REPORTS.map(r => (
          <div key={r.key}
            style={{...styles.reportCard,
              border: activeReport === r.key ? '2px solid #69A9C9' : '2px solid #e2e8f0',
              background: activeReport === r.key ? '#f0f7ff' : '#fff',
              cursor: 'pointer'}}
            onClick={() => setActiveReport(r.key)}>
            <p style={styles.reportLabel}>{r.label}</p>
            <p style={styles.reportDesc}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div>
            <p style={styles.sectionTitle}>{REPORTS.find(r => r.key === activeReport)?.label}</p>
            <p style={styles.sectionSub}>RPF 2026 · EmpServe Kenya · Live data</p>
          </div>
          <div style={{display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap'}}>
            <input type="date" style={styles.dateInput} value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} />
            <span style={{color:'#888', fontSize:'13px'}}>to</span>
            <input type="date" style={styles.dateInput} value={dateTo}
              onChange={e => setDateTo(e.target.value)} />
            {activeReport === 'school-progress' && (
              <select style={styles.dateInput} value={filterCounty}
                onChange={e => setFilterCounty(e.target.value)}>
                <option value="">All Counties</option>
                <option value="Kiambu">Kiambu</option>
                <option value="Kajiado">Kajiado</option>
                <option value="Murang'a">Murang'a</option>
              </select>
            )}
            <button style={styles.exportBtn} onClick={exportCSV}>↓ CSV</button>
            <button style={styles.pdfBtn} onClick={handleExportPDF}>↓ PDF Report</button>
          </div>
        </div>

        {loading ? (
          <p style={{color:'#888', padding:'40px', textAlign:'center'}}>Loading report...</p>
        ) : !data || (activeReport === 'summary' && !data.schools) ? (
          <p style={{color:'#888', padding:'40px', textAlign:'center'}}>Loading report data...</p>
        ) : (
          <>
            {/* PROGRAMME SUMMARY */}
            {activeReport === 'summary' && (
              <div>
                <div style={styles.summaryGrid}>
                  {[
                    { label:'Total Schools', value: data.schools.total, sub:'enrolled', color:'#69A9C9' },
                    { label:'Active Clubs', value: data.schools.active, sub:'running sessions', color:'#1eb457' },
                    { label:'Community Centres', value: data.schools.centres, sub:'across 3 counties', color:'#F7941D' },
                    { label:'Total Learners', value: parseInt(data.schools.learners||0).toLocaleString(), sub:'registered', color:'#9b59b6' },
                    { label:'Active Mentors', value: data.mentors.active, sub:`of ${data.mentors.total} total`, color:'#1abc9c' },
                    { label:'Open Flags', value: data.flags.open, sub:'need attention', color:'#e74c3c' },
                  ].map(card => (
                    <div key={card.label} style={{...styles.summaryCard, borderTop:`4px solid ${card.color}`}}>
                      <p style={styles.cardLabel}>{card.label}</p>
                      <p style={{...styles.cardValue, color: card.color}}>{card.value}</p>
                      <p style={styles.cardSub}>{card.sub}</p>
                    </div>
                  ))}
                </div>
                <div style={styles.healthGrid}>
                  <div style={styles.healthCard}>
                    <p style={styles.healthTitle}>Programme Health</p>
                    {[
                      { label:'Active code clubs', value: parseInt(data.schools.active), max: parseInt(data.schools.total) - parseInt(data.schools.centres), color:'#1eb457' },
                      { label:'Training completed', value: parseInt(data.teachers.trained), max: parseInt(data.teachers.total), color:'#69A9C9' },
                      { label:'Safeguarding done', value: parseInt(data.teachers.safeguarded), max: parseInt(data.teachers.total), color:'#F7941D' },
                      { label:'Pathway progress', value: parseInt(data.pathways.completed), max: Math.max(parseInt(data.pathways.total), 1), color:'#9b59b6' },
                    ].map(item => (
                      <div key={item.label} style={{marginBottom:'16px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                          <span style={{fontSize:'13px', color:'#555'}}>{item.label}</span>
                          <span style={{fontSize:'13px', color:'#333', fontWeight:'600'}}>{item.value}/{item.max}</span>
                        </div>
                        <ProgressBar value={item.value} max={item.max} color={item.color} />
                      </div>
                    ))}
                  </div>
                  <div style={styles.healthCard}>
                    <p style={styles.healthTitle}>Key Metrics</p>
                    {[
                      { label:'Session Observations', value: data.observations.total, icon:'👁️' },
                      { label:'Total Flags Raised', value: data.flags.total, icon:'🚩' },
                      { label:'Open Flags', value: data.flags.open, icon:'🔴' },
                      { label:'Pathways Started', value: data.pathways.total, icon:'🗺️' },
                      { label:'Pathways Completed', value: data.pathways.completed, icon:'✅' },
                    ].map(item => (
                      <div key={item.label} style={styles.metricRow}>
                        <span style={{fontSize:'20px'}}>{item.icon}</span>
                        <span style={{fontSize:'13px', color:'#555', flex:1}}>{item.label}</span>
                        <span style={{fontSize:'18px', fontWeight:'700', color:'#1a2332'}}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COUNTY BREAKDOWN */}
            {activeReport === 'county' && Array.isArray(data) && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px'}}>
                {data.filter(d => ['Kiambu','Kajiado',"Murang'a"].includes(d.county)).map(county => (
                  <div key={county.county} style={{...styles.countyCard, borderTop:`4px solid ${COUNTY_COLORS[county.county]||'#888'}`}}>
                    <p style={{...styles.countyName, color: COUNTY_COLORS[county.county]}}>{county.county}</p>
                    <div style={styles.countyStats}>
                      {[
                        { label:'Schools', value: county.total_schools },
                        { label:'Active', value: county.active_clubs },
                        { label:'Learners', value: parseInt(county.total_learners||0).toLocaleString() },
                        { label:'Centres', value: county.centres },
                      ].map(stat => (
                        <div key={stat.label} style={styles.countyStat}>
                          <p style={styles.countyStatValue}>{stat.value}</p>
                          <p style={styles.countyStatLabel}>{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    <ProgressBar value={parseInt(county.active_clubs)} max={parseInt(county.total_schools)} color={COUNTY_COLORS[county.county]||'#888'} />
                  </div>
                ))}
              </div>
            )}

            {/* MENTOR ACTIVITY */}
            {activeReport === 'mentor-activity' && Array.isArray(data) && (
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>MENTOR</th>
                  <th style={styles.th}>AREA</th>
                  <th style={styles.th}>SCHOOLS</th>
                  <th style={styles.th}>ACTIVE</th>
                  <th style={styles.th}>OBSERVATIONS</th>
                  <th style={styles.th}>FLAGS</th>
                  <th style={styles.th}>LEARNERS</th>
                  <th style={styles.th}>STATUS</th>
                </tr></thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{row.mentor_name}</td>
                      <td style={styles.td}>{row.subcounty_area || '—'}</td>
                      <td style={styles.td}>{row.schools_assigned}</td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>{row.active_schools}</span></td>
                      <td style={styles.td}>{row.observations_made}</td>
                      <td style={styles.td}>{row.flags_raised}</td>
                      <td style={styles.td}>{parseInt(row.total_learners||0).toLocaleString()}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background: row.status==='active'?'#eafaf1':'#fff3e0', color: row.status==='active'?'#1a8a4a':'#F7941D'}}>● {row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* SCHOOL PROGRESS */}
            {activeReport === 'school-progress' && Array.isArray(data) && (
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>SCHOOL</th>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>STATUS</th>
                  <th style={styles.th}>LEARNERS</th>
                  <th style={styles.th}>OBSERVATIONS</th>
                  <th style={styles.th}>PATHWAYS</th>
                  <th style={styles.th}>FLAGS</th>
                  <th style={styles.th}>MENTOR</th>
                </tr></thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={{...styles.td, fontFamily:'monospace', color:'#8a96a3'}}>{row.club_id||'—'}</td>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{row.official_name}</td>
                      <td style={styles.td}><span style={{...styles.badge, background:(COUNTY_COLORS[row.county]||'#888')+'20', color:COUNTY_COLORS[row.county]||'#888'}}>{row.county}</span></td>
                      <td style={styles.td}><span style={{...styles.badge, background:row.status==='active'?'#eafaf1':'#fff3e0', color:row.status==='active'?'#1a8a4a':'#F7941D'}}>● {row.status}</span></td>
                      <td style={styles.td}>{row.learner_count||0}</td>
                      <td style={styles.td}>{row.observations||0}</td>
                      <td style={styles.td}>{row.pathways_started||0}</td>
                      <td style={styles.td}>{parseInt(row.open_flags)>0 ? <span style={{...styles.badge, background:'#fdedec', color:'#e74c3c'}}>🚩 {row.open_flags}</span> : <span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>✅ 0</span>}</td>
                      <td style={styles.td}>{row.mentor_name||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* SAFEGUARDING */}
            {activeReport === 'safeguarding' && Array.isArray(data) && (
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>TOTAL TEACHERS</th>
                  <th style={styles.th}>SAFEGUARDING DONE</th>
                  <th style={styles.th}>TRAINING DONE</th>
                  <th style={styles.th}>SAFEGUARDING %</th>
                  <th style={styles.th}>PROGRESS</th>
                </tr></thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={styles.td}><span style={{...styles.badge, background:(COUNTY_COLORS[row.county]||'#888')+'20', color:COUNTY_COLORS[row.county]||'#888'}}>{row.county||'Unknown'}</span></td>
                      <td style={styles.td}>{row.total_teachers}</td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>✅ {row.safeguarding_done}</span></td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#e8f4fd', color:'#2980b9'}}>📚 {row.training_done}</span></td>
                      <td style={{...styles.td, fontWeight:'700', color:parseFloat(row.safeguarding_pct)>=75?'#1a8a4a':'#e74c3c'}}>{row.safeguarding_pct}%</td>
                      <td style={{...styles.td, minWidth:'150px'}}><ProgressBar value={parseInt(row.safeguarding_done)} max={parseInt(row.total_teachers)} color={parseFloat(row.safeguarding_pct)>=75?'#1eb457':'#F7941D'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  reportGrid: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'20px' },
  reportCard: { borderRadius:'10px', padding:'16px', transition:'all 0.15s' },
  reportLabel: { fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  reportDesc: { fontSize:'11px', color:'#8a96a3', margin:0 },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'12px' },
  sectionTitle: { fontSize:'16px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  exportBtn: { padding:'8px 18px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555', fontWeight:'500' },
  pdfBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#e74c3c', color:'#fff', fontSize:'13px', cursor:'pointer', fontWeight:'600' },
  dateInput: { padding:'7px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  summaryGrid: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'20px' },
  summaryCard: { background:'#f8f9fa', borderRadius:'10px', padding:'16px' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', margin:'0 0 2px 0' },
  cardSub: { fontSize:'11px', color:'#8a96a3', margin:0 },
  healthGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' },
  healthCard: { background:'#f8f9fa', borderRadius:'10px', padding:'20px' },
  healthTitle: { fontSize:'14px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px 0' },
  metricRow: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' },
  countyCard: { background:'#f8f9fa', borderRadius:'10px', padding:'20px' },
  countyName: { fontSize:'18px', fontWeight:'700', margin:'0 0 16px 0' },
  countyStats: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'16px' },
  countyStat: { textAlign:'center' },
  countyStatValue: { fontSize:'20px', fontWeight:'700', color:'#1a2332', margin:'0 0 2px 0' },
  countyStatLabel: { fontSize:'11px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
};
