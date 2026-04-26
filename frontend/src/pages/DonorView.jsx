// src/pages/DonorView.jsx
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

function ProgressBar({ value, max, color }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
      <div style={{ flex:1, background:'rgba(255,255,255,0.2)', borderRadius:'999px', height:'8px' }}>
        <div style={{ width:`${pct}%`, background: color, height:'8px', borderRadius:'999px', transition:'width 0.8s' }} />
      </div>
      <span style={{ fontSize:'13px', color:'#fff', minWidth:'40px', textAlign:'right', fontWeight:'600' }}>{pct}%</span>
    </div>
  );
}

export default function DonorView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donor')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Donor View" subtitle="Read-only · Shareable summary">
      <p style={{color:'#888', padding:'40px', textAlign:'center'}}>Loading impact data...</p>
    </Layout>
  );

  if (!data) return (
    <Layout title="Donor View" subtitle="Read-only · Shareable summary">
      <p style={{color:'#888', padding:'40px', textAlign:'center'}}>No data available</p>
    </Layout>
  );

  const activeClubsPct = Math.round(data.schools.active / Math.max(data.schools.total - data.schools.centres, 1) * 100);
  const safeguardingPct = Math.round(data.teachers.safeguarded / Math.max(data.teachers.total, 1) * 100);
  const pathwayPct = Math.round(data.pathways.completed / Math.max(data.pathways.total, 1) * 100);

  return (
    <Layout title="Donor View" subtitle="Read-only · Shareable impact summary · RPF 2026">

      {/* Hero Banner */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <p style={styles.heroTag}>EMPSERVE KENYA · RASPBERRY PI FOUNDATION · RPF 2026</p>
          <h1 style={styles.heroTitle}>Code Club Kenya</h1>
          <h2 style={styles.heroSub}>Donor Impact Summary</h2>
          <p style={styles.heroDesc}>
            Jan 2025 – Dec 2026 · Kiambu, Kajiado & Murang'a Counties · Live Programme Database
          </p>

          {/* Hero Stats */}
          <div style={styles.heroStats}>
            {[
              { value: data.schools.total, label: 'Schools enrolled' },
              { value: parseInt(data.schools.learners||0).toLocaleString(), label: 'Learners registered' },
              { value: data.teachers.total, label: 'Educators enrolled' },
              { value: data.teachers.safeguarded, label: 'Safeguarding trained' },
              { value: data.mentors.active, label: 'Active mentors' },
              { value: data.schools.counties || 3, label: 'Counties covered' },
            ].map(stat => (
              <div key={stat.label} style={styles.heroStat}>
                <p style={styles.heroStatValue}>{stat.value}</p>
                <p style={styles.heroStatLabel}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Circular decoration */}
        <div style={styles.heroRight}>
          <div style={styles.heroCircle}>
            <p style={styles.heroCircleValue}>{parseInt(data.schools.learners||0).toLocaleString()}</p>
            <p style={styles.heroCircleLabel}>Learners</p>
            <p style={styles.heroCircleLabel}>Reached</p>
          </div>
        </div>
      </div>

      {/* Programme Health */}
      <div style={styles.row}>
        <div style={{...styles.card, flex:2}}>
          <p style={styles.cardTitle}>Programme Health</p>
          <p style={styles.cardSub}>Active clubs vs total enrolled</p>
          <div style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'20px'}}>
            {[
              { label:'Active code clubs', value: data.schools.active, max: parseInt(data.schools.total) - parseInt(data.schools.centres), color:'#1eb457' },
              { label:'Educators safeguarding-trained', value: data.teachers.safeguarded, max: data.teachers.total, color:'#69A9C9' },
              { label:'Pathways showcase-eligible', value: data.pathways.completed, max: Math.max(data.pathways.total,1), color:'#F7941D' },
              { label:'Community centres active', value: data.schools.centres, max: data.schools.centres, color:'#9b59b6' },
            ].map(item => (
              <div key={item.label}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                  <span style={{fontSize:'14px', color:'#ccc'}}>{item.label}</span>
                  <span style={{fontSize:'13px', color:'#fff', fontWeight:'600'}}>{item.value}/{item.max}</span>
                </div>
                <ProgressBar value={item.value} max={item.max} color={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Funded scale */}
        <div style={{...styles.card, flex:1}}>
          <p style={styles.cardTitle}>Funded Scale — Year 5 Vision</p>
          <p style={styles.cardSub}>Current vs target</p>
          <div style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'16px'}}>
            {[
              { label:'Schools (750 target)', current: data.schools.total, target: 750, color:'#F7941D' },
              { label:'Learners (25,000 target)', current: parseInt(data.schools.learners||0), target: 25000, color:'#1eb457' },
              { label:'Educators (1,200 target)', current: data.teachers.total, target: 1200, color:'#69A9C9' },
              { label:'Counties (20+ target)', current: 3, target: 20, color:'#9b59b6' },
            ].map(item => (
              <div key={item.label} style={styles.scaleRow}>
                <div style={{flex:1}}>
                  <p style={{margin:'0 0 4px', fontSize:'13px', color:'#ccc'}}>{item.label}</p>
                  <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'999px', height:'6px'}}>
                    <div style={{
                      width:`${Math.min(item.current/item.target*100, 100)}%`,
                      background: item.color, height:'6px', borderRadius:'999px'
                    }} />
                  </div>
                </div>
                <div style={{textAlign:'right', minWidth:'80px'}}>
                  <p style={{margin:0, fontSize:'14px', fontWeight:'700', color:'#fff'}}>{typeof item.current === 'number' && item.current > 1000 ? item.current.toLocaleString() : item.current} now</p>
                </div>
              </div>
            ))}
          </div>

          {/* Impact statement */}
          <div style={styles.impactBox}>
            <p style={styles.impactText}>
              Already reaching {parseInt(data.schools.learners||0).toLocaleString()} learners across {data.schools.total} schools
              with only 3 counties active. Full funding unlocks national scale — Kenya's largest
              rural coding programme by Year 5. Aligned with CBC, Vision 2030 and the global
              Raspberry Pi network of 15,000+ clubs.
            </p>
          </div>
        </div>
      </div>

      {/* County breakdown */}
      <div style={styles.whiteCard}>
        <p style={{...styles.cardTitle, color:'#1a2332'}}>Schools & Learners by County</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginTop:'16px'}}>
          {data.counties.map(county => (
            <div key={county.county} style={{...styles.countyCard, borderTop:`4px solid ${COUNTY_COLORS[county.county]||'#888'}`}}>
              <p style={{...styles.countyName, color: COUNTY_COLORS[county.county]}}>{county.county}</p>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px'}}>
                {[
                  { label:'Schools', value: county.schools },
                  { label:'Active', value: county.active },
                  { label:'Learners', value: parseInt(county.learners||0).toLocaleString() },
                ].map(s => (
                  <div key={s.label} style={{textAlign:'center'}}>
                    <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#1a2332'}}>{s.value}</p>
                    <p style={{margin:0, fontSize:'11px', color:'#8a96a3'}}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div style={{background:'#f0f0f0', borderRadius:'999px', height:'8px'}}>
                <div style={{
                  width:`${Math.round(county.active/Math.max(county.schools,1)*100)}%`,
                  background: COUNTY_COLORS[county.county]||'#888',
                  height:'8px', borderRadius:'999px'
                }} />
              </div>
              <p style={{margin:'6px 0 0', fontSize:'11px', color:'#8a96a3', textAlign:'right'}}>
                {Math.round(county.active/Math.max(county.schools,1)*100)}% active
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key achievements */}
      <div style={styles.whiteCard}>
        <p style={{...styles.cardTitle, color:'#1a2332'}}>Key Programme Achievements</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginTop:'16px'}}>
          {[
            { icon:'🏫', value: data.schools.active, label:'Active Code Clubs', sub:'running weekly sessions', color:'#1eb457' },
            { icon:'👩‍🏫', value: data.teachers.total, label:'Trained Educators', sub:'club leaders & teachers', color:'#69A9C9' },
            { icon:'🛡️', value: data.teachers.safeguarded, label:'Safeguarding Certified', sub:'child protection trained', color:'#F7941D' },
            { icon:'⭐', value: data.starclubs.total, label:'Star Clubs', sub:'top performing clubs', color:'#F5C518' },
          ].map(item => (
            <div key={item.label} style={{...styles.achieveCard, borderTop:`4px solid ${item.color}`}}>
              <p style={{fontSize:'32px', margin:'0 0 8px'}}>{item.icon}</p>
              <p style={{fontSize:'32px', fontWeight:'800', color: item.color, margin:'0 0 4px'}}>{item.value}</p>
              <p style={{fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px'}}>{item.label}</p>
              <p style={{fontSize:'11px', color:'#8a96a3', margin:0}}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

    </Layout>
  );
}

const styles = {
  hero: { background:'linear-gradient(135deg, #1a2332 0%, #2c3e50 60%, #1a3a4a 100%)', borderRadius:'16px', padding:'36px', marginBottom:'20px', display:'flex', gap:'32px', alignItems:'center' },
  heroLeft: { flex:1 },
  heroTag: { fontSize:'10px', fontWeight:'700', color:'#69A9C9', letterSpacing:'1px', margin:'0 0 12px 0' },
  heroTitle: { fontSize:'36px', fontWeight:'800', color:'#fff', margin:'0 0 4px 0' },
  heroSub: { fontSize:'20px', fontWeight:'400', color:'#F7941D', margin:'0 0 8px 0' },
  heroDesc: { fontSize:'13px', color:'rgba(255,255,255,0.6)', margin:'0 0 24px 0' },
  heroStats: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'16px' },
  heroStat: { textAlign:'center', background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'12px 8px' },
  heroStatValue: { fontSize:'22px', fontWeight:'700', color:'#fff', margin:'0 0 4px 0' },
  heroStatLabel: { fontSize:'10px', color:'rgba(255,255,255,0.5)', margin:0, lineHeight:1.3 },
  heroRight: { flexShrink:0 },
  heroCircle: { width:'160px', height:'160px', borderRadius:'50%', background:'rgba(105,169,201,0.15)', border:'3px solid #69A9C9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' },
  heroCircleValue: { fontSize:'28px', fontWeight:'800', color:'#fff', margin:'0 0 4px 0' },
  heroCircleLabel: { fontSize:'12px', color:'#69A9C9', margin:0 },
  row: { display:'flex', gap:'20px', marginBottom:'20px' },
  card: { background:'linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)', borderRadius:'12px', padding:'24px' },
  cardTitle: { fontSize:'16px', fontWeight:'700', color:'#fff', margin:'0 0 4px 0' },
  cardSub: { fontSize:'12px', color:'rgba(255,255,255,0.5)', margin:0 },
  scaleRow: { display:'flex', gap:'16px', alignItems:'center' },
  impactBox: { marginTop:'20px', background:'rgba(247,148,29,0.1)', borderRadius:'8px', padding:'14px', border:'1px solid rgba(247,148,29,0.3)' },
  impactText: { fontSize:'12px', color:'rgba(255,255,255,0.7)', margin:0, lineHeight:1.6 },
  whiteCard: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },
  countyCard: { background:'#f8f9fa', borderRadius:'10px', padding:'20px' },
  countyName: { fontSize:'18px', fontWeight:'700', margin:'0 0 16px 0' },
  achieveCard: { background:'#f8f9fa', borderRadius:'10px', padding:'20px', textAlign:'center' },
};
