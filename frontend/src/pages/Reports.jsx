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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const COUNTY_COLORS = { 'Kiambu':'#69A9C9', 'Kajiado':'#F7941D', "Murang'a":'#1eb457' };
const BRAND = { green:'#1eb457', blue:'#69A9C9', orange:'#F7941D', purple:'#9b59b6', red:'#e74c3c', teal:'#1abc9c' };

const REPORTS = [
  { key:'summary',         label:'📊 Programme Summary',      desc:'Overall RPF 2026 health snapshot' },
  { key:'county',          label:'🗺️ County Breakdown',        desc:'Schools, learners and clubs by county' },
  { key:'mentor-activity', label:'👤 Mentor Activity',         desc:'Mentor performance and school coverage' },
  { key:'school-progress', label:'🏫 School Progress',         desc:'Per-school status, observations and flags' },
  { key:'safeguarding',    label:'🛡️ Safeguarding Compliance', desc:'Training and safeguarding completion rates' },
];

function ProgressBar({ value, max, color }) {
  const pct = max ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
      <div style={{ flex:1, background:'#f0f0f0', borderRadius:'999px', height:'8px' }}>
        <div style={{ width:`${pct}%`, background:color, height:'8px', borderRadius:'999px', transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:'12px', color:'#555', minWidth:'45px', textAlign:'right' }}>{pct}%</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px 14px', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ margin:'0 0 4px', fontSize:'12px', fontWeight:'700', color:'#1a2332' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin:0, fontSize:'12px', color:p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Reports() {
  const [activeReport, setActiveReport] = useState('summary');
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [dateFrom, setDateFrom]         = useState('2025-01-01');
  const [dateTo, setDateTo]             = useState('2026-12-31');
  const [filterCounty, setFilterCounty] = useState('');

  const loadReport = async (key) => {
    setLoading(true); setData(null);
    try { const res = await api.get(`/reports/${key}`); setData(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReport(activeReport); }, [activeReport]);

  const handleExportPDF = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      const dr = `${dateFrom} to ${dateTo}`;
      if (activeReport==='summary')          await exportProgrammeSummaryPDF(data, dr);
      else if (activeReport==='county')      await exportCountyPDF(data, dr);
      else if (activeReport==='mentor-activity') await exportMentorActivityPDF(data, dr);
      else if (activeReport==='school-progress') await exportSchoolProgressPDF(data, dr, filterCounty);
      else if (activeReport==='safeguarding')    await exportSafeguardingPDF(data, dr);
    } finally { setExporting(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    let rows = [], headers = [];
    if (activeReport==='summary') {
      headers = ['Metric','Value'];
      rows = [
        ['Total Schools',data.schools.total],['Active Clubs',data.schools.active],
        ['Community Centres',data.schools.centres],['Total Learners',data.schools.learners],
        ['Total Mentors',data.mentors.total],['Active Mentors',data.mentors.active],
        ['Total Teachers',data.teachers.total],['Training Completed',data.teachers.trained],
        ['Safeguarding Done',data.teachers.safeguarded],['Session Observations',data.observations.total],
        ['Open Flags',data.flags.open],
      ];
    } else if (Array.isArray(data)) {
      headers = Object.keys(data[0]||{});
      rows = data.map(row => headers.map(h => row[h]??''));
    }
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${activeReport}_report.csv`; a.click();
  };

  // Chart data
  const summaryPieData = data?.schools ? [
    { name:'Active Clubs', value:parseInt(data.schools.active),   fill:BRAND.green },
    { name:'Not Started',  value:parseInt(data.schools.total)-parseInt(data.schools.active)-parseInt(data.schools.centres), fill:BRAND.orange },
    { name:'Centres',      value:parseInt(data.schools.centres),  fill:BRAND.blue },
  ] : [];

  const healthBarData = data?.teachers ? [
    { name:'Training',      done:parseInt(data.teachers.trained),      total:parseInt(data.teachers.total) },
    { name:'Safeguarding',  done:parseInt(data.teachers.safeguarded),   total:parseInt(data.teachers.total) },
    { name:'Active Clubs',  done:parseInt(data.schools?.active||0),    total:parseInt(data.schools?.total||0)-parseInt(data.schools?.centres||0) },
    { name:'Pathways Done', done:parseInt(data.pathways?.completed||0), total:parseInt(data.pathways?.total||0) },
  ] : [];

  return (
    <Layout title="Reports" subtitle="Programme insights · Exportable · RPF 2026">

      {/* Report Selector */}
      <div style={styles.reportGrid}>
        {REPORTS.map(r => (
          <div key={r.key}
            style={{...styles.reportCard, border:activeReport===r.key?'2px solid #69A9C9':'2px solid #e2e8f0', background:activeReport===r.key?'#f0f7ff':'#fff', cursor:'pointer'}}
            onClick={() => setActiveReport(r.key)}>
            <p style={styles.reportLabel}>{r.label}</p>
            <p style={styles.reportDesc}>{r.desc}</p>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        {/* Header */}
        <div style={styles.sectionHead}>
          <div>
            <p style={styles.sectionTitle}>{REPORTS.find(r=>r.key===activeReport)?.label}</p>
            <p style={styles.sectionSub}>RPF 2026 · EmpServe Kenya · Live data</p>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
            <input type="date" style={styles.dateInput} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
            <span style={{color:'#888',fontSize:'13px'}}>to</span>
            <input type="date" style={styles.dateInput} value={dateTo} onChange={e=>setDateTo(e.target.value)} />
            {activeReport==='school-progress' && (
              <select style={styles.dateInput} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
                <option value="">All Counties</option>
                <option value="Kiambu">Kiambu</option>
                <option value="Kajiado">Kajiado</option>
                <option value="Murang'a">Murang'a</option>
              </select>
            )}
            <button style={styles.exportBtn} onClick={exportCSV}>↓ CSV</button>
            <button style={{...styles.pdfBtn, opacity:exporting?0.7:1}} onClick={handleExportPDF} disabled={exporting}>
              {exporting ? '⏳ Generating...' : '↓ PDF Report'}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{color:'#888',padding:'40px',textAlign:'center'}}>Loading report...</p>
        ) : !data ? (
          <p style={{color:'#888',padding:'40px',textAlign:'center'}}>Loading report data...</p>
        ) : (
          <>
            {/* ── PROGRAMME SUMMARY ─────────────────────────────────────── */}
            {activeReport==='summary' && data.schools && (
              <div>
                <div style={styles.summaryGrid}>
                  {[
                    { label:'Total Schools',  value:data.schools.total,                                  sub:'enrolled',         color:BRAND.blue },
                    { label:'Active Clubs',   value:data.schools.active,                                 sub:'running sessions', color:BRAND.green },
                    { label:'Comm. Centres',  value:data.schools.centres,                                sub:'across 3 counties',color:BRAND.orange },
                    { label:'Total Learners', value:parseInt(data.schools.learners||0).toLocaleString(), sub:'registered',       color:BRAND.purple },
                    { label:'Active Mentors', value:data.mentors.active,                                 sub:`of ${data.mentors.total} total`, color:BRAND.teal },
                    { label:'Open Flags',     value:data.flags.open,                                     sub:'need attention',   color:BRAND.red },
                  ].map(c => (
                    <div key={c.label} style={{...styles.summaryCard, borderTop:`4px solid ${c.color}`}}>
                      <p style={styles.cardLabel}>{c.label}</p>
                      <p style={{...styles.cardValue, color:c.color}}>{c.value}</p>
                      <p style={styles.cardSub}>{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Chart container with id for PDF capture */}
                <div id="pdf-chart-summary" style={styles.chartRow}>
                  <div style={styles.chartBox}>
                    <p style={styles.chartTitle}>Club Status Breakdown</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={summaryPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {summaryPieData.map((e,i)=><Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={styles.chartBox}>
                    <p style={styles.chartTitle}>Programme Health — Done vs Total</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={healthBarData} margin={{top:5,right:20,left:0,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{fontSize:11}} />
                        <YAxis tick={{fontSize:11}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="done"  name="Done"  fill={BRAND.green} radius={[4,4,0,0]} />
                        <Bar dataKey="total" name="Total" fill="#e2e8f0"     radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={styles.chartBox}>
                    <p style={styles.chartTitle}>Key Metrics</p>
                    {[
                      { label:'Session Observations', value:data.observations.total, icon:'👁️', color:BRAND.blue },
                      { label:'Total Flags Raised',   value:data.flags.total,        icon:'🚩', color:BRAND.red },
                      { label:'Open Flags',           value:data.flags.open,         icon:'🔴', color:BRAND.red },
                      { label:'Pathways Started',     value:data.pathways.total,     icon:'🗺️', color:BRAND.orange },
                      { label:'Pathways Completed',   value:data.pathways.completed, icon:'✅', color:BRAND.green },
                    ].map(m=>(
                      <div key={m.label} style={styles.metricRow}>
                        <span style={{fontSize:'18px'}}>{m.icon}</span>
                        <span style={{fontSize:'13px',color:'#555',flex:1}}>{m.label}</span>
                        <span style={{fontSize:'20px',fontWeight:'700',color:m.color}}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{...styles.chartBox, marginTop:'16px'}}>
                  <p style={styles.chartTitle}>Programme Health</p>
                  {[
                    { label:'Active code clubs',  value:parseInt(data.schools.active),       max:parseInt(data.schools.total)-parseInt(data.schools.centres), color:BRAND.green },
                    { label:'Training completed', value:parseInt(data.teachers.trained),     max:parseInt(data.teachers.total),                               color:BRAND.blue },
                    { label:'Safeguarding done',  value:parseInt(data.teachers.safeguarded), max:parseInt(data.teachers.total),                               color:BRAND.orange },
                    { label:'Pathway progress',   value:parseInt(data.pathways.completed),   max:Math.max(parseInt(data.pathways.total),1),                    color:BRAND.purple },
                  ].map(item=>(
                    <div key={item.label} style={{marginBottom:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                        <span style={{fontSize:'13px',color:'#555'}}>{item.label}</span>
                        <span style={{fontSize:'13px',color:'#333',fontWeight:'600'}}>{item.value}/{item.max}</span>
                      </div>
                      <ProgressBar value={item.value} max={item.max} color={item.color} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COUNTY BREAKDOWN ──────────────────────────────────────── */}
            {activeReport==='county' && Array.isArray(data) && (
              <div>
                <div id="pdf-chart-county" style={styles.chartRow}>
                  <div style={{...styles.chartBox, flex:2}}>
                    <p style={styles.chartTitle}>Schools & Active Clubs by County</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.map(d=>({name:d.county,'Total Schools':parseInt(d.total_schools),'Active Clubs':parseInt(d.active_clubs),'Not Started':parseInt(d.not_started||0)}))} margin={{top:5,right:20,left:0,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{fontSize:12}} />
                        <YAxis tick={{fontSize:11}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Total Schools" fill={BRAND.blue}   radius={[4,4,0,0]} />
                        <Bar dataKey="Active Clubs"  fill={BRAND.green}  radius={[4,4,0,0]} />
                        <Bar dataKey="Not Started"   fill={BRAND.orange} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{...styles.chartBox, flex:1}}>
                    <p style={styles.chartTitle}>Learners by County</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={data.map(d=>({name:d.county,value:parseInt(d.total_learners||0)}))} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({name,value})=>`${name}: ${value.toLocaleString()}`} labelLine>
                          {data.map((d,i)=><Cell key={i} fill={COUNTY_COLORS[d.county]||'#888'} />)}
                        </Pie>
                        <Tooltip formatter={v=>v.toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginTop:'16px'}}>
                  {data.map(county=>(
                    <div key={county.county} style={{...styles.countyCard, borderTop:`4px solid ${COUNTY_COLORS[county.county]||'#888'}`}}>
                      <p style={{...styles.countyName, color:COUNTY_COLORS[county.county]}}>{county.county}</p>
                      <div style={styles.countyStats}>
                        {[{label:'Schools',value:county.total_schools},{label:'Active',value:county.active_clubs},{label:'Learners',value:parseInt(county.total_learners||0).toLocaleString()},{label:'Centres',value:county.centres}].map(s=>(
                          <div key={s.label} style={styles.countyStat}>
                            <p style={styles.countyStatValue}>{s.value}</p>
                            <p style={styles.countyStatLabel}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <ProgressBar value={parseInt(county.active_clubs)} max={parseInt(county.total_schools)} color={COUNTY_COLORS[county.county]||'#888'} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MENTOR ACTIVITY ───────────────────────────────────────── */}
            {activeReport==='mentor-activity' && Array.isArray(data) && (
              <div>
                <div id="pdf-chart-mentor" style={styles.chartRow}>
                  <div style={{...styles.chartBox,flex:2}}>
                    <p style={styles.chartTitle}>Schools Assigned — Top 10 Mentors</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart layout="vertical"
                        data={[...data].sort((a,b)=>b.schools_assigned-a.schools_assigned).slice(0,10).map(m=>({name:m.mentor_name.split(' ').slice(0,2).join(' '),Schools:parseInt(m.schools_assigned),Active:parseInt(m.active_schools)}))}
                        margin={{top:5,right:20,left:60,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{fontSize:10}} />
                        <YAxis dataKey="name" type="category" tick={{fontSize:10}} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Schools" fill={BRAND.blue}  radius={[0,4,4,0]} />
                        <Bar dataKey="Active"  fill={BRAND.green} radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{...styles.chartBox,flex:1}}>
                    <p style={styles.chartTitle}>Mentor Status</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={[{name:'Active',value:data.filter(m=>m.status==='active').length},{name:'Inactive',value:data.filter(m=>m.status!=='active').length}]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine>
                          <Cell fill={BRAND.green} /><Cell fill={BRAND.orange} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <p style={{textAlign:'center',fontSize:'12px',color:'#555',margin:'8px 0 0'}}>Total: <strong>{data.length}</strong> · <strong style={{color:BRAND.green}}>{data.filter(m=>m.status==='active').length}</strong> active</p>
                  </div>
                </div>
                <div style={{marginTop:'16px',overflowX:'auto'}}>
                  <table style={styles.table}>
                    <thead><tr style={styles.thead}>
                      <th style={styles.th}>MENTOR</th><th style={styles.th}>AREA</th>
                      <th style={styles.th}>SCHOOLS</th><th style={styles.th}>ACTIVE</th>
                      <th style={styles.th}>OBSERVATIONS</th><th style={styles.th}>FLAGS</th>
                      <th style={styles.th}>LEARNERS</th><th style={styles.th}>STATUS</th>
                    </tr></thead>
                    <tbody>
                      {data.map((row,i)=>(
                        <tr key={i} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                          <td style={{...styles.td,fontWeight:'500',color:'#1a2332'}}>{row.mentor_name}</td>
                          <td style={styles.td}>{row.subcounty_area||'N/A'}</td>
                          <td style={styles.td}>{row.schools_assigned}</td>
                          <td style={styles.td}><span style={{...styles.badge,background:'#eafaf1',color:'#1a8a4a'}}>{row.active_schools}</span></td>
                          <td style={styles.td}>{row.observations_made??'N/A'}</td>
                          <td style={styles.td}>{row.flags_raised??'N/A'}</td>
                          <td style={styles.td}>{parseInt(row.total_learners||0).toLocaleString()}</td>
                          <td style={styles.td}><span style={{...styles.badge,background:row.status==='active'?'#eafaf1':'#fff3e0',color:row.status==='active'?'#1a8a4a':BRAND.orange}}>● {row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SCHOOL PROGRESS ───────────────────────────────────────── */}
            {activeReport==='school-progress' && Array.isArray(data) && (() => {
              const filtered = filterCounty ? data.filter(s=>s.county===filterCounty) : data;
              const byCounty = ['Kiambu','Kajiado',"Murang'a"].map(c=>({
                name:c,
                Active:filtered.filter(s=>s.county===c&&s.status==='active').length,
                'Not Started':filtered.filter(s=>s.county===c&&s.status!=='active').length,
              }));
              const statusData = [
                {name:'Active',     value:filtered.filter(s=>s.status==='active').length,  fill:BRAND.green},
                {name:'Not Started',value:filtered.filter(s=>s.status!=='active').length,  fill:BRAND.orange},
              ];
              return (
                <div>
                  <div id="pdf-chart-school" style={styles.chartRow}>
                    <div style={{...styles.chartBox,flex:2}}>
                      <p style={styles.chartTitle}>Active vs Not Started by County</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={byCounty} margin={{top:5,right:20,left:0,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{fontSize:12}} />
                          <YAxis tick={{fontSize:11}} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="Active"      fill={BRAND.green}  radius={[4,4,0,0]} />
                          <Bar dataKey="Not Started" fill={BRAND.orange} radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{...styles.chartBox,flex:1}}>
                      <p style={styles.chartTitle}>Club Status</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine>
                            {statusData.map((e,i)=><Cell key={i} fill={e.fill} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div style={{marginTop:'16px',overflowX:'auto'}}>
                    <table style={styles.table}>
                      <thead><tr style={styles.thead}>
                        <th style={styles.th}>ID</th><th style={styles.th}>SCHOOL</th><th style={styles.th}>COUNTY</th>
                        <th style={styles.th}>STATUS</th><th style={styles.th}>LEARNERS</th>
                        <th style={styles.th}>OBSERVATIONS</th><th style={styles.th}>PATHWAYS</th>
                        <th style={styles.th}>FLAGS</th><th style={styles.th}>MENTOR</th>
                      </tr></thead>
                      <tbody>
                        {filtered.map((row,i)=>(
                          <tr key={i} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                            <td style={{...styles.td,fontFamily:'monospace',color:'#8a96a3'}}>{row.club_id||'N/A'}</td>
                            <td style={{...styles.td,fontWeight:'500',color:'#1a2332'}}>{row.official_name}</td>
                            <td style={styles.td}><span style={{...styles.badge,background:(COUNTY_COLORS[row.county]||'#888')+'20',color:COUNTY_COLORS[row.county]||'#888'}}>{row.county}</span></td>
                            <td style={styles.td}><span style={{...styles.badge,background:row.status==='active'?'#eafaf1':'#fff3e0',color:row.status==='active'?'#1a8a4a':BRAND.orange}}>● {row.status}</span></td>
                            <td style={styles.td}>{row.learner_count||0}</td>
                            <td style={styles.td}>{row.observations||0}</td>
                            <td style={styles.td}>{row.pathways_started||0}</td>
                            <td style={styles.td}>{parseInt(row.open_flags)>0?<span style={{...styles.badge,background:'#fdedec',color:BRAND.red}}>🚩 {row.open_flags}</span>:<span style={{...styles.badge,background:'#eafaf1',color:'#1a8a4a'}}>✅ 0</span>}</td>
                            <td style={styles.td}>{row.mentor_name||'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ── SAFEGUARDING ──────────────────────────────────────────── */}
            {activeReport==='safeguarding' && Array.isArray(data) && (
              <div>
                <div id="pdf-chart-safeguarding" style={styles.chartRow}>
                  <div style={{...styles.chartBox,flex:2}}>
                    <p style={styles.chartTitle}>Safeguarding & Training by County</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.map(d=>({name:d.county||'Unknown','Total Teachers':parseInt(d.total_teachers),'Safeguarding Done':parseInt(d.safeguarding_done),'Training Done':parseInt(d.training_done)}))} margin={{top:5,right:20,left:0,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{fontSize:12}} />
                        <YAxis tick={{fontSize:11}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="Total Teachers"    fill="#e2e8f0"    radius={[4,4,0,0]} />
                        <Bar dataKey="Safeguarding Done" fill={BRAND.green} radius={[4,4,0,0]} />
                        <Bar dataKey="Training Done"     fill={BRAND.blue}  radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{...styles.chartBox,flex:1}}>
                    <p style={styles.chartTitle}>Completion % by County</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
                        data={data.map((d,i)=>({name:d.county,value:parseFloat(d.safeguarding_pct||0),fill:Object.values(COUNTY_COLORS)[i]||'#888'}))}
                        startAngle={180} endAngle={0}>
                        <RadialBar minAngle={15} label={{position:'insideStart',fill:'#fff',fontSize:10}} background dataKey="value" />
                        <Tooltip formatter={v=>`${v}%`} />
                        <Legend />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{marginTop:'16px',overflowX:'auto'}}>
                  <table style={styles.table}>
                    <thead><tr style={styles.thead}>
                      <th style={styles.th}>COUNTY</th><th style={styles.th}>TOTAL TEACHERS</th>
                      <th style={styles.th}>SAFEGUARDING DONE</th><th style={styles.th}>TRAINING DONE</th>
                      <th style={styles.th}>SAFEGUARDING %</th><th style={styles.th}>PROGRESS</th>
                    </tr></thead>
                    <tbody>
                      {data.map((row,i)=>(
                        <tr key={i} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                          <td style={styles.td}><span style={{...styles.badge,background:(COUNTY_COLORS[row.county]||'#888')+'20',color:COUNTY_COLORS[row.county]||'#888'}}>{row.county||'Unknown'}</span></td>
                          <td style={styles.td}>{row.total_teachers}</td>
                          <td style={styles.td}><span style={{...styles.badge,background:'#eafaf1',color:'#1a8a4a'}}>✅ {row.safeguarding_done}</span></td>
                          <td style={styles.td}><span style={{...styles.badge,background:'#e8f4fd',color:'#2980b9'}}>📚 {row.training_done}</span></td>
                          <td style={{...styles.td,fontWeight:'700',color:parseFloat(row.safeguarding_pct)>=75?'#1a8a4a':BRAND.red}}>{row.safeguarding_pct??'N/A'}%</td>
                          <td style={{...styles.td,minWidth:'150px'}}><ProgressBar value={parseInt(row.safeguarding_done)} max={parseInt(row.total_teachers)} color={parseFloat(row.safeguarding_pct)>=75?BRAND.green:BRAND.orange} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
  chartRow: { display:'flex', gap:'16px', marginBottom:'16px', flexWrap:'wrap' },
  chartBox: { background:'#f8f9fa', borderRadius:'12px', padding:'16px 20px', flex:1, minWidth:'240px' },
  chartTitle: { fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 12px 0' },
  summaryGrid: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'20px' },
  summaryCard: { background:'#f8f9fa', borderRadius:'10px', padding:'16px' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', margin:'0 0 2px 0' },
  cardSub: { fontSize:'11px', color:'#8a96a3', margin:0 },
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