// src/pages/LiveMap.jsx
import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// School coordinates for Kenya counties (approximate per area)
const AREA_COORDS = {
  // Kiambu areas
  'Githurai': [-1.2167, 36.9167],
  'Wendani': [-1.2000, 36.9000],
  'Kenyatta road': [-1.1167, 37.0167],
  'Kenyatta Road': [-1.1167, 37.0167],
  'Kahuro': [-0.9333, 36.9500],
  'Kahawa West': [-1.1833, 36.9333],
  'Kahawa west': [-1.1833, 36.9333],
  'Ruiru': [-1.1500, 36.9667],
  'Thika': [-1.0333, 37.0667],
  'Kiambu': [-1.1719, 36.8356],
  'Kikuyu': [-1.2467, 36.6617],
  'Limuru': [-1.1022, 36.6411],
  'Tigoni': [-1.0833, 36.7167],
  'Ngoigwa': [-1.0167, 37.0500],
  'Juja': [-1.1000, 37.0167],
  'Kiandutu': [-1.0500, 37.0833],
  'Mugutha': [-1.2000, 36.8000],

  // Kajiado areas
  'Kajiado': [-1.8500, 36.7833],
  'Kajiado Town': [-1.8500, 36.7833],
  'Ngong': [-1.3667, 36.6500],
  'Kitengela': [-1.4750, 36.9617],
  'Rongai': [-1.3944, 36.7458],
  'Kiserian': [-1.3833, 36.6833],
  'Isinya': [-1.9833, 36.9667],
  'Namanga': [-2.5500, 36.7833],
  'Loitokitok': [-2.9000, 37.5167],
  'Nkubu': [-0.2833, 37.8500],
  'Overall': [-1.4750, 36.9617],

  // Murang'a areas
  "Murang'a": [-0.7167, 37.1500],
  'Muranga': [-0.7167, 37.1500],
  'Muranga East': [-0.6833, 37.2000],
  'Murang\'a East': [-0.6833, 37.2000],
  'Kahuro': [-0.9333, 36.9500],
  'Kangema': [-0.7500, 36.9000],
  'Kigumo': [-0.8167, 37.0000],
  'Maragua': [-0.7333, 37.1333],
};

const COUNTY_CENTER = {
  'Kiambu': [-1.1719, 36.9356],
  'Kajiado': [-1.8500, 36.7833],
  "Murang'a": [-0.7167, 37.1500],
};

function getCoords(school) {
  // Try area first
  if (school.subcounty_area && AREA_COORDS[school.subcounty_area]) {
    const [lat, lng] = AREA_COORDS[school.subcounty_area];
    // Add small random offset so pins don't overlap
    return [lat + (Math.random() - 0.5) * 0.02, lng + (Math.random() - 0.5) * 0.02];
  }
  // Fall back to county center
  if (school.county && COUNTY_CENTER[school.county]) {
    const [lat, lng] = COUNTY_CENTER[school.county];
    return [lat + (Math.random() - 0.5) * 0.08, lng + (Math.random() - 0.5) * 0.08];
  }
  // Default Kenya center
  return [-1.2921 + (Math.random() - 0.5) * 0.1, 36.8219 + (Math.random() - 0.5) * 0.1];
}

const STATUS_COLORS_MAP = {
  'active': '#1eb457',
  'enrolled': '#F7941D',
  'inactive': '#e74c3c',
};

