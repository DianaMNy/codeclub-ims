// src/pages/DonorView.jsx
import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AREA_COORDS = {
  'Githurai': [-1.2167, 36.9167], 'Wendani': [-1.2000, 36.9000],
  'Kenyatta road': [-1.1167, 37.0167], 'Kenyatta Road': [-1.1167, 37.0167],
  'Kahuro': [-0.9333, 36.9500], 'Kahawa West': [-1.1833, 36.9333],
  'Kahawa west': [-1.1833, 36.9333], 'Ruiru': [-1.1500, 36.9667],
  'Thika': [-1.0333, 37.0667], 'Kiambu': [-1.1719, 36.8356],
  'Kikuyu': [-1.2467, 36.6617], 'Limuru': [-1.1022, 36.6411],
  'Tigoni': [-1.0833, 36.7167], 'Ngoigwa': [-1.0167, 37.0500],
  'Juja': [-1.1000, 37.0167], 'Kiandutu': [-1.0500, 37.0833],
  'Mugutha': [-1.2000, 36.8000],
  'Kajiado': [-1.8500, 36.7833], 'Kajiado Town': [-1.8500, 36.7833],
  'Ngong': [-1.3667, 36.6500], 'Kitengela': [-1.4750, 36.9617],
  'Rongai': [-1.3944, 36.7458], 'Kiserian': [-1.3833, 36.6833],
  'Isinya': [-1.9833, 36.9667], 'Namanga': [-2.5500, 36.7833],
  'Loitokitok': [-2.9000, 37.5167], 'Overall': [-1.4750, 36.9617],
  "Murang'a": [-0.7167, 37.1500], 'Muranga': [-0.7167, 37.1500],
  'Muranga East': [-0.6833, 37.2000], "Murang'a East": [-0.6833, 37.2000],
  'Kangema': [-0.7500, 36.9000], 'Kigumo': [-0.8167, 37.0000],
  'Maragua': [-0.7333, 37.1333],
  'K-road': [-1.2800, 36.8200], 'K-road & Juja': [-1.2000, 37.0000],
  'Githurai & Wendani': [-1.2083, 36.9083], 'Mathioya': [-0.8500, 36.8500],
};
const COUNTY_CENTER = {
  'Kiambu':   [-1.1719, 36.9356],
  'Kajiado':  [-1.8500, 36.7833],
  "Murang'a": [-0.7167, 37.1500],
};
function getCoords(school) {
  if (school.subcounty_area && AREA_COORDS[school.subcounty_area]) {
    const [lat, lng] = AREA_COORDS[school.subcounty_area];
    return [lat + (Math.random()-0.5)*0.02, lng + (Math.random()-0.5)*0.02];
  }
  if (school.county && COUNTY_CENTER[school.county]) {
    const [lat, lng] = COUNTY_CENTER[school.county];
    return [lat + (Math.random()-0.5)*0.08, lng + (Math.random()-0.5)*0.08];
  }
  return [-1.2921+(Math.random()-0.5)*0.1, 36.8219+(Math.random()-0.5)*0.1];
}

const COUNTY_COLORS = { 'Kiambu':'#69A9C9', 'Kajiado':'#F7941D', "Murang'a":'#1eb457' };
const STATUS_COLORS = { 'active':'#1eb457', 'enrolled':'#F7941D', 'inactive':'#e74c3c' };
const BRAND = { green:'#1eb457', blue:'#69A9C9', orange:'#F7941D', purple:'#9b59b6', red:'#e74c3c', gold:'#F5C518' };

const IMPACT_STORIES = [
  { quote:"Before Code Club, I thought coding was only for city children. Now I teach Scratch to 45 learners every Saturday and two of my students won a regional showcase.", name:"Grace Wanjiru", role:"Code Club Leader", county:"Kiambu", color:"#69A9C9" },
  { quote:"My daughter built a website for our family business at age 12. She learned HTML at the Code Club in our community centre. I never imagined this was possible.", name:"Parent, Kajiado", role:"Community Member", county:"Kajiado", color:"#F7941D" },
  { quote:"We went from zero to 45 active learners in one term. The mentor support and structured pathway made it possible even with limited resources.", name:"Jackson Mwirigi", role:"Centre Manager, Jiunde Innovation Hub", county:"Murang'a", color:"#1eb457" },
];

