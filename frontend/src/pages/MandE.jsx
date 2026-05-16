// src/pages/MandE.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const EMPTY = {
  school_id:'', date_of_visit:new Date().toISOString().split('T')[0],
  engagement_type:'Physical Visit', latitude:'', longitude:'', gps_raw:'',
  club_running:true, not_running_reason:'', activation_actions:'',
  club_day:'', time_band:'', device_count:'', total_learners:'',
  male_learners:'', female_learners:'', engagement_rating:'',
  pathway_id:'', scratch_level:'', creating_projects:false,
  project_id:'', project_notes:'', observations:'', phone_call_notes:'',
  challenges:'', club_leader_confidence:'', actions_agreed:'',
  recommended_star_club:false, star_club_reason:'',
  flag_school:false, flag_reason:'', next_visit_date:'', other_details:'',
};

const RATINGS    = ['Very Active','Active','Moderate','Low'];
const CONFIDENCE = ['Very Confident','Confident','Developing','Needs Support'];
const DAYS       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Multiple days'];

export default function MandE() {
  const [tab, setTab]                   = useState('observations');
  const [schools, setSchools]           = useState([]);
  const [visits, setVisits]             = useState([]);
  const [pathways, setPathways]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [historySchool, setHistorySchool] = useState(null);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showDrop, setShowDrop]         = useState(false);
  const [filterSchool, setFilterSchool] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [search, setSearch]             = useState('');

  // Form state — use plain object, only trigger re-render for toggle fields
  const formRef  = useRef({ ...EMPTY });
  const [toggles, setToggles] = useState({
    club_running: true, creating_projects: false,
    recommended_star_club: false, flag_school: false,
  });
  const [selPathway, setSelPathway] = useState(null);
  const [selSchoolId, setSelSchoolId] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, v, p] = await Promise.all([
        api.get('/visits/my-schools'),
        api.get('/visits'),
        api.get('/visits/pathways-with-projects'),
      ]);
      setSchools(s.data);
      setVisits(v.data);
      setPathways(p.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    formRef.current = { ...EMPTY, date_of_visit: new Date().toISOString().split('T')[0] };
    setToggles({ club_running:true, creating_projects:false, recommended_star_club:false, flag_school:false });
    setSelPathway(null);
    setSelSchoolId('');
    setSchoolSearch('');
    setShowDrop(false);
  };

  const openAdd = () => {
    resetForm();
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const openEdit = (v) => {
    formRef.current = {
      school_id: v.school_id||'', date_of_visit: v.date_of_visit?.split('T')[0]||'',
      engagement_type: v.engagement_type||'Physical Visit',
      latitude: v.latitude||'', longitude: v.longitude||'', gps_raw: v.gps_raw||'',
      club_running: v.club_running??true, not_running_reason: v.not_running_reason||'',
      activation_actions: v.activation_actions||'', club_day: v.club_day||'',
      time_band: v.time_band||'', device_count: v.device_count||'',
      total_learners: v.total_learners||'', male_learners: v.male_learners||'',
      female_learners: v.female_learners||'', engagement_rating: v.engagement_rating||'',
      pathway_id: v.pathway_id||'', scratch_level: v.scratch_level||'',
      creating_projects: v.creating_projects||false, project_id: v.project_id||'',
      project_notes: v.project_notes||'', observations: v.observations||'',
      phone_call_notes: v.phone_call_notes||'', challenges: v.challenges||'',
      club_leader_confidence: v.club_leader_confidence||'', actions_agreed: v.actions_agreed||'',
      recommended_star_club: v.recommended_star_club||false, star_club_reason: v.star_club_reason||'',
      flag_school: v.flag_school||false, flag_reason: v.flag_reason||'',
      next_visit_date: v.next_visit_date?.split('T')[0]||'', other_details: v.other_details||'',
    };
    setToggles({
      club_running: v.club_running??true, creating_projects: v.creating_projects||false,
      recommended_star_club: v.recommended_star_club||false, flag_school: v.flag_school||false,
    });
    const p = pathways.find(p => p.id === v.pathway_id);
    setSelPathway(p||null);
    setSelSchoolId(v.school_id||'');
    setSchoolSearch(v.school_name||'');
    setEditingId(v.id);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const toggle = (field) => {
    const newVal = !formRef.current[field];
    formRef.current[field] = newVal;
    setToggles(t => ({ ...t, [field]: newVal }));
  };

  const setField = (field, val) => { formRef.current[field] = val; };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        formRef.current.latitude  = pos.coords.latitude;
        formRef.current.longitude = pos.coords.longitude;
        formRef.current.gps_raw   = `${pos.coords.latitude} ${pos.coords.longitude} 0 ${pos.coords.accuracy}`;
        document.getElementById('gps-display').textContent =
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setGpsLoading(false);
      },
      err => { alert('GPS: ' + err.message); setGpsLoading(false); }
    );
  };

  const handleSave = async () => {
    const f = { ...formRef.current, ...toggles, school_id: selSchoolId };
    if (!f.school_id) return alert('Please select a school or centre');
    if (!f.date_of_visit) return alert('Date of visit is required');
    setSaving(true);
    try {
      if (editingId) { await api.put(`/visits/${editingId}`, f); }
      else { await api.post('/visits', f); }
      setShowForm(false);
      fetchData();
    } catch(err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this observation?')) return;
    try { await api.delete(`/visits/${id}`); fetchData(); }
    catch { alert('Failed to delete'); }
  };

  const viewHistory = async (school) => {
    setHistorySchool(school);
    try { const r = await api.get(`/visits/school/${school.id}`); setHistoryVisits(r.data); }
    catch { setHistoryVisits([]); }
  };

  const filteredSchools = schools.filter(s =>
    !schoolSearch ||
    s.official_name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.club_id?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.county?.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const filteredVisits = visits.filter(v => {
    if (filterSchool && v.school_id !== filterSchool) return false;
    if (filterRating && v.engagement_rating !== filterRating) return false;
    if (search && !v.school_name?.toLowerCase().includes(search.toLowerCase()) &&
        !v.mentor_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visitCount = visits.filter(v => v.school_id === selSchoolId).length;
  const nextVisitNum = editingId
    ? visits.find(v => v.id === editingId)?.visit_number || 1
    : visitCount + 1;

  // Stats
  const TV = visits.length;
  const PV = visits.filter(v => v.engagement_type === 'Physical Visit').length;
  const PC = visits.filter(v => v.engagement_type === 'Phone Call').length;
  const CR = visits.filter(v => v.club_running).length;
  const FL = visits.filter(v => v.flag_school || !v.club_running).length;
  const TL = visits.reduce((s, v) => s + (parseInt(v.total_learners)||0), 0);

  const B = { display:'inline-block', padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' };
  const badge = (bg, color, text) => <span style={{...B, background:bg, color}}>{text}</span>;

  const Sec = ({icon, title}) => (
    <div style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'14px',fontWeight:'700',color:'#1a2332',background:'#f8f9fa',padding:'10px 16px',borderRadius:'8px',margin:'24px 0 16px'}}>
      {icon} {title}
    </div>
  );

  const Fld = ({label, req, span, children}) => (
    <div style={{display:'flex',flexDirection:'column',gap:'6px', ...(span?{gridColumn:'1/-1'}:{})}}>
      <label style={{fontSize:'13px',fontWeight:'600',color:'#555'}}>{label}{req&&<span style={{color:'#e74c3c'}}> *</span>}</label>
      {children}
    </div>
  );

  const I = {padding:'10px 14px',borderRadius:'10px',border:'1.5px solid #e2e8f0',fontSize:'14px',color:'#333',outline:'none',width:'100%',boxSizing:'border-box'};
  const TA = {...I, height:'80px', resize:'vertical'};

  const Tog = ({field, yes, no, color='#1eb457'}) => (
    <label style={{display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',padding:'8px 0'}}>
      <div style={{width:'44px',height:'24px',borderRadius:'12px',background:toggles[field]?color:'#ddd',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}
        onClick={() => toggle(field)}>
        <div style={{position:'absolute',top:'2px',left:'2px',width:'20px',height:'20px',borderRadius:'50%',background:'#fff',transition:'transform 0.2s',transform:toggles[field]?'translateX(20px)':'translateX(0)',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
      </div>
      <span style={{color:toggles[field]?color:'#555',fontWeight:'500'}}>{toggles[field]?yes:no}</span>
    </label>
  );

  const g2 = {display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px',marginBottom:'8px'};
  const g3 = {display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'16px',marginBottom:'8px'};

  return (
    <Layout title="M & E" subtitle="Session Observations · Visit Tracking · RPF 2026">

      {/* Tabs */}
      <div style={{display:'flex',marginBottom:'20px',borderBottom:'1px solid #e2e8f0'}}>
        {[{k:'observations',l:'📋 Session Observations'},{k:'training',l:'🎓 Capacity Building'}].map(t=>(
          <button key={t.k} style={{padding:'10px 20px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',borderBottom:tab===t.k?'2px solid #1eb457':'2px solid transparent',color:tab===t.k?'#1eb457':'#888',fontWeight:tab===t.k?'600':'400'}}
            onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab==='observations' && (<>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[['TOTAL VISITS',TV,'#69A9C9'],['PHYSICAL',PV,'#1eb457'],['PHONE CALLS',PC,'#9b59b6'],['CLUBS RUNNING',CR,'#F7941D'],['FLAGGED',FL,'#e74c3c'],['LEARNERS',TL,'#1abc9c']].map(([l,v,c])=>(
            <div key={l} style={{background:'#fff',borderRadius:'12px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',borderTop:`4px solid ${c}`}}>
              <p style={{fontSize:'9px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',margin:'0 0 6px'}}>{l}</p>
              <p style={{fontSize:'28px',fontWeight:'700',margin:0,color:c}}>{v}</p>
            </div>
          ))}
        </div>

        {!showForm && (
          <div style={{marginBottom:'16px',display:'flex',justifyContent:'flex-end'}}>
            <button style={{padding:'12px 24px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}
              onClick={openAdd}>📝 Record New Observation</button>
          </div>
        )}

        {/* ── FORM ─────────────────────────────────────────────────────── */}
        {showForm && (
          <div style={{background:'#fff',borderRadius:'16px',padding:'28px',boxShadow:'0 2px 16px rgba(0,0,0,0.08)',marginBottom:'24px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',paddingBottom:'16px',borderBottom:'2px solid #f0f0f0'}}>
              <h2 style={{margin:0,fontSize:'20px',fontWeight:'700',color:'#1a2332'}}>
                {editingId ? '✏️ Edit Observation' : '📝 New Session Observation'}
              </h2>
              <button style={{padding:'8px 16px',borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',fontSize:'13px',cursor:'pointer',color:'#555'}}
                onClick={()=>setShowForm(false)}>✕ Cancel</button>
            </div>

            {/* S1 — Identity */}
            <Sec icon="🏷️" title="Section 1 — Visit Identity"/>
            <div style={g2}>
              <Fld label="School / Community Centre" req span>
                <div style={{position:'relative'}}>
                  <input style={I} placeholder="🔍 Type to search — school name, club ID or county..."
                    value={schoolSearch} autoComplete="off"
                    onChange={e=>{setSchoolSearch(e.target.value);setShowDrop(true);if(selSchoolId)setSelSchoolId('');}}
                    onFocus={()=>setShowDrop(true)}
                    onBlur={()=>setTimeout(()=>setShowDrop(false),150)}/>
                  {showDrop && schoolSearch && !selSchoolId && filteredSchools.length>0 && (
                    <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1.5px solid #1eb457',borderRadius:'10px',zIndex:999,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',maxHeight:'260px',overflowY:'auto'}}>
                      {filteredSchools.slice(0,10).map(s=>(
                        <div key={s.id}
                          style={{padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f0f0f0',fontSize:'13px'}}
                          onMouseDown={()=>{
                            setSelSchoolId(s.id);
                            formRef.current.school_id = s.id;
                            setSchoolSearch(`${s.official_name} (${s.club_id})`);
                            setShowDrop(false);
                          }}>
                          <div style={{fontWeight:'600',color:'#1a2332'}}>{s.official_name}</div>
                          <div style={{fontSize:'11px',color:'#8a96a3'}}>{s.club_id} · {s.county} · {s.type==='community_centre'?'🏢 Community Centre':'🏫 School'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selSchoolId && (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'#eafaf1',borderRadius:'8px',fontSize:'13px',color:'#1a8a4a',fontWeight:'600',marginTop:'4px'}}>
                    ✅ {schoolSearch}
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontWeight:'700',fontSize:'14px'}}
                      onClick={()=>{setSelSchoolId('');setSchoolSearch('');}}>✕ Change</button>
                  </div>
                )}
              </Fld>

              <Fld label="Date of Visit" req>
                <input style={I} type="date" defaultValue={formRef.current.date_of_visit}
                  onChange={e=>setField('date_of_visit',e.target.value)}/>
              </Fld>

              <Fld label="Mentor">
                <input style={{...I,background:'#f8f9fa',color:'#888'}} value={user.full_name||'Current Mentor'} readOnly/>
              </Fld>

              <Fld label="Visit Status">
                <div style={{padding:'10px 14px',borderRadius:'10px',background:'#f0f7ff',color:'#2980b9',fontSize:'13px',fontWeight:'600',border:'1.5px solid #d0e8ff'}}>
                  {selSchoolId ? `📍 This will be Visit #${nextVisitNum}` : '← Select a school first'}
                </div>
              </Fld>
            </div>

            {/* S2 — Location */}
            <Sec icon="📍" title="Section 2 — Location & Engagement"/>
            <div style={g2}>
              <Fld label="Type of Engagement" req>
                <select style={I} defaultValue={formRef.current.engagement_type}
                  onChange={e=>setField('engagement_type',e.target.value)}>
                  <option value="Physical Visit">🏫 Physical Visit</option>
                  <option value="Phone Call">📞 Phone Call</option>
                </select>
              </Fld>
              <Fld label="GPS Location">
                <div style={{display:'flex',gap:'8px'}}>
                  <div id="gps-display" style={{...I,flex:1,background:'#f8f9fa',color:'#888',lineHeight:'1.5'}}>
                    {formRef.current.latitude && formRef.current.longitude
                      ? `${parseFloat(formRef.current.latitude).toFixed(5)}, ${parseFloat(formRef.current.longitude).toFixed(5)}`
                      : 'Not captured yet'}
                  </div>
                  <button style={{padding:'10px 14px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'13px',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap'}}
                    onClick={captureGPS} disabled={gpsLoading}>{gpsLoading?'⏳':'📡 Get GPS'}</button>
                </div>
              </Fld>
              <Fld label="Has the club started?" span>
                <Tog field="club_running" yes="✅ Yes — Club is running" no="❌ No — Club not running"/>
              </Fld>
              {!toggles.club_running && (<>
                <Fld label="Main reason club not running">
                  <textarea style={TA} defaultValue={formRef.current.not_running_reason}
                    placeholder="What is the main reason the club is not running?"
                    onChange={e=>setField('not_running_reason',e.target.value)}/>
                </Fld>
                <Fld label="Actions to activate the club">
                  <textarea style={TA} defaultValue={formRef.current.activation_actions}
                    placeholder="What steps will activate the club?"
                    onChange={e=>setField('activation_actions',e.target.value)}/>
                </Fld>
              </>)}
            </div>

            {/* S3 — Schedule */}
            <Sec icon="🗓️" title="Section 3 — Session Schedule"/>
            <div style={g2}>
              <Fld label="What day is Code Club conducted?">
                <select style={I} defaultValue={formRef.current.club_day}
                  onChange={e=>setField('club_day',e.target.value)}>
                  <option value="">— Select day —</option>
                  {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </Fld>
              <Fld label="Time band (e.g. Tuesday 2PM - 4PM)">
                <input style={I} placeholder="e.g. Tuesday 2PM - 4PM"
                  defaultValue={formRef.current.time_band}
                  onChange={e=>setField('time_band',e.target.value)}/>
              </Fld>
            </div>

            {/* S4 — Learners */}
            <Sec icon="👥" title="Section 4 — Learners & Devices"/>
            <div style={g3}>
              {[['device_count','Devices available'],['total_learners','Total learners'],['male_learners','Male learners'],['female_learners','Female learners']].map(([f,l])=>(
                <Fld key={f} label={l}>
                  <input style={I} type="number" placeholder="0"
                    defaultValue={formRef.current[f]}
                    onChange={e=>setField(f,e.target.value)}/>
                </Fld>
              ))}
              <Fld label="Engagement rating">
                <select style={I} defaultValue={formRef.current.engagement_rating}
                  onChange={e=>setField('engagement_rating',e.target.value)}>
                  <option value="">— Select —</option>
                  {RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </Fld>
            </div>

            {/* S5 — Learning */}
            <Sec icon="📚" title="Section 5 — Learning Progress"/>
            <div style={g2}>
              <Fld label="Pathway being followed">
                <select style={I} defaultValue={formRef.current.pathway_id}
                  onChange={e=>{
                    setField('pathway_id',e.target.value);
                    setField('scratch_level','');
                    setField('project_id','');
                    setSelPathway(pathways.find(p=>p.id===e.target.value)||null);
                  }}>
                  <option value="">— Select pathway —</option>
                  {pathways.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </Fld>
              <Fld label="Level reached">
                <select style={I} defaultValue={formRef.current.scratch_level}
                  onChange={e=>setField('scratch_level',e.target.value)}
                  disabled={!selPathway}>
                  <option value="">— {selPathway?'Select level':'Pick pathway first'} —</option>
                  {(selPathway?.levelsArr||[]).map(l=>(
                    <option key={l.key} value={l.label}>{l.label} — {l.name}</option>
                  ))}
                </select>
              </Fld>
              <Fld label="Are learners creating projects?" span>
                <Tog field="creating_projects" yes="✅ Yes — Creating projects" no="❌ Not yet"/>
              </Fld>
              {toggles.creating_projects && (<>
                <Fld label="Which project?">
                  <select style={I} defaultValue={formRef.current.project_id}
                    onChange={e=>setField('project_id',e.target.value)}>
                    <option value="">— Select project —</option>
                    {(selPathway?.projectsArr||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="other">Other / Not listed</option>
                  </select>
                </Fld>
                <Fld label="Project notes">
                  <textarea style={TA} defaultValue={formRef.current.project_notes}
                    placeholder="Describe the project..."
                    onChange={e=>setField('project_notes',e.target.value)}/>
                </Fld>
              </>)}
            </div>

            {/* S6 — Observations */}
            <Sec icon="👁️" title="Section 6 — Observations"/>
            <div style={{display:'grid',gap:'16px',marginBottom:'8px'}}>
              <Fld label="What was done / observations during the session?">
                <textarea style={{...TA,height:'100px'}} defaultValue={formRef.current.observations}
                  placeholder="Describe what happened during the session..."
                  onChange={e=>setField('observations',e.target.value)}/>
              </Fld>
              <Fld label="If phone call — what was discussed?">
                <textarea style={TA} defaultValue={formRef.current.phone_call_notes}
                  placeholder="What was discussed during the call..."
                  onChange={e=>setField('phone_call_notes',e.target.value)}/>
              </Fld>
              <Fld label="Challenges observed / faced">
                <textarea style={TA} defaultValue={formRef.current.challenges}
                  placeholder="Any challenges or obstacles..."
                  onChange={e=>setField('challenges',e.target.value)}/>
              </Fld>
              <Fld label="Club leader's confidence level">
                <select style={I} defaultValue={formRef.current.club_leader_confidence}
                  onChange={e=>setField('club_leader_confidence',e.target.value)}>
                  <option value="">— Select —</option>
                  {CONFIDENCE.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </Fld>
            </div>

            {/* S7 — Actions */}
            <Sec icon="⚡" title="Section 7 — Actions & Follow-up"/>
            <div style={g2}>
              <Fld label="Actions agreed / intended" span>
                <textarea style={TA} defaultValue={formRef.current.actions_agreed}
                  placeholder="What actions were agreed upon this visit?"
                  onChange={e=>setField('actions_agreed',e.target.value)}/>
              </Fld>
              <Fld label="Next visit date">
                <input style={I} type="date" defaultValue={formRef.current.next_visit_date}
                  onChange={e=>setField('next_visit_date',e.target.value)}/>
              </Fld>
              <Fld label="Recommend for Star Club?" span>
                <Tog field="recommended_star_club" yes="⭐ Yes — Recommend for Star Club" no="⭐ Not recommended yet" color="#F5C518"/>
              </Fld>
              {toggles.recommended_star_club && (
                <Fld label="Why recommend for Star Club?" span>
                  <textarea style={TA} defaultValue={formRef.current.star_club_reason}
                    placeholder="Reason for Star Club nomination..."
                    onChange={e=>setField('star_club_reason',e.target.value)}/>
                </Fld>
              )}
              <Fld label="Flag this school / centre?" span>
                <Tog field="flag_school" yes="🚩 Yes — Flag this club" no="✅ No flag needed" color="#e74c3c"/>
              </Fld>
              {toggles.flag_school && (
                <Fld label="Flag reason" span>
                  <textarea style={TA} defaultValue={formRef.current.flag_reason}
                    placeholder="Reason for flagging..."
                    onChange={e=>setField('flag_reason',e.target.value)}/>
                </Fld>
              )}
            </div>

            {/* S8 — Other */}
            <Sec icon="📝" title="Section 8 — Other Details"/>
            <Fld label="Any other details to capture">
              <textarea style={{...TA,height:'80px'}} defaultValue={formRef.current.other_details}
                placeholder="Any additional information..."
                onChange={e=>setField('other_details',e.target.value)}/>
            </Fld>

            {/* Auto-populate preview */}
            {(toggles.recommended_star_club||toggles.flag_school||!toggles.club_running||selPathway)&&(
              <div style={{background:'#f0f7ff',borderRadius:'10px',padding:'14px 16px',margin:'20px 0',border:'1px solid #d0e8ff'}}>
                <p style={{margin:'0 0 8px',fontWeight:'700',fontSize:'13px',color:'#2980b9'}}>⚡ On submit, this will auto-populate:</p>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {toggles.recommended_star_club&&badge('#fef9e7','#a0720a','⭐ Star Club')}
                  {(toggles.flag_school||!toggles.club_running)&&badge('#fdedec','#e74c3c','🚩 Flags & Alerts')}
                  {selPathway&&badge('#e8f4fd','#2980b9','🗺️ Pathway Progress')}
                </div>
              </div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'24px',paddingTop:'16px',borderTop:'2px solid #f0f0f0'}}>
              <button style={{padding:'12px 24px',borderRadius:'10px',border:'1.5px solid #e2e8f0',background:'#fff',color:'#555',fontSize:'14px',cursor:'pointer'}}
                onClick={()=>setShowForm(false)}>Cancel</button>
              <button style={{padding:'12px 28px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'15px',fontWeight:'600',cursor:'pointer'}}
                onClick={handleSave} disabled={saving}>
                {saving?'⏳ Saving...':editingId?'💾 Update':'✅ Submit Observation'}
              </button>
            </div>
          </div>
        )}

        {/* ── VISITS LIST ─────────────────────────────────────────────── */}
        {!showForm && (<>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center',marginBottom:'16px'}}>
            <input style={{padding:'8px 12px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'13px',outline:'none',minWidth:'200px'}}
              placeholder="🔍 Search school or mentor..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <select style={{padding:'8px 10px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'12px',background:'#fff',cursor:'pointer'}}
              value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
              <option value="">All Schools</option>
              {schools.map(s=><option key={s.id} value={s.id}>{s.official_name}</option>)}
            </select>
            <select style={{padding:'8px 10px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'12px',background:'#fff',cursor:'pointer'}}
              value={filterRating} onChange={e=>setFilterRating(e.target.value)}>
              <option value="">All Ratings</option>
              {RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            {(filterSchool||filterRating||search)&&(
              <button style={{padding:'8px 12px',borderRadius:'8px',border:'1.5px solid #e74c3c',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#e74c3c'}}
                onClick={()=>{setFilterSchool('');setFilterRating('');setSearch('');}}>✕ Clear</button>
            )}
          </div>

          <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f0f0'}}>
              <p style={{fontSize:'15px',fontWeight:'600',color:'#1a2332',margin:'0 0 4px'}}>Session observations — RPF 2026</p>
              <p style={{fontSize:'12px',color:'#8a96a3',margin:0}}>{filteredVisits.length} of {visits.length} observations</p>
            </div>
            {loading?<p style={{color:'#888',padding:'20px'}}>Loading...</p>:(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
                  <thead>
                    <tr style={{background:'#f8f9fa'}}>
                      {['VISIT','SCHOOL / CENTRE','MENTOR','DATE','TYPE','CLUB','LEARNERS','RATING','LEVEL','FLAGS','ACTIONS'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',borderBottom:'2px solid #f0f0f0',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map((v,i)=>(
                      <tr key={v.id} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                        <td style={{padding:'10px 14px',fontSize:'13px',fontWeight:'700',color:'#1eb457'}}>#{v.visit_number}</td>
                        <td style={{padding:'10px 14px',fontSize:'13px'}}>
                          <div style={{fontWeight:'500',color:'#1a2332'}}>{v.school_name}</div>
                          <div style={{fontSize:'11px',color:'#8a96a3'}}>{v.club_id} · {v.county}</div>
                        </td>
                        <td style={{padding:'10px 14px',fontSize:'13px',color:'#4a5568'}}>{v.mentor_name||'—'}</td>
                        <td style={{padding:'10px 14px',fontSize:'13px',color:'#4a5568',whiteSpace:'nowrap'}}>
                          {v.date_of_visit?new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}
                        </td>
                        <td style={{padding:'10px 14px'}}>
                          {badge(v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad',v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone')}
                        </td>
                        <td style={{padding:'10px 14px'}}>
                          {badge(v.club_running?'#eafaf1':'#fdedec',v.club_running?'#1a8a4a':'#e74c3c',v.club_running?'✅ Running':'❌ Not running')}
                        </td>
                        <td style={{padding:'10px 14px',fontSize:'13px',color:'#4a5568'}}>{v.total_learners||0}</td>
                        <td style={{padding:'10px 14px'}}>
                          {v.engagement_rating&&badge(v.engagement_rating==='Very Active'?'#eafaf1':v.engagement_rating==='Active'?'#e8f4fd':'#fef9e7',v.engagement_rating==='Very Active'?'#1a8a4a':v.engagement_rating==='Active'?'#2980b9':'#a0720a',v.engagement_rating)}
                        </td>
                        <td style={{padding:'10px 14px',fontSize:'12px',color:'#4a5568'}}>{v.scratch_level||'—'}</td>
                        <td style={{padding:'10px 14px'}}>
                          {v.flag_school&&<span style={{...B,background:'#fdedec',color:'#e74c3c',marginRight:'4px'}}>🚩</span>}
                          {v.recommended_star_club&&<span style={{...B,background:'#fef9e7',color:'#a0720a'}}>⭐</span>}
                        </td>
                        <td style={{padding:'10px 14px'}}>
                          <div style={{display:'flex',gap:'4px'}}>
                            <button style={{padding:'4px 8px',borderRadius:'6px',border:'1.5px solid #1eb457',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#1eb457'}}
                              onClick={()=>viewHistory({id:v.school_id,official_name:v.school_name})}>📋</button>
                            <button style={{padding:'4px 8px',borderRadius:'6px',border:'1.5px solid #69A9C9',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#69A9C9'}}
                              onClick={()=>openEdit(v)}>✏️</button>
                            <button style={{padding:'4px 8px',borderRadius:'6px',border:'1.5px solid #e74c3c',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#e74c3c'}}
                              onClick={()=>handleDelete(v.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredVisits.length===0&&(
                      <tr><td colSpan={11} style={{padding:'40px',textAlign:'center',color:'#888'}}>
                        No observations yet. Click "Record New Observation" to start! 📝
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>)}

        {/* History Modal */}
        {historySchool&&(
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
            <div style={{background:'#fff',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'700px',maxHeight:'85vh',overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                <div>
                  <h3 style={{margin:0,color:'#1a2332'}}>{historySchool.official_name}</h3>
                  <p style={{margin:'4px 0 0',color:'#8a96a3',fontSize:'13px'}}>{historyVisits.length} visits recorded</p>
                </div>
                <button style={{padding:'8px 16px',borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',fontSize:'13px',cursor:'pointer',color:'#555'}}
                  onClick={()=>setHistorySchool(null)}>✕ Close</button>
              </div>
              {historyVisits.length===0?<p style={{color:'#888'}}>No visits yet.</p>:(
                <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                  {historyVisits.map(v=>(
                    <div key={v.id} style={{background:'#f8f9fa',borderRadius:'10px',padding:'16px',border:'1px solid #f0f0f0'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',flexWrap:'wrap'}}>
                        <span style={{padding:'4px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',background:'#1eb457',color:'#fff'}}>Visit {v.visit_number}</span>
                        <span style={{fontSize:'13px',color:'#555'}}>{v.date_of_visit?new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</span>
                        {badge(v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad',v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone')}
                        {badge(v.club_running?'#eafaf1':'#fdedec',v.club_running?'#1a8a4a':'#e74c3c',v.club_running?'✅ Running':'❌ Not running')}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'6px',fontSize:'13px',color:'#555',marginBottom:'8px'}}>
                        <div><b>Mentor:</b> {v.mentor_name||'—'}</div>
                        <div><b>Learners:</b> {v.total_learners||0} ({v.male_learners||0}M/{v.female_learners||0}F)</div>
                        <div><b>Engagement:</b> {v.engagement_rating||'—'}</div>
                        <div><b>Pathway:</b> {v.pathway_name||'—'}</div>
                        <div><b>Level:</b> {v.scratch_level||'—'}</div>
                        <div><b>Confidence:</b> {v.club_leader_confidence||'—'}</div>
                        <div><b>Devices:</b> {v.device_count||0}</div>
                        <div><b>Projects:</b> {v.creating_projects?'Yes':'No'}</div>
                      </div>
                      {v.observations&&<p style={{fontSize:'13px',color:'#555',margin:'6px 0',padding:'8px',background:'#fff',borderRadius:'6px',border:'1px solid #f0f0f0'}}><b>Observations:</b> {v.observations}</p>}
                      {v.challenges&&<p style={{fontSize:'13px',color:'#555',margin:'6px 0',padding:'8px',background:'#fff',borderRadius:'6px',border:'1px solid #f0f0f0'}}><b>Challenges:</b> {v.challenges}</p>}
                      {v.actions_agreed&&<p style={{fontSize:'13px',color:'#555',margin:'6px 0',padding:'8px',background:'#fff',borderRadius:'6px',border:'1px solid #f0f0f0'}}><b>Actions:</b> {v.actions_agreed}</p>}
                      <div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>
                        {v.recommended_star_club&&badge('#fef9e7','#a0720a','⭐ Star Club')}
                        {v.flag_school&&badge('#fdedec','#e74c3c','🚩 Flagged')}
                        {v.next_visit_date&&badge('#e8f4fd','#2980b9',`📅 Next: ${new Date(v.next_visit_date).toLocaleDateString('en-GB')}`)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </>)}

      {tab==='training'&&(
        <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
          <div style={{padding:'20px 24px',borderBottom:'1px solid #f0f0f0'}}>
            <p style={{fontSize:'15px',fontWeight:'600',color:'#1a2332',margin:'0 0 4px'}}>Capacity Building — RPF 2026</p>
            <p style={{fontSize:'12px',color:'#8a96a3',margin:0}}>Training sessions and onboarding records</p>
          </div>
          <p style={{padding:'40px',textAlign:'center',color:'#888'}}>Capacity building records coming soon. 🚀</p>
        </div>
      )}
    </Layout>
  );
}