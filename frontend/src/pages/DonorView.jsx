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

// ── Exact same coords as LiveMap.jsx ─────────────────────────────────────────
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
  'Githurai & Wendani': [-1.2083, 36.9083],
  'Mathioya': [-0.8500, 36.8500],
};
const COUNTY_CENTER = {
  'Kiambu':   [-1.1719, 36.9356],
  'Kajiado':  [-1.8500, 36.7833],
  "Murang'a": [-0.7167, 37.1500],
};
function getCoords(school) {
  if (school.subcounty_area && AREA_COORDS[school.subcounty_area]) {
    const [lat, lng] = AREA_COORDS[school.subcounty_area];
    return [lat + (Math.random() - 0.5) * 0.02, lng + (Math.random() - 0.5) * 0.02];
  }
  if (school.county && COUNTY_CENTER[school.county]) {
    const [lat, lng] = COUNTY_CENTER[school.county];
    return [lat + (Math.random() - 0.5) * 0.08, lng + (Math.random() - 0.5) * 0.08];
  }
  return [-1.2921 + (Math.random() - 0.5) * 0.1, 36.8219 + (Math.random() - 0.5) * 0.1];
}

const COUNTY_COLORS = {
  'Kiambu':   '#69A9C9',
  'Kajiado':  '#F7941D',
  "Murang'a": '#1eb457',
};
const STATUS_COLORS = { 'active':'#1eb457', 'enrolled':'#F7941D', 'inactive':'#e74c3c' };

const IMPACT_STORIES = [
  { quote:"Before Code Club, I thought coding was only for city children. Now I teach Scratch to 45 learners every Saturday and two of my students won a regional showcase.", name:"Grace Wanjiru", role:"Code Club Leader", county:"Kiambu", color:"#69A9C9" },
  { quote:"My daughter built a website for our family business at age 12. She learned HTML at the Code Club in our community centre. I never imagined this was possible.", name:"Parent, Kajiado", role:"Community Member", county:"Kajiado", color:"#F7941D" },
  { quote:"We went from zero to 45 active learners in one term. The mentor support and structured pathway made it possible even with limited resources.", name:"Jackson Mwirigi", role:"Centre Manager, Jiunde Innovation Hub", county:"Murang'a", color:"#1eb457" },
];

function ProgressBar({ value, max, color, dark = true }) {
  const pct = max ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
      <div style={{ flex:1, background: dark ? 'rgba(255,255,255,0.2)' : '#f0f0f0', borderRadius:'999px', height:'8px' }}>
        <div style={{ width:`${pct}%`, background:color, height:'8px', borderRadius:'999px', transition:'width 0.8s' }} />
      </div>
      <span style={{ fontSize:'13px', color: dark ? '#fff' : '#555', minWidth:'40px', textAlign:'right', fontWeight:'600' }}>{pct}%</span>
    </div>
  );
}

function StarRating({ score, max = 10 }) {
  const filled = Math.round((score / max) * 5);
  return (
    <div style={{ display:'flex', gap:'2px' }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize:'14px', color: i<=filled?'#F5C518':'#e0e0e0' }}>★</span>)}
      <span style={{ fontSize:'11px', color:'#888', marginLeft:'4px' }}>{score}/10</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1a2332', border:'1px solid rgba(105,169,201,0.3)', borderRadius:'8px', padding:'10px 14px' }}>
      <p style={{ margin:'0 0 4px', fontSize:'12px', fontWeight:'700', color:'#69A9C9' }}>{label}</p>
      {payload.map((p,i) => <p key={i} style={{ margin:0, fontSize:'12px', color:'#fff' }}>{p.name}: <strong style={{color:p.color}}>{p.value}</strong></p>)}
    </div>
  );
};