export default function LiveMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [schools, setSchools] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({ total:0, active:0, notStarted:0, centres:0 });

  useEffect(() => {
    Promise.all([api.get('/schools'), api.get('/flagalerts')])
      .then(([s, f]) => {
        setSchools(s.data);
        setFlags(f.data);
        setStats({
          total: s.data.length,
          active: s.data.filter(sc=>sc.status==='active').length,
          notStarted: s.data.filter(sc=>sc.status==='enrolled').length,
          centres: s.data.filter(sc=>sc.type==='community_centre').length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !mapRef.current) return;

    // Load Leaflet dynamically
    import('leaflet').then(L => {
      // Fix default icon
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Init map only once
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [-1.4, 36.9],
          zoom: 9,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Filter schools
      const filtered = schools.filter(s => {
        if (filterCounty && s.county !== filterCounty) return false;
        if (filterStatus && s.status !== filterStatus) return false;
        if (filterType && s.type !== filterType) return false;
        return true;
      });

      const openFlags = flags.filter(f => f.status === 'open');

      // Add markers
      filtered.forEach(school => {
        const [lat, lng] = getCoords(school);
        const color = STATUS_COLORS_MAP[school.status] || '#888';
        const hasFlag = openFlags.some(f => f.school_id === school.id);
        const isCentre = school.type === 'community_centre';

        // Custom HTML marker
        const markerHtml = `
          <div style="
            width: ${isCentre ? '16px' : '14px'};
            height: ${isCentre ? '16px' : '14px'};
            border-radius: ${isCentre ? '3px' : '50%'};
            background: ${hasFlag ? '#e74c3c' : color};
            border: 2px solid ${hasFlag ? '#c0392b' : 'white'};
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            ${hasFlag ? 'animation: pulse 1s infinite;' : ''}
          "></div>
          ${hasFlag ? '<div style="position:absolute;top:-8px;right:-8px;font-size:10px;">🚩</div>' : ''}
        `;

        const icon = L.divIcon({
          html: `<div style="position:relative;">${markerHtml}</div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="font-family:'Segoe UI',sans-serif; min-width:200px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a2332;">${school.official_name}</p>
              <p style="margin:0 0 8px;font-size:11px;color:#888;">${school.club_id||'—'} · ${school.county}</p>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                <span style="padding:2px 8px;border-radius:999px;font-size:11px;background:${color}20;color:${color};font-weight:600;">● ${school.status}</span>
                <span style="padding:2px 8px;border-radius:999px;font-size:11px;background:#f0f0f0;color:#555;">${school.type==='school'?'🏫 School':'🏢 Centre'}</span>
                ${hasFlag ? '<span style="padding:2px 8px;border-radius:999px;font-size:11px;background:#fdedec;color:#e74c3c;">🚩 Flagged</span>' : ''}
              </div>
              <table style="width:100%;font-size:12px;">
                <tr><td style="color:#888;padding:2px 0;">Mentor</td><td style="font-weight:500;">${school.mentor_name||'—'}</td></tr>
                <tr><td style="color:#888;padding:2px 0;">Club Leader</td><td style="font-weight:500;">${school.club_leader_name||'—'}</td></tr>
                <tr><td style="color:#888;padding:2px 0;">Learners</td><td style="font-weight:600;color:#1eb457;">${school.learner_count||0}</td></tr>
                <tr><td style="color:#888;padding:2px 0;">Area</td><td>${school.subcounty_area||'—'}</td></tr>
              </table>
            </div>
          `);

        marker.on('click', () => setSelected(school));
        markersRef.current.push(marker);
      });

      // Fit bounds if markers exist
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    });
  }, [schools, flags, loading, filterCounty, filterStatus, filterType]);

  // Leaflet CSS
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const filtered = schools.filter(s => {
    if (filterCounty && s.county !== filterCounty) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterType && s.type !== filterType) return false;
    return true;
  });

  return (
    <Layout title="Live Map" subtitle="All schools & centres plotted on map · RPF 2026">

      {/* Stats */}
      <div style={styles.stats}>
        {[
          { label:'Showing', value: filtered.length, color:'#69A9C9' },
          { label:'🟢 Active', value: filtered.filter(s=>s.status==='active').length, color:'#1eb457' },
          { label:'🟠 Not Started', value: filtered.filter(s=>s.status==='enrolled').length, color:'#F7941D' },
          { label:'🏢 Centres', value: filtered.filter(s=>s.type==='community_centre').length, color:'#9b59b6' },
          { label:'🚩 Flagged', value: flags.filter(f=>f.status==='open' && filtered.some(s=>s.id===f.school_id)).length, color:'#e74c3c' },
        ].map(s => (
          <div key={s.label} style={styles.statChip}>
            <span style={{...styles.statVal, color:s.color}}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <select style={styles.select} value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            <option value="Kiambu">Kiambu</option>
            <option value="Kajiado">Kajiado</option>
            <option value="Murang'a">Murang'a</option>
          </select>
          <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="enrolled">Not Started</option>
          </select>
          <select style={styles.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="school">Schools only</option>
            <option value="community_centre">Centres only</option>
          </select>
          {(filterCounty||filterStatus||filterType) && (
            <button style={styles.clearBtn} onClick={() => { setFilterCounty(''); setFilterStatus(''); setFilterType(''); }}>
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          {[
            { color:'#1eb457', label:'Active club', shape:'circle' },
            { color:'#F7941D', label:'Not started', shape:'circle' },
            { color:'#e74c3c', label:'Flagged', shape:'circle' },
            { color:'#69A9C9', label:'Community centre', shape:'square' },
          ].map(l => (
            <div key={l.label} style={styles.legendItem}>
              <div style={{
                width:'12px', height:'12px',
                borderRadius: l.shape==='circle' ? '50%' : '2px',
                background: l.color,
                border: '1.5px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
              <span style={styles.legendLabel}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div style={styles.mapWrapper}>
        {loading ? (
          <div style={styles.mapLoading}>
            <p style={{fontSize:'16px', color:'#888'}}>🗺️ Loading map data...</p>
          </div>
        ) : (
          <div ref={mapRef} style={styles.map} />
        )}

        {/* Selected school panel */}
        {selected && (
          <div style={styles.selectedPanel}>
            <div style={styles.selectedHeader}>
              <p style={styles.selectedName}>{selected.official_name}</p>
              <button style={styles.closeSelected} onClick={() => setSelected(null)}>✕</button>
            </div>
            <p style={styles.selectedMeta}>{selected.club_id||'—'} · {selected.county} · {selected.subcounty_area||'—'}</p>
            <div style={{display:'flex', gap:'6px', marginBottom:'10px', flexWrap:'wrap'}}>
              <span style={{...styles.chip, background: (STATUS_COLORS_MAP[selected.status]||'#888')+'20', color: STATUS_COLORS_MAP[selected.status]||'#888'}}>
                ● {selected.status}
              </span>
              <span style={{...styles.chip, background:'#f0f0f0', color:'#555'}}>
                {selected.type==='school'?'🏫 School':'🏢 Centre'}
              </span>
            </div>
            <table style={{width:'100%', fontSize:'13px'}}>
              {[
                ['Mentor', selected.mentor_name||'—'],
                ['Club Leader', selected.club_leader_name||'—'],
                ['Learners', selected.learner_count||0],
              ].map(([k,v]) => (
                <tr key={k}>
                  <td style={{color:'#888', padding:'4px 0', width:'90px'}}>{k}</td>
                  <td style={{fontWeight:'500', color:'#1a2332'}}>{v}</td>
                </tr>
              ))}
            </table>
          </div>
        )}
      </div>

      {/* School list below map */}
      <div style={styles.listCard}>
        <p style={styles.listTitle}>📍 {filtered.length} locations plotted</p>
        <div style={styles.listGrid}>
          {filtered.slice(0,12).map(school => (
            <div key={school.id} style={styles.listItem}
              onClick={() => setSelected(school)}>
              <div style={{...styles.dot, background: STATUS_COLORS_MAP[school.status]||'#888'}} />
              <div>
                <p style={styles.listName}>{school.official_name}</p>
                <p style={styles.listMeta}>{school.club_id||'—'} · {school.county}</p>
              </div>
            </div>
          ))}
          {filtered.length > 12 && (
            <div style={styles.listMore}>+{filtered.length-12} more on map</div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  stats: { display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap' },
  statChip: { background:'#fff', borderRadius:'8px', padding:'10px 16px', boxShadow:'0 2px 6px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'8px' },
  statVal: { fontSize:'20px', fontWeight:'700' },
  statLabel: { fontSize:'12px', color:'#888' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'10px' },
  filters: { display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' },
  select: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  legend: { display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' },
  legendItem: { display:'flex', alignItems:'center', gap:'6px' },
  legendLabel: { fontSize:'12px', color:'#555' },
  mapWrapper: { position:'relative', marginBottom:'20px' },
  map: { width:'100%', height:'520px', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.1)', zIndex:1 },
  mapLoading: { width:'100%', height:'520px', borderRadius:'12px', background:'#f5f7fa', display:'flex', alignItems:'center', justifyContent:'center' },
  selectedPanel: { position:'absolute', top:'16px', right:'16px', background:'#fff', borderRadius:'12px', padding:'16px', width:'260px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', zIndex:1000 },
  selectedHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'4px' },
  selectedName: { fontSize:'14px', fontWeight:'700', color:'#1a2332', margin:0, flex:1, lineHeight:1.3 },
  closeSelected: { background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#888', padding:'0', marginLeft:'8px' },
  selectedMeta: { fontSize:'11px', color:'#8a96a3', margin:'0 0 10px 0', fontFamily:'monospace' },
  chip: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600' },
  listCard: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  listTitle: { fontSize:'14px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px 0' },
  listGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'10px' },
  listItem: { display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#f8f9fa', borderRadius:'8px', cursor:'pointer', transition:'all 0.15s' },
  dot: { width:'10px', height:'10px', borderRadius:'50%', flexShrink:0 },
  listName: { margin:0, fontSize:'13px', fontWeight:'500', color:'#1a2332' },
  listMeta: { margin:0, fontSize:'11px', color:'#8a96a3', fontFamily:'monospace' },
  listMore: { display:'flex', alignItems:'center', justifyContent:'center', padding:'8px', background:'#f0f0f0', borderRadius:'8px', fontSize:'13px', color:'#888' },
};
