// src/pages/MandE.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const RATINGS    = ['Very Active','Active','Moderate','Low'];
const CONFIDENCE = ['Very Confident','Confident','Developing','Needs Support'];
const DAYS       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Multiple days'];
const LEVELS     = ['Level 1','Level 2','Level 3','Optional Module 1','Optional Module 2','Optional Module 3'];

const INIT = {
  school_id:'', date_of_visit:new Date().toISOString().split('T')[0],
  engagement_type:'Physical Visit', latitude:'', longitude:'',
  club_running:'yes', not_running_reason:'', activation_actions:'',
  club_day:'', time_band:'', device_count:'', total_learners:'',
  male_learners:'', female_learners:'', engagement_rating:'',
  pathway_id:'', scratch_level:'', creating_projects:'no',
  project_name:'', project_notes:'', observations:'', phone_call_notes:'',
  challenges:'', club_leader_confidence:'', actions_agreed:'',
  recommended_star_club:'no', star_club_reason:'',
  flag_school:'no', flag_reason:'', next_visit_date:'', other_details:'',
};

export default function MandE() {
  const [tab, setTab]             = useState('observations');
  const [schools, setSchools]     = useState([]);
  const [visits, setVisits]       = useState([]);
  const [pathways, setPathways]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState('list'); // 'list' | 'form' | 'history'
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({ ...INIT });
  const [saving, setSaving]       = useState(false);
  const [historySchool, setHistorySchool] = useState(null);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [filterSchool, setFilterSchool]   = useState('');
  const [search, setSearch]               = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, v, p] = await Promise.all([
        api.get('/visits/my-schools'),
        api.get('/visits'),
        api.get('/pathways'),
      ]);
      setSchools(s.data);
      setVisits(v.data);
      setPathways(p.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Single update function — key to preventing re-render issues
  const upd = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const selPathway = pathways.find(p => p.id === form.pathway_id);
  const projects   = selPathway?.projects
    ? (typeof selPathway.projects === 'string'
        ? JSON.parse(selPathway.projects)
        : selPathway.projects)
    : [];

  const visitCountForSchool = visits.filter(v => v.school_id === form.school_id).length;

  const openAdd = () => {
    setForm({ ...INIT, date_of_visit: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setView('form');
  };

  const openEdit = (v) => {
    setForm({
      school_id: v.school_id||'',
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
      pathway_id: v.pathway_id||'', scratch_level: v.scratch_level||'',
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

  const openHistory = async (school) => {
    setHistorySchool(school);
    try {
      const r = await api.get(`/visits/school/${school.id}`);
      setHistoryVisits(r.data);
    } catch { setHistoryVisits([]); }
    setView('history');
  };

  const filtered = visits.filter(v => {
    if (filterSchool && v.school_id !== filterSchool) return false;
    if (search && !v.school_name?.toLowerCase().includes(search.toLowerCase()) &&
        !v.mentor_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const TV=visits.length, PV=visits.filter(v=>v.engagement_type==='Physical Visit').length;
  const CR=visits.filter(v=>v.club_running).length;
  const FL=visits.filter(v=>v.flag_school||!v.club_running).length;
  const TL=visits.reduce((s,v)=>s+(parseInt(v.total_learners)||0),0);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inp = { width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'15px', color:'#333', outline:'none', boxSizing:'border-box', background:'#fff' };
  const lbl = { fontSize:'14px', fontWeight:'600', color:'#444', display:'block', marginBottom:'6px' };
  const sec = { fontSize:'15px', fontWeight:'700', color:'#1a2332', background:'#f0f7ff', padding:'10px 16px', borderRadius:'8px', marginTop:'24px', marginBottom:'16px', borderLeft:'4px solid #1eb457' };
  const row = { marginBottom:'16px' };
  const row2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' };
  const bdt = { padding:'14px 20px', borderRadius:'10px', border:'none', fontSize:'15px', fontWeight:'600', cursor:'pointer', width:'100%' };
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
          <select style={inp} value={form.school_id} onChange={upd('school_id')}>
            <option value="">— Select school or centre —</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>
                {s.official_name} ({s.club_id}) — {s.county} — {s.type === 'community_centre' ? 'Centre' : 'School'}
              </option>
            ))}
          </select>
          {form.school_id && (
            <p style={{margin:'6px 0 0',fontSize:'13px',color:'#1eb457',fontWeight:'600'}}>
              📍 This will be Visit #{visitCountForSchool + 1} for this club
            </p>
          )}
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
        <div style={sec}>👥 Section 4 — Learners & Devices</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
          <div>
            <label style={lbl}>Devices available</label>
            <input style={inp} type="number" value={form.device_count} onChange={upd('device_count')} placeholder="0"/>
          </div>
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
          <div style={{gridColumn:'span 2'}}>
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
            {pathways.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={lbl}>What Scratch level have learners reached?</label>
          <select style={inp} value={form.scratch_level} onChange={upd('scratch_level')} disabled={!form.pathway_id}>
            <option value="">— {form.pathway_id?'Select level':'Select pathway first'} —</option>
            {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
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
              {projects.map((p,i)=><option key={i} value={p}>{p}</option>)}
              <option value="Other">Other / Not listed</option>
            </select>
          </div>
          <div style={row}>
            <label style={lbl}>Project notes / description</label>
            <textarea style={{...inp,height:'80px',resize:'vertical'}} value={form.project_notes} onChange={upd('project_notes')} placeholder="Describe the project..."/>
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
        {(form.recommended_star_club==='yes'||form.flag_school==='yes'||form.club_running==='no'||form.pathway_id)&&(
          <div style={{background:'#f0f7ff',borderRadius:'10px',padding:'14px 16px',margin:'20px 0',border:'1px solid #d0e8ff'}}>
            <p style={{margin:'0 0 8px',fontWeight:'700',fontSize:'14px',color:'#2980b9'}}>⚡ On submit, this will auto-populate:</p>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
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

      <div style={{display:'flex',marginBottom:'20px',borderBottom:'1px solid #e2e8f0'}}>
        {[{k:'observations',l:'📋 Session Observations'},{k:'training',l:'🎓 Capacity Building'}].map(t=>(
          <button key={t.k} style={{padding:'10px 20px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',borderBottom:tab===t.k?'2px solid #1eb457':'2px solid transparent',color:tab===t.k?'#1eb457':'#888',fontWeight:tab===t.k?'600':'400'}}
            onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab==='observations'&&(<>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',marginBottom:'20px'}}>
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

      {tab==='training'&&(
        <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',padding:'40px',textAlign:'center',color:'#888'}}>
          Capacity building records coming soon. 🚀
        </div>
      )}
    </Layout>
  );
}