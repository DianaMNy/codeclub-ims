// src/pages/MandE.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useIsMobile } from '../hooks/useIsMobile';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const RATINGS    = ['Very Active','Active','Moderate','Low'];
const CONFIDENCE = ['Very Confident','Confident','Developing','Needs Support'];
const DAYS       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Multiple days'];
const LEVEL_LABELS = {
  l1: 'Level 1',
  l2: 'Level 2',
  l3: 'Level 3',
  optional_1: 'Optional Module 1',
  optional_2: 'Optional Module 2',
  optional_3: 'Optional Module 3',
};
const CLUB_LEADER_ROLES = ['club_leader','centre_club_leader','code_club_leader','centre_manager','additional','teacher'];

const sameId = (a, b) => String(a ?? '') === String(b ?? '');

const parseJsonValue = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
};

const normalisePathways = (data) => {
  const rows = Array.isArray(data)
    ? data
    : Object.entries(data || {}).map(([key, value]) => ({ id: key, key, ...value }));

  return rows.map(row => ({
    ...row,
    id: row.id ?? row.key,
    key: row.key ?? String(row.id ?? ''),
    label: row.label || row.name || row.key || 'Pathway',
    name: row.name || row.label || row.key || 'Pathway',
  }));
};

const getPathwayLevels = (pathway) => {
  if (!pathway) return [];
  const levelsArr = parseJsonValue(pathway.levelsArr, []);
  if (Array.isArray(levelsArr) && levelsArr.length) {
    return levelsArr.map(level => ({
      key: level.key || level.label,
      label: level.label || LEVEL_LABELS[level.key] || level.key,
      name: level.name || level.value || '',
    }));
  }

  const levels = parseJsonValue(pathway.levels, {});
  return Object.entries(levels || {}).map(([key, name]) => ({
    key,
    label: LEVEL_LABELS[key] || key,
    name,
  }));
};

const getPathwayProjects = (pathway) => {
  if (!pathway) return [];
  const projectsArr = parseJsonValue(pathway.projectsArr, []);
  const projects = Array.isArray(projectsArr) && projectsArr.length
    ? projectsArr
    : parseJsonValue(pathway.projects, []);

  return (Array.isArray(projects) ? projects : []).map((project, index) => {
    if (typeof project === 'string') return { id: project, name: project };
    return {
      id: project.id || project.key || project.name || String(index),
      name: project.name || project.label || project.title || String(project),
    };
  });
};

const fetchPathwayOptions = async () => {
  const sources = [
    () => api.get('/visits/pathways-with-projects'),
    () => api.get('/pathways/syllabus'),
    () => api.get('/pathways/structure'),
  ];

  for (const source of sources) {
    try {
      const result = await source();
      const pathways = normalisePathways(result.data);
      if (pathways.length) return pathways;
    } catch (err) {
      console.warn('Pathway lookup failed:', err.response?.data?.error || err.message);
    }
  }

  return [];
};

const INIT = {
  school_id:'', teacher_id:'', date_of_visit:new Date().toISOString().split('T')[0],
  engagement_type:'Physical Visit', latitude:'', longitude:'',
  club_running:'yes', not_running_reason:'', activation_actions:'',
  club_day:'', time_band:'', device_count:'', total_learners:'',
  male_learners:'', female_learners:'', engagement_rating:'',
  pathway_id:'', scratch_level:'', creating_projects:'no',
  project_name:'', project_notes:'', observations:'', phone_call_notes:'',
  challenges:'', club_leader_confidence:'', actions_agreed:'',
  recommended_star_club:'no', star_club_reason:'',
  flag_school:'no', flag_reason:'', next_visit_date:'', other_details:'',
  showcase_status: 'in_progress', showcase_photo: null,
};

const AUDIT_INIT = {
  school_id: '',
  audit_date: new Date().toISOString().split('T')[0],
  device_type: '',
  custom_device_type: '',
  total_devices: '',
  functioning_devices: '',
  faulty_devices: '',
  comments: '',
};

const DEVICE_TYPE_OPTIONS = ['Desktops', 'Laptops', 'Projectors', 'Tablets', 'Phones', 'Other'];