export default function DonorView() {
  const [data, setData]         = useState(null);
  const [schools, setSchools]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef  = useRef(null);
  const mapRef     = useRef(null);
  const mapInstRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    Promise.all([api.get('/donor'), api.get('/schools')])
      .then(([d, s]) => { setData(d.data); setSchools(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Mini map — exact same approach as LiveMap.jsx ─────────────────────────
  useEffect(() => {
    if (!schools.length || !mapRef.current) return;

    // Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;

      if (!mapInstRef.current) {
        mapInstRef.current = L.map(mapRef.current, {
          center: [-1.4, 36.9],
          zoom: 9,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        // Same dark CartoDB tiles as LiveMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(mapInstRef.current);
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      schools.forEach(school => {
        const [lat, lng] = getCoords(school);
        const color = STATUS_COLORS[school.status] || '#888';
        const isCentre = school.type === 'community_centre';

        const icon = L.divIcon({
          html: `<div style="
            width:${isCentre?'14px':'12px'};height:${isCentre?'14px':'12px'};
            border-radius:${isCentre?'3px':'50%'};
            background:${color};border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;
          "></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstRef.current)
          .bindPopup(`
            <div style="font-family:'Segoe UI',sans-serif;min-width:180px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a2332;">${school.official_name}</p>
              <p style="margin:0 0 6px;font-size:11px;color:#888;">${school.club_id||'—'} · ${school.county}</p>
              <span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${color}20;color:${color};font-weight:600;">● ${school.status}</span>
              ${school.learner_count ? `<p style="margin:6px 0 0;font-size:11px;color:#555;">👩‍💻 ${school.learner_count} learners</p>` : ''}
            </div>
          `);

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
      const canvas = await html2canvas(reportRef.current, { scale:1.5, backgroundColor:'#f8f9fa', logging:false, useCORS:true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let y = 0;
      while (y < pdfH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH);
        y += pageH;
      }
      pdf.save(`Code_Club_Kenya_Donor_Impact_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title:'Code Club Kenya — Donor Impact Summary', text:'RPF 2026 Programme Impact Report', url:window.location.href });
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

  const growthChartData = (data.growth || []).map(g => ({
    month: g.month,
    'Schools': parseInt(g.cumulative_schools),
  }));

  return (
    <Layout title="Donor View" subtitle="Read-only · Shareable impact summary · RPF 2026">

      {/* Buttons */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginBottom:'16px' }}>
        <button style={styles.shareBtn} onClick={handleShare}>🔗 Share</button>
        <button style={{...styles.pdfBtn, opacity:exporting?0.7:1}} onClick={handleExportPDF} disabled={exporting}>
          {exporting ? '⏳ Generating PDF...' : '↓ Download PDF'}
        </button>
      </div>

      <div ref={reportRef}>

        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroLeft}>
            <p style={styles.heroTag}>EMPSERVE KENYA · RASPBERRY PI FOUNDATION · RPF 2026</p>
            <h1 style={styles.heroTitle}>Code Club Kenya</h1>
            <h2 style={styles.heroSub}>Donor Impact Summary</h2>
            <p style={styles.heroDesc}>Jan 2025 – Dec 2026 · Kiambu, Kajiado & Murang'a Counties · Live Programme Database</p>
            <div style={styles.heroStats}>
              {[
                { value:data.schools.total,                                  label:'Schools enrolled' },
                { value:parseInt(data.schools.learners||0).toLocaleString(), label:'Learners registered' },
                { value:data.teachers.total,                                 label:'Educators enrolled' },
                { value:data.teachers.safeguarded,                           label:'Safeguarding trained' },
                { value:data.mentors.active,                                 label:'Active mentors' },
                { value:data.schools.counties||3,                            label:'Counties covered' },
              ].map(stat => (
                <div key={stat.label} style={styles.heroStat}>
                  <p style={styles.heroStatValue}>{stat.value}</p>
                  <p style={styles.heroStatLabel}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.heroRight}>
            <div style={styles.heroCircle}>
              <p style={styles.heroCircleValue}>{parseInt(data.schools.learners||0).toLocaleString()}</p>
              <p style={styles.heroCircleLabel}>Learners</p>
              <p style={styles.heroCircleLabel}>Reached</p>
            </div>
          </div>
        </div>

        {/* Highlight Cards */}
        <div style={styles.highlightRow}>
          {[
            { icon:'🌍', value:'3',                                               label:'Counties active',       sub:'47 counties — national scale opportunity', color:'#69A9C9' },
            { icon:'📈', value:'76%',                                             label:'Club activation rate',  sub:'97 of 127 schools running sessions',       color:'#F7941D' },
            { icon:'🎓', value:parseInt(data.schools.learners||0).toLocaleString(), label:'Young coders reached', sub:'across 3 Kenyan counties',                 color:'#1eb457' },
            { icon:'⭐', value:data.starclubs.total,                              label:'Star Clubs',             sub:'top-performing clubs recognised',          color:'#F5C518' },
          ].map(c => (
            <div key={c.label} style={{...styles.highlightCard, borderLeft:`4px solid ${c.color}`}}>
              <p style={styles.highlightIcon}>{c.icon}</p>
              <p style={styles.highlightValue}>{c.value}</p>
              <p style={styles.highlightLabel}>{c.label}</p>
              <p style={styles.highlightSub}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Programme Health + Funded Scale */}
        <div style={styles.row}>
          <div style={{...styles.card, flex:2}}>
            <p style={styles.cardTitle}>Programme Health</p>
            <p style={styles.cardSub}>Active clubs vs total enrolled</p>
            <div style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'20px'}}>
              {[
                { label:'Active code clubs',              value:data.schools.active,       max:parseInt(data.schools.total)-parseInt(data.schools.centres), color:'#1eb457' },
                { label:'Educators safeguarding-trained', value:data.teachers.safeguarded, max:data.teachers.total,            color:'#69A9C9' },
                { label:'Pathways showcase-eligible',     value:data.pathways.completed,   max:Math.max(data.pathways.total,1), color:'#F7941D' },
                { label:'Community centres active',       value:data.schools.centres,      max:data.schools.centres,           color:'#9b59b6' },
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

          <div style={{...styles.card, flex:1}}>
            <p style={styles.cardTitle}>Funded Scale — Year 5 Vision</p>
            <p style={styles.cardSub}>Current vs target</p>
            <div style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'16px'}}>
              {[
                { label:'Schools (750 target)',     current:data.schools.total,                       target:750,   color:'#F7941D' },
                { label:'Learners (25,000 target)', current:parseInt(data.schools.learners||0),        target:25000, color:'#1eb457' },
                { label:'Educators (1,200 target)', current:data.teachers.total,                      target:1200,  color:'#69A9C9' },
                { label:'Counties (20+ target)',    current:3,                                         target:20,    color:'#9b59b6' },
              ].map(item => (
                <div key={item.label} style={{display:'flex', gap:'16px', alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <p style={{margin:'0 0 4px', fontSize:'13px', color:'#ccc'}}>{item.label}</p>
                    <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'999px', height:'6px'}}>
                      <div style={{width:`${Math.min(item.current/item.target*100,100)}%`, background:item.color, height:'6px', borderRadius:'999px'}} />
                    </div>
                  </div>
                  <p style={{margin:0, fontSize:'14px', fontWeight:'700', color:'#fff', minWidth:'70px', textAlign:'right'}}>
                    {typeof item.current==='number'&&item.current>1000?item.current.toLocaleString():item.current} now
                  </p>
                </div>
              ))}
            </div>
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

        {/* Mini Live Map + Growth Chart */}
        <div style={styles.row}>

          {/* Mini Map */}
          <div style={{flex:1.3, borderRadius:'12px', overflow:'hidden', position:'relative', minHeight:'380px', background:'#1a2332'}}>
            {/* Overlay legend */}
            <div style={{position:'absolute', top:'12px', left:'12px', zIndex:1000, background:'rgba(26,35,50,0.92)', borderRadius:'8px', padding:'10px 14px', backdropFilter:'blur(4px)'}}>
              <p style={{margin:'0 0 4px', fontSize:'13px', fontWeight:'700', color:'#fff'}}>🗺️ Geographic Reach</p>
              <p style={{margin:'0 0 8px', fontSize:'11px', color:'rgba(255,255,255,0.6)'}}>
                {schools.filter(s=>s.status==='active').length} active · {schools.length} schools mapped
              </p>
              <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                {[
                  {color:'#1eb457', label:'Active'},
                  {color:'#F7941D', label:'Not started'},
                  {color:'#69A9C9', label:'Centre'},
                ].map(l => (
                  <div key={l.label} style={{display:'flex', alignItems:'center', gap:'4px'}}>
                    <div style={{width:'8px', height:'8px', borderRadius:'50%', background:l.color}} />
                    <span style={{fontSize:'10px', color:'rgba(255,255,255,0.7)'}}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div ref={mapRef} style={{width:'100%', height:'380px'}} />
          </div>

          {/* Growth Chart */}
          <div style={{...styles.card, flex:1}}>
            <p style={styles.cardTitle}>📈 Programme Growth</p>
            <p style={styles.cardSub}>Cumulative schools enrolled over time</p>
            {growthChartData.length > 0 ? (
              <div style={{marginTop:'20px'}}>
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={growthChartData} margin={{top:5, right:10, left:0, bottom:5}}>
                    <defs>
                      <linearGradient id="schoolGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1eb457" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1eb457" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" tick={{fontSize:10, fill:'#8a96a3'}} />
                    <YAxis tick={{fontSize:10, fill:'#8a96a3'}} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Schools" name="Total Schools" stroke="#1eb457" strokeWidth={2} fill="url(#schoolGrad)" />
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

        {/* Star Clubs */}
        {data.starClubsList && data.starClubsList.length > 0 && (
          <div style={styles.whiteCard}>
            <p style={{...styles.wCardTitle}}>⭐ Star Clubs — Top Performing Schools</p>
            <p style={{fontSize:'12px', color:'#8a96a3', margin:'0 0 16px'}}>Recognised for excellence, active sessions, and learner achievement</p>
            <div style={{display:'grid', gridTemplateColumns:`repeat(${Math.min(data.starClubsList.length,5)},1fr)`, gap:'12px'}}>
              {data.starClubsList.map((club, i) => (
                <div key={i} style={{...styles.starCard, borderTop:`4px solid ${COUNTY_COLORS[club.county]||'#F5C518'}`}}>
                  <div style={styles.starBadge}>⭐ STAR CLUB</div>
                  <p style={styles.starName}>{club.school_name}</p>
                  <p style={styles.starCounty}>{club.county}</p>
                  <StarRating score={club.overall_score||0} />
                  <p style={styles.starCriteria}>{club.criteria_met}/4 criteria met</p>
                  {club.mentor_name && <p style={styles.starMentor}>👤 {club.mentor_name}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact Stories */}
        <div style={styles.whiteCard}>
          <p style={styles.wCardTitle}>💬 Voices from the Field</p>
          <p style={{fontSize:'12px', color:'#8a96a3', margin:'0 0 20px'}}>Real impact from educators, parents and community members</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px'}}>
            {IMPACT_STORIES.map((story, i) => (
              <div key={i} style={{...styles.storyCard, borderTop:`4px solid ${story.color}`}}>
                <p style={styles.storyQuote}>"{story.quote}"</p>
                <div style={styles.storyAuthor}>
                  <div style={{...styles.storyAvatar, background:story.color}}>
                    {story.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </div>
                  <div>
                    <p style={styles.storyName}>{story.name}</p>
                    <p style={styles.storyRole}>{story.role} · {story.county}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* County Breakdown */}
        <div style={styles.whiteCard}>
          <p style={styles.wCardTitle}>Schools & Learners by County</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginTop:'16px'}}>
            {data.counties.map(county => (
              <div key={county.county} style={{...styles.countyCard, borderTop:`4px solid ${COUNTY_COLORS[county.county]||'#888'}`}}>
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
                  <div style={{width:`${Math.round(county.active/Math.max(county.schools,1)*100)}%`, background:COUNTY_COLORS[county.county]||'#888', height:'8px', borderRadius:'999px'}} />
                </div>
                <p style={{margin:'6px 0 0', fontSize:'11px', color:'#8a96a3', textAlign:'right'}}>
                  {Math.round(county.active/Math.max(county.schools,1)*100)}% active
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Achievements */}
        <div style={styles.whiteCard}>
          <p style={styles.wCardTitle}>Key Programme Achievements</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginTop:'16px'}}>
            {[
              {icon:'🏫', value:data.schools.active,       label:'Active Code Clubs',     sub:'running weekly sessions',  color:'#1eb457'},
              {icon:'👩‍🏫', value:data.teachers.total,       label:'Trained Educators',     sub:'club leaders & teachers',  color:'#69A9C9'},
              {icon:'🛡️', value:data.teachers.safeguarded, label:'Safeguarding Certified', sub:'child protection trained', color:'#F7941D'},
              {icon:'⭐', value:data.starclubs.total,       label:'Star Clubs',             sub:'top performing clubs',     color:'#F5C518'},
            ].map(item => (
              <div key={item.label} style={{background:'#f8f9fa', borderRadius:'10px', padding:'20px', textAlign:'center', borderTop:`4px solid ${item.color}`}}>
                <p style={{fontSize:'32px', margin:'0 0 8px'}}>{item.icon}</p>
                <p style={{fontSize:'32px', fontWeight:'800', color:item.color, margin:'0 0 4px'}}>{item.value}</p>
                <p style={{fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px'}}>{item.label}</p>
                <p style={{fontSize:'11px', color:'#8a96a3', margin:0}}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div style={styles.ctaBanner}>
          <div>
            <p style={styles.ctaTitle}>Ready to scale Code Club Kenya nationally?</p>
            <p style={styles.ctaSub}>{data.schools.total} schools · {parseInt(data.schools.learners||0).toLocaleString()} learners · 3 counties · growing</p>
          </div>
          <div style={{display:'flex', gap:'12px', flexShrink:0}}>
            <a href="mailto:info@empserve.org" style={styles.ctaBtn}>📧 Contact EmpServe</a>
            <a href="https://www.raspberrypi.org/foundation/" target="_blank" rel="noreferrer"
              style={{...styles.ctaBtn, background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)'}}>
              🌐 RPF Website
            </a>
          </div>
        </div>

      </div>
    </Layout>
  );
}

const styles = {
  shareBtn: { padding:'8px 18px', borderRadius:'8px', border:'1.5px solid #69A9C9', background:'#fff', color:'#69A9C9', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  pdfBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  hero: { background:'linear-gradient(135deg, #1a2332 0%, #2c3e50 60%, #1a3a4a 100%)', borderRadius:'16px', padding:'36px', marginBottom:'20px', display:'flex', gap:'32px', alignItems:'center' },
  heroLeft: { flex:1 },
  heroTag: { fontSize:'10px', fontWeight:'700', color:'#69A9C9', letterSpacing:'1px', margin:'0 0 12px' },
  heroTitle: { fontSize:'36px', fontWeight:'800', color:'#fff', margin:'0 0 4px' },
  heroSub: { fontSize:'20px', fontWeight:'400', color:'#F7941D', margin:'0 0 8px' },
  heroDesc: { fontSize:'13px', color:'rgba(255,255,255,0.6)', margin:'0 0 24px' },
  heroStats: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'16px' },
  heroStat: { textAlign:'center', background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'12px 8px' },
  heroStatValue: { fontSize:'22px', fontWeight:'700', color:'#fff', margin:'0 0 4px' },
  heroStatLabel: { fontSize:'10px', color:'rgba(255,255,255,0.5)', margin:0, lineHeight:1.3 },
  heroRight: { flexShrink:0 },
  heroCircle: { width:'160px', height:'160px', borderRadius:'50%', background:'rgba(105,169,201,0.15)', border:'3px solid #69A9C9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' },
  heroCircleValue: { fontSize:'28px', fontWeight:'800', color:'#fff', margin:'0 0 4px' },
  heroCircleLabel: { fontSize:'12px', color:'#69A9C9', margin:0 },
  highlightRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px' },
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
  starCard: { background:'#f8f9fa', borderRadius:'10px', padding:'16px', textAlign:'center' },
  starBadge: { background:'#F5C518', color:'#1a2332', borderRadius:'999px', padding:'3px 10px', fontSize:'9px', fontWeight:'800', display:'inline-block', marginBottom:'10px' },
  starName: { fontSize:'13px', fontWeight:'600', color:'#1a2332', margin:'0 0 2px' },
  starCounty: { fontSize:'11px', color:'#8a96a3', margin:'0 0 6px' },
  starCriteria: { fontSize:'10px', color:'#8a96a3', margin:'4px 0 0' },
  starMentor: { fontSize:'10px', color:'#69A9C9', margin:'4px 0 0' },
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