function ProgressBar({ value, max, color, dark=true }) {
  const pct = max ? Math.min(Math.round((value/max)*100), 100) : 0;
  return (
    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
      <div style={{flex:1, background:dark?'rgba(255,255,255,0.2)':'#f0f0f0', borderRadius:'999px', height:'8px'}}>
        <div style={{width:`${pct}%`, background:color, height:'8px', borderRadius:'999px', transition:'width 0.8s'}}/>
      </div>
      <span style={{fontSize:'13px', color:dark?'#fff':'#555', minWidth:'40px', textAlign:'right', fontWeight:'600'}}>{pct}%</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#1a2332', border:'1px solid rgba(105,169,201,0.3)', borderRadius:'8px', padding:'10px 14px'}}>
      <p style={{margin:'0 0 4px', fontSize:'12px', fontWeight:'700', color:'#69A9C9'}}>{label}</p>
      {payload.map((p,i) => <p key={i} style={{margin:0, fontSize:'12px', color:'#fff'}}>{p.name}: <strong style={{color:p.color}}>{p.value}</strong></p>)}
    </div>
  );
};

export default function DonorView() {
  const [data, setData]           = useState(null);
  const [schools, setSchools]     = useState([]);
  const [devices, setDevices]     = useState([]);
  const [ecosystemTotal, setEcosystemTotal] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef  = useRef(null);
  const mapRef     = useRef(null);
  const mapInstRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    Promise.all([
      api.get('/donor'),
      api.get('/schools'),
      axios.get(import.meta.env.VITE_API_URL + '/api/device-audits', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }),
      api.get('/hos').catch(() => ({ data: [] })),
      api.get('/ecosystem-extras').catch(() => ({ data: [] })),
      api.get('/teachers').catch(() => ({ data: [] })),
    ])
      .then(([d, s, dv, hos, extras, teachers]) => {
        setData(d.data);
        setSchools(s.data);
        setDevices(dv.data || []);
        // Ecosystem total = HOS + ecosystem extras + additional teachers
        const hosCount     = Array.isArray(hos.data) ? hos.data.length : 0;
        const extrasCount  = Array.isArray(extras.data) ? extras.data.length : 0;
        const addlTeachers = Array.isArray(teachers.data)
          ? teachers.data.filter(t => t.role === 'additional').length : 0;
        setEcosystemTotal(hosCount + extrasCount + addlTeachers);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Device audit stats
  const totalDevices     = devices.reduce((s,d) => s+(parseInt(d.total_devices)||0), 0);
  const totalFunctioning = devices.reduce((s,d) => s+(parseInt(d.functioning_devices)||0), 0);
  const totalFaulty      = devices.reduce((s,d) => s+(parseInt(d.faulty_devices)||0), 0);
  const funcRate         = totalDevices ? Math.round((totalFunctioning/totalDevices)*100) : 0;
  const deviceTypeStats  = ['Desktops','Laptops','Tablets','Projectors'].map(type => ({
    type,
    total:       devices.filter(d=>d.device_type===type).reduce((s,d)=>s+(parseInt(d.total_devices)||0),0),
    functioning: devices.filter(d=>d.device_type===type).reduce((s,d)=>s+(parseInt(d.functioning_devices)||0),0),
    faulty:      devices.filter(d=>d.device_type===type).reduce((s,d)=>s+(parseInt(d.faulty_devices)||0),0),
  })).filter(d => d.total > 0);

  // Map setup
  useEffect(() => {
    if (!schools.length || !mapRef.current) return;
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      if (!mapInstRef.current) {
        mapInstRef.current = L.map(mapRef.current, { center:[-1.4, 36.9], zoom:9, zoomControl:true, scrollWheelZoom:false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap contributors', maxZoom:18 }).addTo(mapInstRef.current);
      }
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      schools.forEach(school => {
        const [lat, lng] = getCoords(school);
        const color = STATUS_COLORS[school.status] || '#888';
        const isCentre = school.type === 'community_centre';
        const icon = L.divIcon({
          html: `<div style="width:${isCentre?'14px':'12px'};height:${isCentre?'14px':'12px'};border-radius:${isCentre?'3px':'50%'};background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
          className:'', iconSize:[16,16], iconAnchor:[8,8],
        });
        const marker = L.marker([lat,lng], {icon}).addTo(mapInstRef.current)
          .bindPopup(`<div style="font-family:'Segoe UI',sans-serif;min-width:180px;"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a2332;">${school.official_name}</p><p style="margin:0 0 6px;font-size:11px;color:#888;">${school.club_id||'—'} · ${school.county}</p><span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${color}20;color:${color};font-weight:600;">● ${school.status}</span>${school.learner_count?`<p style="margin:6px 0 0;font-size:11px;color:#555;">👩‍💻 ${school.learner_count} learners</p>`:''}</div>`);
        markersRef.current.push(marker);
      });
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapInstRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    });
  }, [schools]);

  const handleExportPDF = async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {scale:1.5, backgroundColor:'#f8f9fa', logging:false, useCORS:true});
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height*pdfW)/canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let y = 0;
      while (y < pdfH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH);
        y += pageH;
      }
      pdf.save(`Code_Club_Kenya_Donor_Impact_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e) { console.error(e); }
    finally { setExporting(false); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({title:'Code Club Kenya — Donor Impact Summary', text:'RPF 2026 Programme Impact Report', url:window.location.href});
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) return (
    <Layout title="Donor View" subtitle="Read-only · Shareable impact summary · RPF 2026">
      <p style={{color:'#888',padding:'40px',textAlign:'center'}}>Loading impact data...</p>
    </Layout>
  );
  if (!data) return (
    <Layout title="Donor View" subtitle="Read-only · Shareable impact summary · RPF 2026">
      <p style={{color:'#888',padding:'40px',textAlign:'center'}}>No data available</p>
    </Layout>
  );

  const growthChartData = (data.growth||[]).map(g => ({ month:g.month, 'Schools':parseInt(g.cumulative_schools) }));

  // Derived stats
  const schoolClubLeaders  = data.teachers?.club_leaders  || data.teachers?.total || 0;
  const centreClubLeaders  = data.teachers?.centre_leaders || data.schools?.centres || 0;

  return (
    <Layout title="Donor View" subtitle="Read-only · Shareable impact summary · RPF 2026">

      <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginBottom:'16px'}}>
        <button style={S.shareBtn} onClick={handleShare}>🔗 Share</button>
        <button style={{...S.pdfBtn, opacity:exporting?0.7:1}} onClick={handleExportPDF} disabled={exporting}>
          {exporting?'⏳ Generating PDF...':'↓ Download PDF'}
        </button>
      </div>

      <div ref={reportRef}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div style={S.hero}>
          <div style={S.heroLeft}>
            <p style={S.heroTag}>EMPSERVE KENYA · RASPBERRY PI FOUNDATION · RPF 2026</p>
            <h1 style={S.heroTitle}>Code Club Kenya</h1>
            <h2 style={S.heroSub}>Donor Impact Summary</h2>
            <p style={S.heroDesc}>Jan 2025 – Dec 2026 · Kiambu, Kajiado & Murang'a Counties · Live Programme Database</p>

            {/* NEW hero stats */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'12px', marginTop:'24px'}}>
              {[
                { value: parseInt(data.schools.active||0) + parseInt(data.schools.centres||0), label:'Coding Clubs' },
                { value: parseInt(data.schools.learners||0).toLocaleString(), label:'Learners Registered' },
                { value: schoolClubLeaders, label:'Club Leaders (Schools)' },
                { value: centreClubLeaders, label:'Club Leaders (Centres)' },
                { value: data.mentors.active, label:'Active Youth Mentors' },
                { value: data.schools.counties || 3, label:'Counties Covered' },
                { value: ecosystemTotal || data.ecosystem?.total || 0, label:'Ecosystem Builders' },
              ].map(stat => (
                <div key={stat.label} style={S.heroStat}>
                  <p style={S.heroStatValue}>{stat.value}</p>
                  <p style={S.heroStatLabel}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={S.heroRight}>
            <div style={S.heroCircle}>
              <p style={S.heroCircleValue}>{parseInt(data.schools.learners||0).toLocaleString()}</p>
              <p style={S.heroCircleLabel}>Learners</p>
              <p style={S.heroCircleLabel}>Reached</p>
            </div>
          </div>
        </div>

        {/* ── HIGHLIGHT CARDS ───────────────────────────────────────────── */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px'}}>
          {[
            { icon:'🌍', value:'3', label:'Counties active', sub:'47 counties — national scale opportunity', color:BRAND.blue },
            { icon:'📈', value:`${Math.round(parseInt(data.schools.active||0)/Math.max(parseInt(data.schools.total||1)-parseInt(data.schools.centres||0),1)*100)}%`, label:'Club activation rate', sub:`${data.schools.active} of ${parseInt(data.schools.total)-parseInt(data.schools.centres)} schools running sessions`, color:BRAND.orange },
            { icon:'🎓', value:parseInt(data.schools.learners||0).toLocaleString(), label:'Young coders reached', sub:'across 3 Kenyan counties', color:BRAND.green },
            { icon:'💻', value:totalDevices.toLocaleString(), label:'Devices inventoried', sub:`${funcRate}% functioning · ${totalFaulty} need repair`, color:BRAND.purple },
          ].map(c => (
            <div key={c.label} style={{...S.highlightCard, borderLeft:`4px solid ${c.color}`}}>
              <p style={S.highlightIcon}>{c.icon}</p>
              <p style={S.highlightValue}>{c.value}</p>
              <p style={S.highlightLabel}>{c.label}</p>
              <p style={S.highlightSub}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── PROGRAMME HEALTH + FUNDED SCALE ─────────────────────────── */}
        <div style={S.row}>
          <div style={{...S.card, flex:2}}>
            <p style={S.cardTitle}>Programme Health</p>
            <p style={S.cardSub}>Active clubs vs total enrolled</p>
            <div style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'20px'}}>
              {[
                { label:'Active code clubs',          value:data.schools.active,       max:parseInt(data.schools.total)-parseInt(data.schools.centres), color:BRAND.green },
                { label:'Community centres active',   value:data.schools.centres,      max:data.schools.centres,           color:BRAND.purple },
                { label:'Pathways showcase-eligible', value:data.pathways.completed,   max:Math.max(data.pathways.total,1), color:BRAND.orange },
                { label:'Devices functioning',        value:totalFunctioning,          max:Math.max(totalDevices,1),        color:BRAND.blue },
              ].map(item => (
                <div key={item.label}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                    <span style={{fontSize:'14px', color:'#ccc'}}>{item.label}</span>
                    <span style={{fontSize:'13px', color:'#fff', fontWeight:'600'}}>{item.value}/{item.max}</span>
                  </div>
                  <ProgressBar value={item.value} max={item.max} color={item.color} dark />
                </div>
              ))}
            </div>
          </div>

          <div style={{...S.card, flex:1}}>
            <p style={S.cardTitle}>Funded Scale — Year 5 Vision</p>
            <p style={S.cardSub}>Current vs target</p>
            <div style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'16px'}}>
              {[
                { label:'Schools (750 target)',     current:data.schools.total,                  target:750,   color:BRAND.orange },
                { label:'Learners (25,000 target)', current:parseInt(data.schools.learners||0),  target:25000, color:BRAND.green },
                { label:'Educators (1,200 target)', current:data.teachers.total,                 target:1200,  color:BRAND.blue },
                { label:'Counties (20+ target)',    current:3,                                   target:20,    color:BRAND.purple },
              ].map(item => (
                <div key={item.label} style={{display:'flex', gap:'16px', alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <p style={{margin:'0 0 4px', fontSize:'13px', color:'#ccc'}}>{item.label}</p>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'999px', height:'6px'}}>
                      <div style={{width:`${Math.min(item.current/item.target*100,100)}%`, background:item.color, height:'6px', borderRadius:'999px'}}/>
                    </div>
                  </div>
                  <p style={{margin:0, fontSize:'14px', fontWeight:'700', color:'#fff', minWidth:'70px', textAlign:'right'}}>
                    {typeof item.current==='number'&&item.current>1000?item.current.toLocaleString():item.current} now
                  </p>
                </div>
              ))}
            </div>
            <div style={S.impactBox}>
              <p style={S.impactText}>
                Already reaching {parseInt(data.schools.learners||0).toLocaleString()} learners across {data.schools.total} schools
                with only 3 counties active. Full funding unlocks national scale — Kenya's largest
                rural coding programme by Year 5.
              </p>
            </div>
          </div>
        </div>

        {/* ── MAP + GROWTH CHART ────────────────────────────────────────── */}
        <div style={S.row}>
          <div style={{flex:1.3, borderRadius:'12px', overflow:'hidden', position:'relative', minHeight:'380px', background:'#1a2332'}}>
            <div style={{position:'absolute', top:'12px', left:'12px', zIndex:1000, background:'rgba(26,35,50,0.92)', borderRadius:'8px', padding:'10px 14px', backdropFilter:'blur(4px)'}}>
              <p style={{margin:'0 0 4px', fontSize:'13px', fontWeight:'700', color:'#fff'}}>🗺️ Geographic Reach</p>
              <p style={{margin:'0 0 8px', fontSize:'11px', color:'rgba(255,255,255,0.6)'}}>
                {schools.filter(s=>s.status==='active').length} active · {schools.length} schools mapped
              </p>
              <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                {[{color:BRAND.green,label:'Active'},{color:BRAND.orange,label:'Not started'},{color:BRAND.blue,label:'Centre'}].map(l=>(
                  <div key={l.label} style={{display:'flex', alignItems:'center', gap:'4px'}}>
                    <div style={{width:'8px', height:'8px', borderRadius:'50%', background:l.color}}/>
                    <span style={{fontSize:'10px', color:'rgba(255,255,255,0.7)'}}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div ref={mapRef} style={{width:'100%', height:'380px'}}/>
          </div>

          <div style={{...S.card, flex:1}}>
            <p style={S.cardTitle}>📈 Programme Growth</p>
            <p style={S.cardSub}>Cumulative schools enrolled over time</p>
            {growthChartData.length > 0 ? (
              <div style={{marginTop:'20px'}}>
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={growthChartData} margin={{top:5,right:10,left:0,bottom:5}}>
                    <defs>
                      <linearGradient id="schoolGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={BRAND.green} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={BRAND.green} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                    <XAxis dataKey="month" tick={{fontSize:10, fill:'#8a96a3'}}/>
                    <YAxis tick={{fontSize:10, fill:'#8a96a3'}}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Area type="monotone" dataKey="Schools" name="Total Schools" stroke={BRAND.green} strokeWidth={2} fill="url(#schoolGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{marginTop:'20px', textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,0.4)'}}>
                <p style={{fontSize:'32px', margin:'0 0 8px'}}>📊</p>
                <p style={{fontSize:'13px', margin:0}}>Growth data appears as schools are added over time</p>
              </div>
            )}
          </div>
        </div>

        {/* ── DEVICE AUDIT SUMMARY ─────────────────────────────────────── */}
        <div style={S.whiteCard}>
          <p style={S.wCardTitle}>💻 Device Infrastructure — Across All Coding Clubs</p>
          <p style={{fontSize:'12px', color:'#8a96a3', margin:'0 0 20px'}}>
            Device inventory across {new Set(devices.map(d=>d.school_name||d.school_name_snapshot)).size} schools and centres · {devices.length} audit records
          </p>

          {/* 4 stat cards */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px'}}>
            {[
              { label:'Total Devices',    value:totalDevices.toLocaleString(), sub:'across all clubs',        color:BRAND.blue,   icon:'💻' },
              { label:'Functioning',      value:totalFunctioning.toLocaleString(), sub:`${funcRate}% working`, color:BRAND.green,  icon:'✅' },
              { label:'Faulty',           value:totalFaulty.toLocaleString(), sub:'need repair/replacement',  color:BRAND.red,    icon:'⚠️' },
              { label:'Clubs Audited',    value:new Set(devices.map(d=>d.school_name||d.school_name_snapshot)).size, sub:'schools & centres', color:BRAND.orange, icon:'🏫' },
            ].map(c=>(
              <div key={c.label} style={{background:'#f8f9fa', borderRadius:'10px', padding:'20px', textAlign:'center', borderTop:`4px solid ${c.color}`}}>
                <p style={{fontSize:'28px', margin:'0 0 6px'}}>{c.icon}</p>
                <p style={{fontSize:'28px', fontWeight:'800', color:c.color, margin:'0 0 4px'}}>{c.value}</p>
                <p style={{fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px'}}>{c.label}</p>
                <p style={{fontSize:'11px', color:'#8a96a3', margin:0}}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Overall health bar */}
          <div style={{background:'#f8f9fa', borderRadius:'10px', padding:'16px 20px', marginBottom:'20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
              <span style={{fontSize:'14px', fontWeight:'600', color:'#1a2332'}}>Overall device health</span>
              <span style={{fontSize:'14px', fontWeight:'700', color:funcRate>=75?BRAND.green:funcRate>=50?BRAND.orange:BRAND.red}}>{funcRate}% functioning</span>
            </div>
            <div style={{background:'#e2e8f0', borderRadius:'999px', height:'12px'}}>
              <div style={{width:`${funcRate}%`, background:funcRate>=75?BRAND.green:funcRate>=50?BRAND.orange:BRAND.red, height:'12px', borderRadius:'999px', transition:'width 0.8s'}}/>
            </div>
          </div>

          {/* Device type breakdown */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px'}}>
            {deviceTypeStats.map(d => {
              const rate = d.total ? Math.round((d.functioning/d.total)*100) : 0;
              const color = rate>=75?BRAND.green:rate>=50?BRAND.orange:BRAND.red;
              return (
                <div key={d.type} style={{background:'#f8f9fa', borderRadius:'10px', padding:'16px'}}>
                  <p style={{fontSize:'14px', fontWeight:'700', color:'#1a2332', margin:'0 0 8px'}}>{d.type}</p>
                  <p style={{fontSize:'22px', fontWeight:'800', color:'#1a2332', margin:'0 0 4px'}}>{d.total}</p>
                  <p style={{fontSize:'12px', color:'#8a96a3', margin:'0 0 10px'}}>{d.functioning} functioning · {d.faulty} faulty</p>
                  <div style={{background:'#e2e8f0', borderRadius:'999px', height:'6px'}}>
                    <div style={{width:`${rate}%`, background:color, height:'6px', borderRadius:'999px'}}/>
                  </div>
                  <p style={{fontSize:'11px', color, fontWeight:'600', margin:'4px 0 0', textAlign:'right'}}>{rate}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── IMPACT STORIES ───────────────────────────────────────────── */}
        <div style={S.whiteCard}>
          <p style={S.wCardTitle}>💬 Voices from the Field</p>
          <p style={{fontSize:'12px', color:'#8a96a3', margin:'0 0 20px'}}>Real impact from educators, parents and community members</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px'}}>
            {IMPACT_STORIES.map((story,i) => (
              <div key={i} style={{...S.storyCard, borderTop:`4px solid ${story.color}`}}>
                <p style={S.storyQuote}>"{story.quote}"</p>
                <div style={S.storyAuthor}>
                  <div style={{...S.storyAvatar, background:story.color}}>
                    {story.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <p style={S.storyName}>{story.name}</p>
                    <p style={S.storyRole}>{story.role} · {story.county}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COUNTY BREAKDOWN ─────────────────────────────────────────── */}
        <div style={S.whiteCard}>
          <p style={S.wCardTitle}>Schools & Learners by County</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginTop:'16px'}}>
            {data.counties.map(county => (
              <div key={county.county} style={{...S.countyCard, borderTop:`4px solid ${COUNTY_COLORS[county.county]||'#888'}`}}>
                <p style={{fontSize:'18px', fontWeight:'700', margin:'0 0 16px', color:COUNTY_COLORS[county.county]}}>{county.county}</p>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'12px'}}>
                  {[{label:'Schools',value:county.schools},{label:'Active',value:county.active},{label:'Learners',value:parseInt(county.learners||0).toLocaleString()}].map(s=>(
                    <div key={s.label} style={{textAlign:'center'}}>
                      <p style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#1a2332'}}>{s.value}</p>
                      <p style={{margin:0, fontSize:'11px', color:'#8a96a3'}}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{background:'#f0f0f0', borderRadius:'999px', height:'8px'}}>
                  <div style={{width:`${Math.round(county.active/Math.max(county.schools,1)*100)}%`, background:COUNTY_COLORS[county.county]||'#888', height:'8px', borderRadius:'999px'}}/>
                </div>
                <p style={{margin:'6px 0 0', fontSize:'11px', color:'#8a96a3', textAlign:'right'}}>
                  {Math.round(county.active/Math.max(county.schools,1)*100)}% active
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── KEY ACHIEVEMENTS ─────────────────────────────────────────── */}
        <div style={S.whiteCard}>
          <p style={S.wCardTitle}>Key Programme Achievements</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginTop:'16px'}}>
            {[
              {icon:'🏫', value:parseInt(data.schools.active||0)+parseInt(data.schools.centres||0), label:'Active Coding Clubs',  sub:'schools + community centres', color:BRAND.green},
              {icon:'👩‍🏫', value:data.teachers.total,    label:'Trained Educators',    sub:'club leaders & teachers',  color:BRAND.blue},
              {icon:'👤', value:data.mentors.active,      label:'Active Youth Mentors', sub:'supporting coding clubs',  color:BRAND.orange},
              {icon:'🌍', value:data.schools.counties||3, label:'Counties Covered',     sub:'Kiambu · Kajiado · Murang\'a', color:BRAND.purple},
            ].map(item=>(
              <div key={item.label} style={{background:'#f8f9fa', borderRadius:'10px', padding:'20px', textAlign:'center', borderTop:`4px solid ${item.color}`}}>
                <p style={{fontSize:'32px', margin:'0 0 8px'}}>{item.icon}</p>
                <p style={{fontSize:'32px', fontWeight:'800', color:item.color, margin:'0 0 4px'}}>{item.value}</p>
                <p style={{fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px'}}>{item.label}</p>
                <p style={{fontSize:'11px', color:'#8a96a3', margin:0}}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <div style={S.ctaBanner}>
          <div>
            <p style={S.ctaTitle}>Ready to scale Code Club Kenya nationally?</p>
            <p style={S.ctaSub}>{parseInt(data.schools.active||0)+parseInt(data.schools.centres||0)} active coding clubs · {parseInt(data.schools.learners||0).toLocaleString()} learners · 3 counties · growing</p>
          </div>
          <div style={{display:'flex', gap:'12px', flexShrink:0}}>
            <a href="mailto:info@empserve.org" style={S.ctaBtn}>📧 Contact EmpServe</a>
            <a href="https://www.raspberrypi.org/foundation/" target="_blank" rel="noreferrer"
              style={{...S.ctaBtn, background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)'}}>
              🌐 RPF Website
            </a>
          </div>
        </div>

      </div>
    </Layout>
  );
}

const S = {
  shareBtn: { padding:'8px 18px', borderRadius:'8px', border:'1.5px solid #69A9C9', background:'#fff', color:'#69A9C9', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  pdfBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  hero: { background:'linear-gradient(135deg, #1a2332 0%, #2c3e50 60%, #1a3a4a 100%)', borderRadius:'16px', padding:'36px', marginBottom:'20px', display:'flex', gap:'32px', alignItems:'center' },
  heroLeft: { flex:1 },
  heroTag: { fontSize:'10px', fontWeight:'700', color:'#69A9C9', letterSpacing:'1px', margin:'0 0 12px' },
  heroTitle: { fontSize:'36px', fontWeight:'800', color:'#fff', margin:'0 0 4px' },
  heroSub: { fontSize:'20px', fontWeight:'400', color:'#F7941D', margin:'0 0 8px' },
  heroDesc: { fontSize:'13px', color:'rgba(255,255,255,0.6)', margin:'0 0 4px' },
  heroStat: { textAlign:'center', background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'12px 8px' },
  heroStatValue: { fontSize:'20px', fontWeight:'700', color:'#fff', margin:'0 0 4px' },
  heroStatLabel: { fontSize:'10px', color:'rgba(255,255,255,0.5)', margin:0, lineHeight:1.3 },
  heroRight: { flexShrink:0 },
  heroCircle: { width:'160px', height:'160px', borderRadius:'50%', background:'rgba(105,169,201,0.15)', border:'3px solid #69A9C9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' },
  heroCircleValue: { fontSize:'28px', fontWeight:'800', color:'#fff', margin:'0 0 4px' },
  heroCircleLabel: { fontSize:'12px', color:'#69A9C9', margin:0 },
  highlightCard: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', textAlign:'center' },
  highlightIcon: { fontSize:'28px', margin:'0 0 8px' },
  highlightValue: { fontSize:'32px', fontWeight:'800', color:'#1a2332', margin:'0 0 4px' },
  highlightLabel: { fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px' },
  highlightSub: { fontSize:'11px', color:'#8a96a3', margin:0 },
  row: { display:'flex', gap:'20px', marginBottom:'20px' },
  card: { background:'linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)', borderRadius:'12px', padding:'24px' },
  cardTitle: { fontSize:'16px', fontWeight:'700', color:'#fff', margin:'0 0 4px' },
  cardSub: { fontSize:'12px', color:'rgba(255,255,255,0.5)', margin:0 },
  impactBox: { marginTop:'20px', background:'rgba(247,148,29,0.1)', borderRadius:'8px', padding:'14px', border:'1px solid rgba(247,148,29,0.3)' },
  impactText: { fontSize:'12px', color:'rgba(255,255,255,0.7)', margin:0, lineHeight:1.6 },
  whiteCard: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },
  wCardTitle: { fontSize:'16px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px' },
  storyCard: { background:'#f8f9fa', borderRadius:'10px', padding:'20px', display:'flex', flexDirection:'column' },
  storyQuote: { fontSize:'13px', color:'#444', lineHeight:1.7, fontStyle:'italic', margin:'0 0 16px', flex:1 },
  storyAuthor: { display:'flex', gap:'12px', alignItems:'center' },
  storyAvatar: { width:'36px', height:'36px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#fff', flexShrink:0 },
  storyName: { fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 2px' },
  storyRole: { fontSize:'11px', color:'#8a96a3', margin:0 },
  countyCard: { background:'#f8f9fa', borderRadius:'10px', padding:'20px' },
  ctaBanner: { background:'linear-gradient(135deg, #1eb457 0%, #159a48 100%)', borderRadius:'12px', padding:'28px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'20px', marginBottom:'20px' },
  ctaTitle: { fontSize:'18px', fontWeight:'700', color:'#fff', margin:'0 0 6px' },
  ctaSub: { fontSize:'13px', color:'rgba(255,255,255,0.8)', margin:0 },
  ctaBtn: { padding:'10px 20px', borderRadius:'8px', background:'#fff', color:'#1eb457', fontSize:'13px', fontWeight:'700', textDecoration:'none', display:'inline-block' },
};