export default function MandE() {
  const isMobile = useIsMobile();
  const [tab, setTab]             = useState('observations');
  const [schools, setSchools]     = useState([]);
  const [visits, setVisits]       = useState([]);
  const [pathways, setPathways]   = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [deviceAudits, setDeviceAudits] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [view, setView]           = useState('list'); // 'list' | 'form' | 'history'
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({ ...INIT });
  const [saving, setSaving]       = useState(false);
  const [auditSaving, setAuditSaving] = useState(false);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [auditEditId, setAuditEditId] = useState(null);
  const [auditForm, setAuditForm] = useState({ ...AUDIT_INIT });
  const [historySchool, setHistorySchool] = useState(null);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [filterSchool, setFilterSchool]   = useState('');
  const [auditFilterSchool, setAuditFilterSchool] = useState('');
  const [search, setSearch]               = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setAuditLoading(true);
    try {
      const [s, v, t, p, a] = await Promise.allSettled([
        api.get('/schools'),
        api.get('/visits'),
        api.get('/teachers'),
        fetchPathwayOptions(),
        api.get('/device-audits'),
      ]);
      if (s.status === 'fulfilled') setSchools(Array.isArray(s.value.data) ? s.value.data : []);
      else console.error('Failed to load schools:', s.reason);

      if (v.status === 'fulfilled') setVisits(Array.isArray(v.value.data) ? v.value.data : []);
      else console.error('Failed to load visits:', v.reason);

      if (t.status === 'fulfilled') setTeachers(Array.isArray(t.value.data) ? t.value.data : []);
      else console.error('Failed to load teachers:', t.reason);

      if (p.status === 'fulfilled') setPathways(p.value);
      else console.error('Failed to load pathways:', p.reason);

      if (a.status === 'fulfilled') setDeviceAudits(Array.isArray(a.value.data) ? a.value.data : []);
      else console.error('Failed to load device audits:', a.reason);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setAuditLoading(false); }
  };

  // Single update function — key to preventing re-render issues
  const upd = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const selPathway = pathways.find(p => sameId(p.id, form.pathway_id) || sameId(p.key, form.pathway_id));
  const selectedPathwayLevels = getPathwayLevels(selPathway);
  const selectedPathwayProjects = getPathwayProjects(selPathway);

  const visitCountForSchool = visits.filter(v => sameId(v.school_id, form.school_id)).length;

  const openAdd = () => {
    setForm({ ...INIT, date_of_visit: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setView('form');
  };

  const openEdit = (v) => {
    setForm({
      school_id: v.school_id ? String(v.school_id) : '', teacher_id: v.teacher_id ? String(v.teacher_id) : '',
      date_of_visit: v.date_of_visit?.split('T')[0]||'',
      engagement_type: v.engagement_type||'Physical Visit',
      latitude: v.latitude||'', longitude: v.longitude||'',
      club_running: v.club_running ? 'yes' : 'no',
      not_running_reason: v.not_running_reason||'',
      activation_actions: v.activation_actions||'',
      club_day: v.club_day||'', time_band: v.time_band||'',
      device_count: v.device_count||'', total_learners: v.total_learners||'',
      male_learners: v.male_learners||'', female_learners: v.female_learners||'',
      engagement_rating: v.engagement_rating||'',
      pathway_id: v.pathway_id ? String(v.pathway_id) : (v.pathway || ''), scratch_level: v.scratch_level||'',
      creating_projects: v.creating_projects ? 'yes' : 'no',
      project_name: v.project_id||'', project_notes: v.project_notes||'',
      observations: v.observations||'', phone_call_notes: v.phone_call_notes||'',
      challenges: v.challenges||'', club_leader_confidence: v.club_leader_confidence||'',
      actions_agreed: v.actions_agreed||'',
      recommended_star_club: v.recommended_star_club ? 'yes' : 'no',
      star_club_reason: v.star_club_reason||'',
      flag_school: v.flag_school ? 'yes' : 'no',
      flag_reason: v.flag_reason||'',
      next_visit_date: v.next_visit_date?.split('T')[0]||'',
      other_details: v.other_details||'',
      showcase_status: 'in_progress',
      showcase_photo: null,
    });
    setEditId(v.id);
    setView('form');
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return alert('GPS not supported on this device');
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({
        ...f,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      })),
      err => alert('GPS error: ' + err.message)
    );
  };

  const handleSave = async () => {
    if (!form.school_id) return alert('Please select a school or centre');
    if (!form.date_of_visit) return alert('Date of visit is required');
    setSaving(true);
    const payload = {
      ...form,
      teacher_id: form.teacher_id || null,
      club_running: form.club_running === 'yes',
      creating_projects: form.creating_projects === 'yes',
      recommended_star_club: form.recommended_star_club === 'yes',
      flag_school: form.flag_school === 'yes',
      project_id: form.project_name || null,
    };
    try {
      if (editId) { await api.put(`/visits/${editId}`, payload); }
      else { await api.post('/visits', payload); }
      setView('list');
      loadData();
    } catch(e) { alert(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this observation?')) return;
    try { await api.delete(`/visits/${id}`); loadData(); }
    catch { alert('Failed to delete'); }
  };

  const openAuditAdd = () => {
    setAuditEditId(null);
    setAuditForm({ ...AUDIT_INIT, audit_date: new Date().toISOString().split('T')[0] });
    setShowAuditForm(true);
  };

  const openAuditEdit = (audit) => {
    const knownDeviceType = DEVICE_TYPE_OPTIONS.includes(audit.device_type);
    setAuditEditId(audit.id);
    setAuditForm({
      school_id: audit.school_id ? String(audit.school_id) : '',
      audit_date: audit.audit_date ? audit.audit_date.split('T')[0] : '',
      device_type: knownDeviceType ? audit.device_type : (audit.device_type ? 'Other' : ''),
      custom_device_type: knownDeviceType ? '' : (audit.device_type || ''),
      total_devices: audit.total_devices ?? '',
      functioning_devices: audit.functioning_devices ?? '',
      faulty_devices: audit.faulty_devices ?? '',
      comments: audit.comments || '',
    });
    setShowAuditForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeAuditForm = () => {
    setShowAuditForm(false);
    setAuditEditId(null);
    setAuditForm({ ...AUDIT_INIT, audit_date: new Date().toISOString().split('T')[0] });
  };

  const handleAuditSave = async () => {
    if (!auditForm.school_id) return alert('Please select a school or centre');
    const deviceType = auditForm.device_type === 'Other'
      ? auditForm.custom_device_type.trim()
      : auditForm.device_type.trim();
    if (!deviceType) return alert('Device type is required');
    const total = parseInt(auditForm.total_devices, 10) || 0;
    const functioning = parseInt(auditForm.functioning_devices, 10) || 0;
    const faulty = parseInt(auditForm.faulty_devices, 10) || 0;
    if (functioning + faulty > total) return alert('Functioning plus faulty devices cannot be more than total devices');

    setAuditSaving(true);
    try {
      const { custom_device_type, ...rest } = auditForm;
      const payload = { ...rest, device_type: deviceType, total_devices: total, functioning_devices: functioning, faulty_devices: faulty };
      if (auditEditId) await api.put(`/device-audits/${auditEditId}`, payload);
      else await api.post('/device-audits', payload);
      closeAuditForm();
      await loadData();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setAuditSaving(false);
    }
  };

  const handleAuditDelete = async (id, schoolName) => {
    if (!confirm(`Delete this device audit for "${schoolName || 'this school'}"?`)) return;
    try {
      await api.delete(`/device-audits/${id}`);
      await loadData();
    } catch {
      alert('Failed to delete device audit');
    }
  };

  const openHistory = async (school) => {
    setHistorySchool(school);
    try {
      const r = await api.get(`/visits/school/${school.id}`);
      setHistoryVisits(r.data);
    } catch { setHistoryVisits([]); }
    setView('history');
  };

  const filtered = visits.filter(v => {
    if (filterSchool && !sameId(v.school_id, filterSchool)) return false;
    if (search && !v.school_name?.toLowerCase().includes(search.toLowerCase()) &&
        !v.mentor_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredAudits = deviceAudits.filter(a => {
    if (auditFilterSchool && !sameId(a.school_id, auditFilterSchool)) return false;
    const query = auditSearch.toLowerCase();
    if (query &&
      !a.school_name?.toLowerCase().includes(query) &&
      !a.device_type?.toLowerCase().includes(query) &&
      !a.club_id?.toLowerCase().includes(query)) return false;
    return true;
  });

  const selectedAuditSchool = schools.find(s => sameId(s.id, auditForm.school_id));

  const TV=visits.length, PV=visits.filter(v=>v.engagement_type==='Physical Visit').length;
  const CR=visits.filter(v=>v.club_running).length;
  const FL=visits.filter(v=>v.flag_school||!v.club_running).length;
  const TL=visits.reduce((s,v)=>s+(parseInt(v.total_learners)||0),0);
  const DA=deviceAudits.length;
  const DT=deviceAudits.reduce((s,a)=>s+(parseInt(a.total_devices)||0),0);
  const DF=deviceAudits.reduce((s,a)=>s+(parseInt(a.functioning_devices)||0),0);
  const DB=deviceAudits.reduce((s,a)=>s+(parseInt(a.faulty_devices)||0),0);
  const deviceTypeStats = Object.values(deviceAudits.reduce((acc, audit) => {
    const type = audit.device_type || 'Other';
    if (!acc[type]) acc[type] = { type, records:0, total:0, functioning:0, faulty:0 };
    acc[type].records += 1;
    acc[type].total += parseInt(audit.total_devices) || 0;
    acc[type].functioning += parseInt(audit.functioning_devices) || 0;
    acc[type].faulty += parseInt(audit.faulty_devices) || 0;
    return acc;
  }, {})).sort((a,b)=>b.total-a.total);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inp = { width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'16px', color:'#333', outline:'none', boxSizing:'border-box', background:'#fff', minHeight:'48px' };
  const lbl = { fontSize:'14px', fontWeight:'600', color:'#444', display:'block', marginBottom:'6px' };
  const sec = { fontSize:'15px', fontWeight:'700', color:'#1a2332', background:'#f0f7ff', padding:'10px 16px', borderRadius:'8px', marginTop:'24px', marginBottom:'16px', borderLeft:'4px solid #1eb457' };
  const row = { marginBottom:'16px' };
  const row2 = { display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'16px', marginBottom:'16px' };
  const bdt = { padding:'14px 20px', borderRadius:'10px', border:'none', fontSize:'15px', fontWeight:'600', cursor:'pointer', width:'100%', minHeight:'48px' };
  const bdg = (bg,cl,txt) => <span style={{display:'inline-block',padding:'3px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'600',background:bg,color:cl,whiteSpace:'nowrap'}}>{txt}</span>;

  // ── HISTORY VIEW ─────────────────────────────────────────────────────────────
  if (view === 'history') return (
    <Layout title="M & E" subtitle="Visit History">
      <button style={{...bdt,background:'#f0f0f0',color:'#333',width:'auto',padding:'10px 20px',marginBottom:'20px'}}
        onClick={()=>setView('list')}>← Back to observations</button>
      <h2 style={{margin:'0 0 4px',color:'#1a2332'}}>{historySchool?.official_name}</h2>
      <p style={{margin:'0 0 24px',color:'#8a96a3'}}>{historyVisits.length} visits recorded</p>
      {historyVisits.length === 0
        ? <p style={{color:'#888',textAlign:'center',padding:'40px'}}>No visits recorded yet.</p>
        : historyVisits.map(v => (
          <div key={v.id} style={{background:'#fff',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',flexWrap:'wrap'}}>
              <span style={{background:'#1eb457',color:'#fff',padding:'4px 14px',borderRadius:'999px',fontWeight:'700',fontSize:'14px'}}>Visit {v.visit_number}</span>
              <span style={{color:'#555',fontSize:'14px'}}>{v.date_of_visit ? new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
              {bdg(v.club_running?'#eafaf1':'#fdedec',v.club_running?'#1a8a4a':'#e74c3c',v.club_running?'✅ Running':'❌ Not running')}
              {bdg(v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad',v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'8px',fontSize:'14px',color:'#555',marginBottom:'12px'}}>
              <div><b>Mentor:</b> {v.mentor_name||'—'}</div>
              <div><b>Learners:</b> {v.total_learners||0} ({v.male_learners||0}M/{v.female_learners||0}F)</div>
              <div><b>Engagement:</b> {v.engagement_rating||'—'}</div>
              <div><b>Pathway:</b> {v.pathway_name||'—'}</div>
              <div><b>Level:</b> {v.scratch_level||'—'}</div>
              <div><b>Confidence:</b> {v.club_leader_confidence||'—'}</div>
              <div><b>Devices:</b> {v.device_count||0}</div>
            </div>
            {v.observations && <div style={{background:'#f8f9fa',padding:'10px',borderRadius:'8px',fontSize:'14px',color:'#555',marginBottom:'8px'}}><b>Observations:</b> {v.observations}</div>}
            {v.challenges && <div style={{background:'#f8f9fa',padding:'10px',borderRadius:'8px',fontSize:'14px',color:'#555',marginBottom:'8px'}}><b>Challenges:</b> {v.challenges}</div>}
            {v.actions_agreed && <div style={{background:'#f8f9fa',padding:'10px',borderRadius:'8px',fontSize:'14px',color:'#555',marginBottom:'8px'}}><b>Actions:</b> {v.actions_agreed}</div>}
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {v.recommended_star_club && bdg('#fef9e7','#a0720a','⭐ Star Club')}
              {v.flag_school && bdg('#fdedec','#e74c3c','🚩 Flagged')}
              {v.next_visit_date && bdg('#e8f4fd','#2980b9',`📅 Next: ${new Date(v.next_visit_date).toLocaleDateString('en-GB')}`)}
            </div>
          </div>
        ))
      }
    </Layout>
  );

  // ── FORM VIEW ─────────────────────────────────────────────────────────────────
  if (view === 'form') return (
    <Layout title="M & E" subtitle={editId ? 'Edit Observation' : 'New Session Observation'}>
      <div style={{maxWidth:'700px',margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <h2 style={{margin:0,fontSize:'20px',fontWeight:'700',color:'#1a2332'}}>
            {editId ? '✏️ Edit Observation' : '📝 New Session Observation'}
          </h2>
          <button style={{padding:'8px 16px',borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',fontSize:'14px',cursor:'pointer'}}
            onClick={()=>setView('list')}>✕ Cancel</button>
        </div>

        {/* S1 — Identity */}
        <div style={sec}>🏷️ Section 1 — Visit Identity</div>

        <div style={row}>
          <label style={lbl}>School / Community Centre *</label>
          <select style={inp} value={form.school_id} onChange={e => {
            const schoolId = e.target.value;
            // Auto-populate teacher from school's club leader
            const clubLeader = teachers.find(t => sameId(t.school_id, schoolId) && CLUB_LEADER_ROLES.includes(t.role));
            setForm(f => ({
              ...f,
              school_id: schoolId,
              teacher_id: clubLeader?.id ? String(clubLeader.id) : '',
            }));
          }}>
            <option value="">— Select school or centre —</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>
                {s.official_name} ({s.club_id}) — {s.county} — {s.type === 'community_centre' ? '🏢 Centre' : '🏫 School'}
              </option>
            ))}
          </select>
          {form.school_id && (() => {
            const school = schools.find(s => sameId(s.id, form.school_id));
            return (
              <div style={{marginTop:'6px', fontSize:'13px', color:'#1eb457', fontWeight:'600'}}>
                📍 Visit #{visitCountForSchool + 1}
                {school?.mentor_name && ` · 👤 Mentor: ${school.mentor_name}`}
              </div>
            );
          })()}
        </div>

        <div style={row}>
          <label style={lbl}>Club Leader / Centre Club Leader</label>
          <select style={inp} value={form.teacher_id} onChange={upd('teacher_id')}>
            <option value="">— Select club leader —</option>
            {teachers
              .filter(t => CLUB_LEADER_ROLES.includes(t.role))
              .filter(t => !form.school_id || sameId(t.school_id, form.school_id))
              .map(t => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role === 'club_leader' ? 'Club Leader' : t.role === 'centre_club_leader' ? 'Centre Club Leader' : 'Additional'})
                </option>
              ))
            }
          </select>
        </div>

        <div style={row2}>
          <div>
            <label style={lbl}>Date of Visit *</label>
            <input style={inp} type="date" value={form.date_of_visit} onChange={upd('date_of_visit')}/>
          </div>
          <div>
            <label style={lbl}>Mentor</label>
            <input style={{...inp,background:'#f8f9fa',color:'#888'}} value={user.full_name||'Current Mentor'} readOnly/>
          </div>
        </div>

        {/* S2 — Location */}
        <div style={sec}>📍 Section 2 — Location & Engagement</div>

        <div style={row2}>
          <div>
            <label style={lbl}>Type of Engagement *</label>
            <select style={inp} value={form.engagement_type} onChange={upd('engagement_type')}>
              <option value="Physical Visit">🏫 Physical Visit</option>
              <option value="Phone Call">📞 Phone Call</option>
            </select>
          </div>
          <div>
            <label style={lbl}>GPS Location</label>
            <button style={{...inp,background:form.latitude?'#eafaf1':'#f8f9fa',color:form.latitude?'#1a8a4a':'#555',cursor:'pointer',textAlign:'left'}}
              onClick={captureGPS}>
              {form.latitude && form.longitude
                ? `📡 ${parseFloat(form.latitude).toFixed(5)}, ${parseFloat(form.longitude).toFixed(5)}`
                : '📡 Tap to capture GPS location'}
            </button>
          </div>
        </div>

        <div style={row}>
          <label style={lbl}>Has the club started?</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {['yes','no'].map(v=>(
              <button key={v} style={{...bdt,background:form.club_running===v?'#1eb457':'#f8f9fa',color:form.club_running===v?'#fff':'#555',border:`2px solid ${form.club_running===v?'#1eb457':'#e2e8f0'}`}}
                onClick={()=>setForm(f=>({...f,club_running:v}))}>
                {v==='yes'?'✅ Yes — Running':'❌ No — Not running'}
              </button>
            ))}
          </div>
        </div>

        {form.club_running === 'no' && (<>
          <div style={row}>
            <label style={lbl}>Main reason club not running</label>
            <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.not_running_reason} onChange={upd('not_running_reason')} placeholder="What is the main reason the club is not running?"/>
          </div>
          <div style={row}>
            <label style={lbl}>Actions to activate the club</label>
            <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.activation_actions} onChange={upd('activation_actions')} placeholder="What steps will activate the club?"/>
          </div>
        </>)}

        {/* S3 — Schedule */}
        <div style={sec}>🗓️ Section 3 — Session Schedule</div>
        <div style={row2}>
          <div>
            <label style={lbl}>Day Code Club is conducted</label>
            <select style={inp} value={form.club_day} onChange={upd('club_day')}>
              <option value="">— Select day —</option>
              {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Time band</label>
            <input style={inp} value={form.time_band} onChange={upd('time_band')} placeholder="e.g. 2PM - 4PM"/>
          </div>
        </div>

        {/* S4 — Learners */}
        <div style={sec}>👥 Section 4 — Learners</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginBottom:'16px'}}>
          <div>
            <label style={lbl}>Total learners</label>
            <input style={inp} type="number" value={form.total_learners} onChange={upd('total_learners')} placeholder="0"/>
          </div>
          <div>
            <label style={lbl}>Male learners</label>
            <input style={inp} type="number" value={form.male_learners} onChange={upd('male_learners')} placeholder="0"/>
          </div>
          <div>
            <label style={lbl}>Female learners</label>
            <input style={inp} type="number" value={form.female_learners} onChange={upd('female_learners')} placeholder="0"/>
          </div>
          <div>
            <label style={lbl}>Learner engagement rating</label>
            <select style={inp} value={form.engagement_rating} onChange={upd('engagement_rating')}>
              <option value="">— Select rating —</option>
              {RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* S5 — Learning */}
        <div style={sec}>📚 Section 5 — Learning Progress</div>
        <div style={row}>
          <label style={lbl}>Pathway being followed</label>
          <select style={inp} value={form.pathway_id} onChange={e=>setForm(f=>({...f,pathway_id:e.target.value,scratch_level:'',project_name:''}))}>
            <option value="">— Select pathway —</option>
            {pathways.map(p=>(
              <option key={p.id || p.key} value={p.id || p.key}>
                {p.icon} {p.label || p.name}
              </option>
            ))}
          </select>
        </div>
        <div style={row}>
          <label style={lbl}>What Scratch level have learners reached?</label>
          <select style={inp} value={form.scratch_level} onChange={upd('scratch_level')} disabled={!form.pathway_id}>
            <option value="">— {form.pathway_id?'Select level':'Select pathway first'} —</option>
            {selectedPathwayLevels.map(level => (
              <option key={level.key} value={level.label}>
                {level.label} — {level.name}
              </option>
            ))}
          </select>
        </div>
        <div style={row}>
          <label style={lbl}>Are learners creating individual/peer projects?</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {['yes','no'].map(v=>(
              <button key={v} style={{...bdt,background:form.creating_projects===v?'#1eb457':'#f8f9fa',color:form.creating_projects===v?'#fff':'#555',border:`2px solid ${form.creating_projects===v?'#1eb457':'#e2e8f0'}`}}
                onClick={()=>setForm(f=>({...f,creating_projects:v}))}>
                {v==='yes'?'✅ Yes — Creating projects':'❌ Not yet'}
              </button>
            ))}
          </div>
        </div>
        {form.creating_projects === 'yes' && (<>
          <div style={row}>
            <label style={lbl}>Which project?</label>
            <select style={inp} value={form.project_name} onChange={upd('project_name')}>
              <option value="">— Select project —</option>
              {selectedPathwayProjects.map(project => (
                <option key={project.id} value={project.name}>{project.name}</option>
              ))}
              <option value="Other">Other / Not listed</option>
            </select>
          </div>
          <div style={row}>
            <label style={lbl}>Project notes / description</label>
            <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.project_notes} onChange={upd('project_notes')} placeholder="Describe the project..."/>
          </div>

          {/* Showcase mini form */}
          <div style={{marginTop:'16px', background:'#f5eef8', borderRadius:'10px', padding:'16px', border:'1px solid #d7bde2'}}>
            <p style={{margin:'0 0 14px 0', fontSize:'15px', fontWeight:'700', color:'#7d3c98'}}>🚀 Submit to Projects Showcase</p>

            <p style={{margin:'0 0 8px 0', fontSize:'15px', fontWeight:'600', color:'#555'}}>Project status</p>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px'}}>
              {[['in_progress','🔄 In Progress'],['completed','✅ Completed']].map(([val, label]) => (
                <button key={val} onClick={() => setForm(f => ({...f, showcase_status:val}))}
                  style={{minHeight:'48px', fontSize:'16px', width:'100%', borderRadius:'8px',
                    border:`2px solid ${form.showcase_status===val ? (val==='completed'?'#1eb457':'#F7941D') : '#d7bde2'}`,
                    background: form.showcase_status===val ? (val==='completed'?'#eafaf1':'#fff5e6') : '#fff',
                    color: form.showcase_status===val ? (val==='completed'?'#1a8a4a':'#a0720a') : '#888',
                    cursor:'pointer', fontWeight:'600'}}>
                  {label}
                </button>
              ))}
            </div>

            <p style={{margin:'0 0 8px 0', fontSize:'15px', fontWeight:'600', color:'#555'}}>Project photo</p>
            {!form.showcase_photo ? (
              <label style={{display:'block', width:'100%', minHeight:'48px', fontSize:'16px',
                background:'#f8f9fa', border:'2px dashed #9b59b6', borderRadius:'10px',
                cursor:'pointer', padding:'16px', textAlign:'center',
                color:'#7d3c98', boxSizing:'border-box'}}>
                📷 Add project photo (optional)
                <input type="file" accept="image/*" style={{display:'none'}} onChange={e => {
                  const file = e.target.files[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setForm(f => ({...f, showcase_photo:reader.result}));
                  reader.readAsDataURL(file);
                }} />
              </label>
            ) : (
              <div style={{position:'relative'}}>
                <img src={form.showcase_photo} alt="Project" style={{width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'10px', marginTop:'10px', display:'block'}} />
                <button onClick={() => setForm(f => ({...f, showcase_photo:null}))}
                  style={{position:'absolute', top:'18px', right:'8px', background:'#e74c3c', border:'none', color:'#fff', borderRadius:'50%', width:'28px', height:'28px', fontSize:'14px', cursor:'pointer', lineHeight:'28px', textAlign:'center', padding:0}}>×</button>
              </div>
            )}

            <p style={{margin:'12px 0 0 0', fontSize:'12px', color:'#888', fontStyle:'italic'}}>
              This will appear in the Projects Showcase automatically when you submit the observation
            </p>
          </div>
        </>)}

        {/* S6 — Observations */}
        <div style={sec}>👁️ Section 6 — Observations</div>
        <div style={row}>
          <label style={lbl}>What was done / observations during the session?</label>
          <textarea style={{...inp,height:'100px',resize:'vertical'}} value={form.observations} onChange={upd('observations')} placeholder="Describe what happened during the session..."/>
        </div>
        <div style={row}>
          <label style={lbl}>If phone call — what was discussed?</label>
          <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.phone_call_notes} onChange={upd('phone_call_notes')} placeholder="What was discussed during the call..."/>
        </div>
        <div style={row}>
          <label style={lbl}>Challenges observed / faced</label>
          <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.challenges} onChange={upd('challenges')} placeholder="Any challenges or obstacles..."/>
        </div>
        <div style={row}>
          <label style={lbl}>Club leader's confidence level</label>
          <select style={inp} value={form.club_leader_confidence} onChange={upd('club_leader_confidence')}>
            <option value="">— Select confidence level —</option>
            {CONFIDENCE.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* S7 — Actions */}
        <div style={sec}>⚡ Section 7 — Actions & Follow-up</div>
        <div style={row}>
          <label style={lbl}>Actions agreed / intended for this visit</label>
          <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.actions_agreed} onChange={upd('actions_agreed')} placeholder="What actions were agreed upon this visit?"/>
        </div>
        <div style={row}>
          <label style={lbl}>Next visit date</label>
          <input style={inp} type="date" value={form.next_visit_date} onChange={upd('next_visit_date')}/>
        </div>
        <div style={row}>
          <label style={lbl}>Recommend for Star Club?</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {['yes','no'].map(v=>(
              <button key={v} style={{...bdt,background:form.recommended_star_club===v?'#F5C518':'#f8f9fa',color:form.recommended_star_club===v?'#fff':'#555',border:`2px solid ${form.recommended_star_club===v?'#F5C518':'#e2e8f0'}`}}
                onClick={()=>setForm(f=>({...f,recommended_star_club:v}))}>
                {v==='yes'?'⭐ Yes — Recommend':'Not recommended'}
              </button>
            ))}
          </div>
        </div>
        {form.recommended_star_club === 'yes' && (
          <div style={row}>
            <label style={lbl}>Why recommend for Star Club?</label>
            <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.star_club_reason} onChange={upd('star_club_reason')} placeholder="Reason for Star Club nomination..."/>
          </div>
        )}
        <div style={row}>
          <label style={lbl}>Flag this school / centre?</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {['yes','no'].map(v=>(
              <button key={v} style={{...bdt,background:form.flag_school===v?'#e74c3c':'#f8f9fa',color:form.flag_school===v?'#fff':'#555',border:`2px solid ${form.flag_school===v?'#e74c3c':'#e2e8f0'}`}}
                onClick={()=>setForm(f=>({...f,flag_school:v}))}>
                {v==='yes'?'🚩 Yes — Flag this club':'✅ No flag needed'}
              </button>
            ))}
          </div>
        </div>
        {form.flag_school === 'yes' && (
          <div style={row}>
            <label style={lbl}>Flag reason</label>
            <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.flag_reason} onChange={upd('flag_reason')} placeholder="Reason for flagging..."/>
          </div>
        )}

        {/* S8 — Other */}
        <div style={sec}>📝 Section 8 — Other Details</div>
        <div style={row}>
          <label style={lbl}>Any other details to capture</label>
          <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.other_details} onChange={upd('other_details')} placeholder="Any additional information..."/>
        </div>

        {/* Auto-populate notice */}
        {(form.recommended_star_club==='yes'||form.flag_school==='yes'||form.club_running==='no'||(form.school_id&&form.club_running==='yes')||form.pathway_id)&&(
          <div style={{background:'#f0f7ff',borderRadius:'10px',padding:'14px 16px',margin:'20px 0',border:'1px solid #d0e8ff'}}>
            <p style={{margin:'0 0 8px',fontWeight:'700',fontSize:'14px',color:'#2980b9'}}>⚡ On submit, this will auto-populate:</p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {form.school_id&&form.club_running==='yes'&&<span style={{padding:'4px 12px',borderRadius:'999px',fontSize:'13px',fontWeight:'600',background:'#eafaf1',color:'#1a8a4a'}}>🏫 Schools & Centres</span>}
              {form.recommended_star_club==='yes'&&<span style={{padding:'4px 12px',borderRadius:'999px',fontSize:'13px',fontWeight:'600',background:'#fef9e7',color:'#a0720a'}}>⭐ Star Club</span>}
              {(form.flag_school==='yes'||form.club_running==='no')&&<span style={{padding:'4px 12px',borderRadius:'999px',fontSize:'13px',fontWeight:'600',background:'#fdedec',color:'#e74c3c'}}>🚩 Flags & Alerts</span>}
              {form.pathway_id&&<span style={{padding:'4px 12px',borderRadius:'999px',fontSize:'13px',fontWeight:'600',background:'#e8f4fd',color:'#2980b9'}}>🗺️ Pathway Progress</span>}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:'12px',marginTop:'24px',paddingTop:'16px',borderTop:'2px solid #f0f0f0'}}>
          <button style={{...bdt,background:'#f0f0f0',color:'#555',flex:1}} onClick={()=>setView('list')}>Cancel</button>
          <button style={{...bdt,background:'#1eb457',color:'#fff',flex:2}} onClick={handleSave} disabled={saving}>
            {saving?'⏳ Saving...':editId?'💾 Update Observation':'✅ Submit Observation'}
          </button>
        </div>
      </div>
    </Layout>
  );

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────
  return (
    <Layout title="M & E" subtitle="Session Observations · Visit Tracking · RPF 2026">

      <div style={{display:'flex',marginBottom:'20px',borderBottom:'1px solid #e2e8f0',overflowX:'auto'}}>
        {[{k:'observations',l:'📋 Session Observations'},{k:'device_audit',l:'💻 Device Audit'},{k:'training',l:'🎓 Capacity Building'}].map(t=>(
          <button key={t.k} style={{padding:'10px 20px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',borderBottom:tab===t.k?'2px solid #1eb457':'2px solid transparent',color:tab===t.k?'#1eb457':'#888',fontWeight:tab===t.k?'600':'400'}}
            onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab==='observations'&&(<>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:'12px',marginBottom:'20px'}}>
          {[['TOTAL VISITS',TV,'#69A9C9'],['PHYSICAL',PV,'#1eb457'],['CLUBS RUNNING',CR,'#F7941D'],['FLAGGED',FL,'#e74c3c'],['LEARNERS',TL,'#1abc9c']].map(([l,v,c])=>(
            <div key={l} style={{background:'#fff',borderRadius:'12px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',borderTop:`4px solid ${c}`}}>
              <p style={{fontSize:'9px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',margin:'0 0 6px'}}>{l}</p>
              <p style={{fontSize:'28px',fontWeight:'700',margin:0,color:c}}>{v}</p>
            </div>
          ))}
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <input style={{padding:'8px 12px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'13px',outline:'none',minWidth:'180px'}}
              placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <select style={{padding:'8px 10px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'13px',background:'#fff'}}
              value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
              <option value="">All Schools</option>
              {schools.map(s=><option key={s.id} value={s.id}>{s.official_name}</option>)}
            </select>
          </div>
          <button style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}
            onClick={openAdd}>📝 Record New Observation</button>
        </div>

        <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
          <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f0f0'}}>
            <p style={{fontSize:'15px',fontWeight:'600',color:'#1a2332',margin:'0 0 4px'}}>Session observations — RPF 2026</p>
            <p style={{fontSize:'12px',color:'#8a96a3',margin:0}}>{filtered.length} of {visits.length} observations</p>
          </div>
          {loading?<p style={{color:'#888',padding:'20px'}}>Loading...</p>:(
            filtered.length === 0
              ? <p style={{color:'#888',textAlign:'center',padding:'40px'}}>No observations yet. Click "Record New Observation" to start! 📝</p>
              : filtered.map((v,i)=>(
                <div key={v.id} style={{padding:'16px 20px',borderBottom:'1px solid #f5f5f5',background:i%2===0?'#fff':'#fafafa'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
                    <div style={{flex:1,minWidth:'200px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                        <span style={{background:'#1eb457',color:'#fff',padding:'2px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>Visit #{v.visit_number}</span>
                        <span style={{fontWeight:'600',color:'#1a2332',fontSize:'14px'}}>{v.school_name}</span>
                        <span style={{fontSize:'12px',color:'#8a96a3'}}>{v.club_id} · {v.county}</span>
                      </div>
                      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'4px'}}>
                        {bdg(v.club_running?'#eafaf1':'#fdedec',v.club_running?'#1a8a4a':'#e74c3c',v.club_running?'✅ Running':'❌ Not running')}
                        {bdg(v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad',v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone')}
                        {v.engagement_rating&&bdg('#f0f7ff','#2980b9',v.engagement_rating)}
                        {v.flag_school&&bdg('#fdedec','#e74c3c','🚩 Flagged')}
                        {v.recommended_star_club&&bdg('#fef9e7','#a0720a','⭐ Star')}
                      </div>
                      <div style={{fontSize:'13px',color:'#555'}}>
                        {v.date_of_visit?new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'} · {v.mentor_name||'—'} · {v.total_learners||0} learners
                        {v.scratch_level&&` · ${v.scratch_level}`}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button style={{padding:'6px 12px',borderRadius:'8px',border:'1.5px solid #1eb457',background:'#fff',fontSize:'13px',cursor:'pointer',color:'#1eb457'}}
                        onClick={()=>openHistory({id:v.school_id,official_name:v.school_name})}>📋 History</button>
                      <button style={{padding:'6px 10px',borderRadius:'8px',border:'1.5px solid #69A9C9',background:'#fff',fontSize:'13px',cursor:'pointer',color:'#69A9C9'}}
                        onClick={()=>openEdit(v)}>✏️</button>
                      <button style={{padding:'6px 10px',borderRadius:'8px',border:'1.5px solid #e74c3c',background:'#fff',fontSize:'13px',cursor:'pointer',color:'#e74c3c'}}
                        onClick={()=>handleDelete(v.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </>)}

      {tab==='device_audit'&&(<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'20px'}}>
          {[['AUDITS',DA,'#69A9C9'],['TOTAL DEVICES',DT,'#1eb457'],['FUNCTIONING',DF,'#F7941D'],['FAULTY',DB,'#e74c3c']].map(([l,v,c])=>(
            <div key={l} style={{background:'#fff',borderRadius:'12px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',borderTop:`4px solid ${c}`}}>
              <p style={{fontSize:'9px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',margin:'0 0 6px'}}>{l}</p>
              <p style={{fontSize:'28px',fontWeight:'700',margin:0,color:c}}>{v}</p>
            </div>
          ))}
        </div>

        {deviceTypeStats.length > 0 && (
          <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',padding:'18px',marginBottom:'20px'}}>
            <p style={{fontSize:'15px',fontWeight:'600',color:'#1a2332',margin:'0 0 12px'}}>Device analytics by type</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'10px'}}>
              {deviceTypeStats.map(stat => {
                const workingRate = stat.total ? Math.min(100, Math.round((stat.functioning / stat.total) * 100)) : 0;
                return (
                  <div key={stat.type} style={{background:'#f8f9fa',borderRadius:'10px',padding:'12px',border:'1px solid #eef2f7'}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:'8px',alignItems:'center',marginBottom:'8px'}}>
                      <span style={{fontSize:'13px',fontWeight:'700',color:'#1a2332'}}>{stat.type}</span>
                      <span style={{fontSize:'11px',fontWeight:'700',color:'#2980b9'}}>{stat.records} record{stat.records===1?'':'s'}</span>
                    </div>
                    <p style={{fontSize:'26px',fontWeight:'700',color:'#1eb457',margin:'0 0 4px'}}>{stat.total}</p>
                    <p style={{fontSize:'12px',color:'#555',margin:'0 0 8px'}}>{stat.functioning} functioning · {stat.faulty} faulty</p>
                    <div style={{height:'6px',background:'#e2e8f0',borderRadius:'999px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${workingRate}%`,background:workingRate>=75?'#1eb457':workingRate>=50?'#F7941D':'#e74c3c'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',padding:'20px',marginBottom:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px',marginBottom:'16px',flexWrap:'wrap'}}>
            <div>
              <p style={{fontSize:'15px',fontWeight:'600',color:'#1a2332',margin:'0 0 4px'}}>Device audit records</p>
              <p style={{fontSize:'12px',color:'#8a96a3',margin:0}}>{filteredAudits.length} of {deviceAudits.length} audits</p>
            </div>
            <button style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}
              onClick={showAuditForm ? closeAuditForm : openAuditAdd}>
              {showAuditForm ? '✕ Cancel' : '+ Record Device Audit'}
            </button>
          </div>

          {showAuditForm && (
            <div style={{background:'#f8f9fa',borderRadius:'10px',padding:'18px',border:'1px solid #e2e8f0',marginBottom:'18px'}}>
              <p style={{fontSize:'15px',fontWeight:'700',color:'#1a2332',margin:'0 0 14px'}}>
                {auditEditId ? 'Edit Device Audit' : 'New Device Audit'}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'14px'}}>
                <div>
                  <label style={lbl}>School / Community Centre *</label>
                  <select style={inp} value={auditForm.school_id}
                    onChange={e=>setAuditForm(f=>({...f,school_id:e.target.value}))}>
                    <option value="">— Select school or centre —</option>
                    {schools.map(s=>(
                      <option key={s.id} value={s.id}>{s.official_name} — {s.club_id || 'No club ID'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Audit date</label>
                  <input style={inp} type="date" value={auditForm.audit_date} onChange={e=>setAuditForm(f=>({...f,audit_date:e.target.value}))}/>
                </div>
                <div>
                  <label style={lbl}>Paired coding club</label>
                  <input style={{...inp,background:'#fff',color:'#555'}} value={selectedAuditSchool?.club_id || 'Not assigned'} readOnly/>
                </div>
                <div>
                  <label style={lbl}>Type</label>
                  <input style={{...inp,background:'#fff',color:'#555'}} value={selectedAuditSchool?.type === 'community_centre' ? 'Community centre' : selectedAuditSchool?.type ? 'School' : '—'} readOnly/>
                </div>
                <div>
                  <label style={lbl}>Device type *</label>
                  <select style={inp} value={auditForm.device_type} onChange={e=>setAuditForm(f=>({...f,device_type:e.target.value,custom_device_type:e.target.value==='Other'?f.custom_device_type:''}))}>
                    <option value="">— Select device type —</option>
                    {DEVICE_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                {auditForm.device_type === 'Other' && (
                  <div>
                    <label style={lbl}>Other device type *</label>
                    <input style={inp} value={auditForm.custom_device_type} onChange={e=>setAuditForm(f=>({...f,custom_device_type:e.target.value}))} placeholder="Describe device type"/>
                  </div>
                )}
                <div>
                  <label style={lbl}>Total devices</label>
                  <input style={inp} type="number" min="0" value={auditForm.total_devices} onChange={e=>setAuditForm(f=>({...f,total_devices:e.target.value}))} placeholder="0"/>
                </div>
                <div>
                  <label style={lbl}>Functioning</label>
                  <input style={inp} type="number" min="0" value={auditForm.functioning_devices} onChange={e=>setAuditForm(f=>({...f,functioning_devices:e.target.value}))} placeholder="0"/>
                </div>
                <div>
                  <label style={lbl}>Faulty</label>
                  <input style={inp} type="number" min="0" value={auditForm.faulty_devices} onChange={e=>setAuditForm(f=>({...f,faulty_devices:e.target.value}))} placeholder="0"/>
                </div>
                <div>
                  <label style={lbl}>Condition check</label>
                  <input style={{...inp,background:'#fff',color:(parseInt(auditForm.functioning_devices,10)||0)+(parseInt(auditForm.faulty_devices,10)||0)>(parseInt(auditForm.total_devices,10)||0)?'#e74c3c':'#1a8a4a'}}
                    value={`${(parseInt(auditForm.functioning_devices,10)||0) + (parseInt(auditForm.faulty_devices,10)||0)} / ${parseInt(auditForm.total_devices,10)||0} accounted for`} readOnly/>
                </div>
                <div style={{gridColumn:'1 / -1'}}>
                  <label style={lbl}>Comments</label>
                  <textarea style={{...inp,height:'90px',resize:'vertical'}} value={auditForm.comments} onChange={e=>setAuditForm(f=>({...f,comments:e.target.value}))} placeholder="Condition, missing chargers, storage notes..."/>
                </div>
              </div>
              <div style={{display:'flex',gap:'12px',marginTop:'18px',flexWrap:'wrap'}}>
                <button style={{...bdt,background:'#1eb457',color:'#fff',width:'auto',minWidth:'180px'}} onClick={handleAuditSave} disabled={auditSaving}>
                  {auditSaving ? 'Saving...' : auditEditId ? 'Update Audit' : 'Save Audit'}
                </button>
                <button style={{...bdt,background:'#fff',color:'#555',border:'1.5px solid #e2e8f0',width:'auto',minWidth:'120px'}} onClick={closeAuditForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
            <input style={{padding:'8px 12px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'13px',outline:'none',minWidth:'180px',flex:1}}
              placeholder="🔍 Search school, club ID, device..." value={auditSearch} onChange={e=>setAuditSearch(e.target.value)}/>
            <select style={{padding:'8px 10px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'13px',background:'#fff'}}
              value={auditFilterSchool} onChange={e=>setAuditFilterSchool(e.target.value)}>
              <option value="">All Schools</option>
              {schools.map(s=><option key={s.id} value={s.id}>{s.official_name}</option>)}
            </select>
          </div>

          {auditLoading ? <p style={{color:'#888',padding:'20px'}}>Loading...</p> : (
            filteredAudits.length === 0
              ? <p style={{color:'#888',textAlign:'center',padding:'36px'}}>No device audits recorded yet.</p>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:'800px'}}>
                    <thead>
                      <tr style={{background:'#f8f9fa'}}>
                        {['SCHOOL / CENTRE','CLUB ID','TYPE','DEVICE TYPE','TOTAL','WORKING','FAULTY','COMMENTS','DATE','MENTOR','ACTIONS'].map(h=>(
                          <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',borderBottom:'2px solid #f0f0f0',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudits.map((a,i)=> {
                        const type = a.school_type_current || a.school_type;
                        return (
                          <tr key={a.id} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                            <td style={{padding:'10px 12px',fontSize:'13px',fontWeight:'600',color:'#1a2332',whiteSpace:'nowrap'}}>{a.school_name || '—'}</td>
                            <td style={{padding:'10px 12px',fontSize:'12px',color:'#8a96a3',whiteSpace:'nowrap'}}>{a.club_id || a.coding_club_id || '—'}</td>
                            <td style={{padding:'10px 12px',fontSize:'12px',color:'#555',whiteSpace:'nowrap'}}>{type === 'community_centre' ? 'Centre' : 'School'}</td>
                            <td style={{padding:'10px 12px'}}>{bdg('#e8f4fd','#2980b9',a.device_type)}</td>
                            <td style={{padding:'10px 12px',fontSize:'14px',fontWeight:'700',color:'#1a2332',textAlign:'center'}}>{a.total_devices || 0}</td>
                            <td style={{padding:'10px 12px',textAlign:'center'}}>{bdg('#eafaf1','#1a8a4a',a.functioning_devices || 0)}</td>
                            <td style={{padding:'10px 12px',textAlign:'center'}}>{parseInt(a.faulty_devices||0)>0?bdg('#fdedec','#e74c3c',a.faulty_devices):bdg('#eafaf1','#1a8a4a','0')}</td>
                            <td style={{padding:'10px 12px',fontSize:'12px',color:'#555',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.comments || '—'}</td>
                            <td style={{padding:'10px 12px',fontSize:'12px',color:'#8a96a3',whiteSpace:'nowrap'}}>{a.audit_date ? new Date(a.audit_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                            <td style={{padding:'10px 12px',fontSize:'12px',color:'#555',whiteSpace:'nowrap'}}>{a.mentor_name || '—'}</td>
                            <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                              <button style={{padding:'5px 10px',borderRadius:'8px',border:'1.5px solid #69A9C9',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#69A9C9',marginRight:'6px'}} onClick={()=>openAuditEdit(a)}>Edit</button>
                              <button style={{padding:'5px 10px',borderRadius:'8px',border:'1.5px solid #e74c3c',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#e74c3c'}} onClick={()=>handleAuditDelete(a.id, a.school_name)}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
          )}
        </div>
      </>)}

      {tab==='training'&&(
        <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',padding:'40px',textAlign:'center',color:'#888'}}>
          Capacity building records coming soon. 🚀
        </div>
      )}
    </Layout>
  );
}
