// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { getSchools, getMentors } from '../api/index';
import Layout from '../components/Layout';

const AVATAR_COLORS = ['#1eb457','#F7941D','#69A9C9','#9b59b6','#e74c3c','#1abc9c','#f39c12','#2980b9'];
function getInitials(name) { return name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase(); }
function getColor(name) { let s=0; for(let c of name) s+=c.charCodeAt(0); return AVATAR_COLORS[s%AVATAR_COLORS.length]; }

function ProgressBar({ value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
      <div style={{ flex:1, background:'#f0f0f0', borderRadius:'999px', height:'8px' }}>
        <div style={{ width:`${pct}%`, background:color, height:'8px', borderRadius:'999px', transition:'width 0.6s' }} />
      </div>
      <span style={{ fontSize:'13px', color:'#555', minWidth:'60px', textAlign:'right' }}>{value}/{max}</span>
    </div>
  );
}

function DonutChart({ active, notStarted }) {
  const total = active + notStarted;
  const pct = active / total;
  const r = 52, cx = 64, cy = 64;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth="16" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1eb457" strokeWidth="16"
        strokeDasharray={`${dash} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round" />
      <text x={cx} y={cy-6} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1a2e">{total}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize="11" fill="#888">clubs</text>
    </svg>
  );
}

export default function Dashboard() {
  const [schools, setSchools] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSchools(), getMentors()])
      .then(([s, m]) => { setSchools(s.data); setMentors(m.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Dashboard Overview" subtitle="Code Club M&E System · Kenya"><p style={{color:'#888'}}>Loading...</p></Layout>;

  const schoolsOnly = schools.filter(s => s.type === 'school');
  const centres = schools.filter(s => s.type === 'community_centre');
  const active = schools.filter(s => s.status === 'active').length;
  const notStarted = schools.filter(s => s.status === 'enrolled').length;
  const totalLearners = schools.reduce((sum, s) => sum + (s.learner_count || 0), 0);
  const activeMentors = mentors.filter(m => m.status === 'active').length;
  const onLeave = mentors.filter(m => m.status === 'on_leave').length;
  const avgSchools = mentors.length ? (mentors.reduce((s,m) => s + parseInt(m.schools_assigned||0), 0) / mentors.length).toFixed(1) : 0;
  const needsAttention = schools.filter(s => s.status === 'enrolled' && s.type === 'school');
  const topMentors = [...mentors].sort((a,b) => parseInt(b.schools_assigned||0) - parseInt(a.schools_assigned||0)).slice(0,5);
  const counties = ['Kiambu','Kajiado',"Murang'a"];
  const maxCount = Math.max(...counties.map(c => schoolsOnly.filter(s => s.county === c).length));

  return (
    <Layout title="Dashboard Overview" subtitle="Code Club M&E System · Kenya">

      {/* Tag pills */}
      <div style={styles.pills}>
        {['🟢 Live data · RPF 2026 Database','🟠 Cohort: Jan 2025 – Dec 2026','🔵 Kiambu · Kajiado · Murang\'a','🟣 EmpServe × Raspberry Pi Foundation'].map(p => (
          <span key={p} style={styles.pill}>{p}</span>
        ))}
      </div>

      {/* Top stat cards */}
      <div style={styles.cards}>
        {[
          { label:'CODE CLUBS REGISTERED', value: schoolsOnly.length, sub:`${active} active clubs`, color:'#69A9C9' },
          { label:'COMMUNITY CENTRES', value: centres.length, sub:'3 counties', color:'#F7941D' },
          { label:'LEARNERS REACHED', value: totalLearners.toLocaleString(), sub:'across all schools', color:'#1eb457' },
          { label:'ACTIVE MENTORS', value: activeMentors, sub:`${onLeave} on leave`, color:'#9b59b6' },
          { label:'COUNTY COVERAGE', value: 3, sub:"Kiambu · Kajiado · Murang'a", color:'#F5C518' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={styles.cardValue}>{card.value}</p>
            <p style={styles.cardSub}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div style={styles.row}>
        {/* County bars */}
        <div style={{...styles.section, flex:2}}>
          <p style={styles.sectionTitle}>Schools & clubs by county</p>
          <p style={styles.sectionSub}>Active clubs vs total enrolled</p>
          <div style={{marginTop:'16px', display:'flex', flexDirection:'column', gap:'20px'}}>
            {counties.map((county, i) => {
              const count = schoolsOnly.filter(s => s.county === county).length;
              const colors = ['#69A9C9','#F7941D','#1eb457'];
              const pct = maxCount ? Math.round((count/maxCount)*100) : 0;
              return (
                <div key={county}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                    <span style={{fontSize:'14px', fontWeight:'500', color:'#333'}}>{county}</span>
                    <span style={{fontSize:'13px', color:'#888'}}>{count} schools</span>
                  </div>
                  <div style={{background:'#f0f0f0', borderRadius:'999px', height:'32px', overflow:'hidden'}}>
                    <div style={{width:`${pct}%`, background:colors[i], height:'32px', borderRadius:'999px', display:'flex', alignItems:'center', paddingLeft:'12px', transition:'width 0.6s'}}>
                      <span style={{color:'#fff', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap'}}>{count} schools</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress metrics */}
          <div style={{marginTop:'28px', display:'flex', flexDirection:'column', gap:'14px'}}>
            {[
              { label:'Active code clubs', value:active, max:schoolsOnly.length, color:'#1eb457' },
              { label:'Safeguarding done', value:83, max:110, color:'#69A9C9' },
              { label:'Training completed', value:52, max:110, color:'#F7941D' },
            ].map(p => (
              <div key={p.label}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                  <span style={{fontSize:'13px', color:'#555'}}>{p.label}</span>
                </div>
                <ProgressBar value={p.value} max={p.max} color={p.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Club status donut */}
        <div style={{...styles.section, flex:1}}>
          <p style={styles.sectionTitle}>Club status</p>
          <div style={{display:'flex', justifyContent:'center', margin:'16px 0'}}>
            <DonutChart active={active} notStarted={notStarted} />
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#555'}}>
                <span style={{width:'10px', height:'10px', borderRadius:'50%', background:'#1eb457', display:'inline-block'}} />Active
              </span>
              <span style={{fontWeight:'700', color:'#1a1a2e'}}>{active}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#555'}}>
                <span style={{width:'10px', height:'10px', borderRadius:'50%', background:'#e74c3c', display:'inline-block'}} />Not started
              </span>
              <span style={{fontWeight:'700', color:'#1a1a2e'}}>{notStarted}</span>
            </div>
          </div>

          <div style={{marginTop:'24px', borderTop:'1px solid #f0f0f0', paddingTop:'16px'}}>
            <p style={{fontSize:'11px', fontWeight:'700', color:'#888', letterSpacing:'0.5px', margin:'0 0 12px 0'}}>MENTORS BY STATUS</p>
            {[
              { label:'Active mentors', value:activeMentors, color:'#1eb457' },
              { label:'On leave', value:onLeave, color:'#F7941D' },
              { label:'Avg schools per mentor', value:avgSchools, color:'#69A9C9' },
            ].map(m => (
              <div key={m.label} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                <span style={{fontSize:'13px', color:'#555'}}>{m.label}</span>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div style={{width:'60px', height:'4px', background:'#f0f0f0', borderRadius:'999px'}}>
                    <div style={{width:`${Math.min((m.value/20)*100,100)}%`, height:'4px', background:m.color, borderRadius:'999px'}} />
                  </div>
                  <span style={{fontSize:'13px', fontWeight:'700', color:'#1a1a2e', minWidth:'24px'}}>{m.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={styles.row}>
        {/* Schools needing attention */}
        <div style={{...styles.section, flex:1.2}}>
          <p style={styles.sectionTitle}>🚩 Schools needing attention</p>
          <p style={styles.sectionSub}>Not started clubs — {needsAttention.length} schools</p>
          <div style={{marginTop:'16px', display:'flex', flexDirection:'column', gap:'10px'}}>
            {needsAttention.slice(0,6).map(school => (
              <div key={school.id} style={styles.attentionRow}>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'#F7941D', flexShrink:0}} />
                  <div>
                    <p style={{margin:0, fontSize:'14px', fontWeight:'500', color:'#1a1a2e'}}>{school.official_name} — {school.county}</p>
                    <p style={{margin:0, fontSize:'12px', color:'#888'}}>Mentor: {school.mentor_name || 'Not assigned'}</p>
                  </div>
                </div>
                <span style={{...styles.badge, background:'#fff3e0', color:'#F7941D'}}>Not started</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top mentor activity */}
        <div style={{...styles.section, flex:1}}>
          <p style={styles.sectionTitle}>Top mentor activity</p>
          <div style={{marginTop:'16px', display:'flex', flexDirection:'column', gap:'14px'}}>
            {topMentors.map(mentor => (
              <div key={mentor.id} style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{width:'36px', height:'36px', borderRadius:'50%', background:getColor(mentor.full_name), color:'#fff', fontSize:'13px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  {getInitials(mentor.full_name)}
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:0, fontSize:'14px', fontWeight:'500', color:'#1a1a2e'}}>{mentor.full_name}</p>
                  <p style={{margin:0, fontSize:'12px', color:'#888'}}>{mentor.subcounty_area} · {mentor.schools_assigned} schools</p>
                </div>
                <span style={{...styles.badge, background:'#e8f8ee', color:'#1eb457'}}>● Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  pills: { display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'24px' },
  pill: { background:'#fff', border:'1px solid #e8e8e8', borderRadius:'999px', padding:'5px 12px', fontSize:'12px', color:'#555' },
  cards: { display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'16px', marginBottom:'24px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#888', letterSpacing:'0.5px', margin:'0 0 8px 0' },
  cardValue: { fontSize:'36px', fontWeight:'700', color:'#1a1a2e', margin:'0 0 4px 0' },
  cardSub: { fontSize:'12px', color:'#888', margin:0 },
  row: { display:'flex', gap:'20px', marginBottom:'24px' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a1a2e', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#888', margin:0 },
  attentionRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'#fafafa', borderRadius:'8px', borderLeft:'3px solid #F7941D' },
  badge: { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
};
