// src/pages/MandE.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const EMPTY_FORM = {
  school_id:'', date_of_visit:new Date().toISOString().split('T')[0],
  is_first_visit:false, engagement_type:'Physical Visit',
  latitude:'', longitude:'', gps_raw:'',
  club_running:true, not_running_reason:'', activation_actions:'',
  club_day:'', time_band:'', device_count:'',
  total_learners:'', male_learners:'', female_learners:'',
  engagement_rating:'', pathway_id:'', scratch_level:'',
  creating_projects:false, project_id:'', project_notes:'',
  observations:'', phone_call_notes:'', challenges:'',
  club_leader_confidence:'', actions_agreed:'',
  recommended_star_club:false, star_club_reason:'',
  flag_school:false, flag_reason:'',
  next_visit_date:'', other_details:'',
};

const ENGAGEMENT_RATINGS = ['Very Active','Active','Moderate','Low'];
const CONFIDENCE_LEVELS  = ['Very Confident','Confident','Developing','Needs Support'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Multiple days'];

const StableInput = ({ value, onChange, type='text', placeholder='', style={}, readOnly=false }) => {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = value??''; }, [value]);
  return <input ref={ref} type={type} placeholder={placeholder} readOnly={readOnly} style={style} defaultValue={value??''} onChange={e => onChange(e.target.value)} />;
};

const StableTextarea = ({ value, onChange, placeholder='', rows=3, style={} }) => {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = value??''; }, [value]);
  return <textarea ref={ref} placeholder={placeholder} rows={rows} style={{...style, resize:'vertical'}} defaultValue={value??''} onChange={e => onChange(e.target.value)} />;
};

export default function MandE() {
  const [activeTab, setActiveTab] = useState('observations');
  const [schools, setSchools] = useState([]);
  const [visits, setVisits] = useState([]);
  const [pathwaysData, setPathwaysData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolVisits, setSchoolVisits] = useState([]);
  const [filterSchool, setFilterSchool] = useState('');
  const [filterEngagement, setFilterEngagement] = useState('');
  const [search, setSearch] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const selectedPathway = pathwaysData.find(p => p.id === form.pathway_id);

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
      setPathwaysData(p.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const set = useCallback((field, val) => setForm(f => ({ ...f, [field]: val })), []);

  const openAdd = () => {
    setEditingVisit(null);
    setForm({ ...EMPTY_FORM, date_of_visit: new Date().toISOString().split('T')[0] });
    setSchoolSearch(''); setShowDropdown(false);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const openEdit = (visit) => {
    setEditingVisit(visit);
    setForm({
      school_id:visit.school_id||'', date_of_visit:visit.date_of_visit?.split('T')[0]||'',
      is_first_visit:visit.is_first_visit||false, engagement_type:visit.engagement_type||'Physical Visit',
      latitude:visit.latitude||'', longitude:visit.longitude||'', gps_raw:visit.gps_raw||'',
      club_running:visit.club_running??true, not_running_reason:visit.not_running_reason||'',
      activation_actions:visit.activation_actions||'', club_day:visit.club_day||'',
      time_band:visit.time_band||'', device_count:visit.device_count||'',
      total_learners:visit.total_learners||'', male_learners:visit.male_learners||'',
      female_learners:visit.female_learners||'', engagement_rating:visit.engagement_rating||'',
      pathway_id:visit.pathway_id||'', scratch_level:visit.scratch_level||'',
      creating_projects:visit.creating_projects||false, project_id:visit.project_id||'',
      project_notes:visit.project_notes||'', observations:visit.observations||'',
      phone_call_notes:visit.phone_call_notes||'', challenges:visit.challenges||'',
      club_leader_confidence:visit.club_leader_confidence||'', actions_agreed:visit.actions_agreed||'',
      recommended_star_club:visit.recommended_star_club||false, star_club_reason:visit.star_club_reason||'',
      flag_school:visit.flag_school||false, flag_reason:visit.flag_reason||'',
      next_visit_date:visit.next_visit_date?.split('T')[0]||'', other_details:visit.other_details||'',
    });
    setSchoolSearch(visit.school_name||''); setShowDropdown(false);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude', pos.coords.latitude); set('longitude', pos.coords.longitude);
        set('gps_raw', `${pos.coords.latitude} ${pos.coords.longitude} 0 ${pos.coords.accuracy}`);
        setGpsLoading(false);
      },
      err => { alert('GPS not available: ' + err.message); setGpsLoading(false); }
    );
  };

  const handleSave = async () => {
    if (!form.school_id) return alert('Please select a school or centre');
    if (!form.date_of_visit) return alert('Date of visit is required');
    setSaving(true);
    try {
      if (editingVisit) { await api.put(`/visits/${editingVisit.id}`, form); }
      else { await api.post('/visits', form); }
      setShowForm(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this observation?')) return;
    try { await api.delete(`/visits/${id}`); fetchData(); } catch { alert('Failed to delete'); }
  };

  const viewSchoolHistory = async (school) => {
    setSelectedSchool(school);
    try { const res = await api.get(`/visits/school/${school.id}`); setSchoolVisits(res.data); }
    catch { setSchoolVisits([]); }
  };

  const filteredVisits = visits.filter(v => {
    if (filterSchool && v.school_id !== filterSchool) return false;
    if (filterEngagement && v.engagement_rating !== filterEngagement) return false;
    if (search && !v.school_name?.toLowerCase().includes(search.toLowerCase()) && !v.mentor_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredSchools = schools.filter(s =>
    !schoolSearch || s.official_name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.club_id?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.county?.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const visitCountForSchool = visits.filter(v => v.school_id === form.school_id).length;
  const currentVisitNumber = editingVisit ? editingVisit.visit_number : visitCountForSchool + 1;

  const totalVisits=visits.length, physicalVisits=visits.filter(v=>v.engagement_type==='Physical Visit').length;
  const phoneVisits=visits.filter(v=>v.engagement_type==='Phone Call').length;
  const clubsRunning=visits.filter(v=>v.club_running).length, flagged=visits.filter(v=>v.flag_school||!v.club_running).length;
  const totalLearners=visits.reduce((sum,v)=>sum+(parseInt(v.total_learners)||0),0);

  const SectionTitle = ({icon,title}) => <div style={S.st}><span>{icon}</span><span>{title}</span></div>;
  const Field = ({label,required,full,children}) => (
    <div style={{...S.field,...(full?{gridColumn:'1/-1'}:{})}}>
      <label style={S.fl}>{label}{required&&<span style={{color:'#e74c3c'}}> *</span>}</label>
      {children}
    </div>
  );
  const Toggle = ({field,yes,no,color='#1eb457'}) => (
    <label style={S.toggleRow}>
      <div style={{...S.track,background:form[field]?color:'#ddd'}} onClick={()=>set(field,!form[field])}>
        <div style={{...S.thumb,transform:form[field]?'translateX(20px)':'translateX(0)'}}/>
      </div>
      <span style={{color:form[field]?color:'#555',fontWeight:'500'}}>{form[field]?yes:no}</span>
    </label>
  );

  return (
    <Layout title="M & E" subtitle="Session Observations · Visit Tracking · RPF 2026">
      <div style={S.tabs}>
        {[{key:'observations',label:'📋 Session Observations'},{key:'training',label:'🎓 Capacity Building'}].map(tab=>(
          <button key={tab.key} style={{...S.tab,borderBottom:activeTab===tab.key?'2px solid #1eb457':'2px solid transparent',color:activeTab===tab.key?'#1eb457':'#888',fontWeight:activeTab===tab.key?'600':'400'}} onClick={()=>setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>

      {activeTab==='observations'&&(<>
        <div style={S.cards}>
          {[{label:'TOTAL VISITS',value:totalVisits,color:'#69A9C9'},{label:'PHYSICAL VISITS',value:physicalVisits,color:'#1eb457'},
            {label:'PHONE CALLS',value:phoneVisits,color:'#9b59b6'},{label:'CLUBS RUNNING',value:clubsRunning,color:'#F7941D'},
            {label:'FLAGGED',value:flagged,color:'#e74c3c'},{label:'LEARNERS REACHED',value:totalLearners,color:'#1abc9c'}].map(c=>(
            <div key={c.label} style={{...S.card,borderTop:`4px solid ${c.color}`}}>
              <p style={S.cl}>{c.label}</p><p style={{...S.cv,color:c.color}}>{c.value}</p>
            </div>
          ))}
        </div>

        {!showForm&&<div style={{marginBottom:'16px',display:'flex',justifyContent:'flex-end'}}><button style={S.addBtn} onClick={openAdd}>📝 Record New Observation</button></div>}

        {showForm&&(
          <div style={S.formCard}>
            <div style={S.formHeader}>
              <h2 style={S.formTitle}>{editingVisit?'✏️ Edit Observation':'📝 New Session Observation'}</h2>
              <button style={S.closeBtn} onClick={()=>setShowForm(false)}>✕ Cancel</button>
            </div>

            {/* S1 — Identity */}
            <SectionTitle icon="🏷️" title="Section 1 — Visit Identity"/>
            <div style={S.g2}>
              <Field label="School / Community Centre" required full>
                <div style={{position:'relative'}}>
                  <input style={S.inp} placeholder="🔍 Type to search school or centre..."
                    value={schoolSearch} autoComplete="off"
                    onChange={e=>{setSchoolSearch(e.target.value);setShowDropdown(true);if(form.school_id)set('school_id','');}}
                    onFocus={()=>setShowDropdown(true)}
                    onBlur={()=>setTimeout(()=>setShowDropdown(false),200)}/>
                  {showDropdown&&schoolSearch&&!form.school_id&&filteredSchools.length>0&&(
                    <div style={S.dd}>
                      {filteredSchools.slice(0,8).map(s=>(
                        <div key={s.id} style={S.ddi}
                          onMouseDown={()=>{set('school_id',s.id);setSchoolSearch(`${s.official_name} (${s.club_id})`);setShowDropdown(false);}}>
                          <strong>{s.official_name}</strong>
                          <span style={{color:'#8a96a3',fontSize:'12px'}}> — {s.club_id} · {s.county} · {s.type==='community_centre'?'Centre':'School'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {form.school_id&&<div style={S.sel}>✅ Selected: {schoolSearch} <button style={S.clrBtn} onClick={()=>{set('school_id','');setSchoolSearch('');}}>✕ Change</button></div>}
              </Field>

              <Field label="Date of Visit" required>
                <input style={S.inp} type="date" value={form.date_of_visit} onChange={e=>set('date_of_visit',e.target.value)}/>
              </Field>

              <Field label="Mentor">
                <input style={{...S.inp,background:'#f8f9fa',color:'#888'}} value={user.full_name||'Current Mentor'} readOnly/>
              </Field>

              <Field label="Visit Status">
                <div style={S.infoBadge}>
                  {form.school_id?(editingVisit?`✏️ Editing Visit #${currentVisitNumber}`:`📍 This will be Visit #${currentVisitNumber}`):'← Select a school first'}
                </div>
              </Field>
            </div>

            {/* S2 — Location */}
            <SectionTitle icon="📍" title="Section 2 — Location & Engagement"/>
            <div style={S.g2}>
              <Field label="Type of Engagement" required>
                <select style={S.inp} value={form.engagement_type} onChange={e=>set('engagement_type',e.target.value)}>
                  <option value="Physical Visit">🏫 Physical Visit</option>
                  <option value="Phone Call">📞 Phone Call</option>
                </select>
              </Field>
              <Field label="GPS Location">
                <div style={{display:'flex',gap:'8px'}}>
                  <input style={{...S.inp,flex:1,background:'#f8f9fa'}} readOnly
                    value={form.latitude&&form.longitude?`${parseFloat(form.latitude).toFixed(5)}, ${parseFloat(form.longitude).toFixed(5)}`:'Not captured yet'}/>
                  <button style={S.gpsBtn} onClick={captureGPS} disabled={gpsLoading}>{gpsLoading?'⏳':'📡 Get GPS'}</button>
                </div>
              </Field>
              <Field label="Has the club started?" full>
                <Toggle field="club_running" yes="✅ Yes — Club is running" no="❌ No — Club not running"/>
              </Field>
              {!form.club_running&&(<>
                <Field label="Main reason club not running">
                  <StableTextarea value={form.not_running_reason} style={S.ta} onChange={v=>set('not_running_reason',v)} placeholder="What is the main reason the club is not running?"/>
                </Field>
                <Field label="Actions to activate the club">
                  <StableTextarea value={form.activation_actions} style={S.ta} onChange={v=>set('activation_actions',v)} placeholder="What steps will activate the club?"/>
                </Field>
              </>)}
            </div>

            {/* S3 — Schedule */}
            <SectionTitle icon="🗓️" title="Section 3 — Session Schedule"/>
            <div style={S.g2}>
              <Field label="What day is Code Club conducted?">
                <select style={S.inp} value={form.club_day} onChange={e=>set('club_day',e.target.value)}>
                  <option value="">— Select day —</option>
                  {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Time band (e.g. Tuesday 2PM - 4PM)">
                <StableInput value={form.time_band} style={S.inp} onChange={v=>set('time_band',v)} placeholder="e.g. Tuesday 2PM - 4PM"/>
              </Field>
            </div>

            {/* S4 — Learners */}
            <SectionTitle icon="👥" title="Section 4 — Learners & Devices"/>
            <div style={S.g3}>
              {[['device_count','Devices available for learners'],['total_learners','Total learners engaged'],['male_learners','Male learners'],['female_learners','Female learners']].map(([f,l])=>(
                <Field key={f} label={l}>
                  <StableInput value={form[f]} style={S.inp} type="number" onChange={v=>set(f,v)} placeholder="0"/>
                </Field>
              ))}
              <Field label="Learner engagement rating">
                <select style={S.inp} value={form.engagement_rating} onChange={e=>set('engagement_rating',e.target.value)}>
                  <option value="">— Select rating —</option>
                  {ENGAGEMENT_RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {/* S5 — Learning */}
            <SectionTitle icon="📚" title="Section 5 — Learning Progress"/>
            <div style={S.g2}>
              <Field label="Pathway being followed">
                <select style={S.inp} value={form.pathway_id} onChange={e=>{set('pathway_id',e.target.value);set('scratch_level','');set('project_id','');}}>
                  <option value="">— Select pathway —</option>
                  {pathwaysData.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Level reached">
                <select style={S.inp} value={form.scratch_level} onChange={e=>set('scratch_level',e.target.value)} disabled={!form.pathway_id}>
                  <option value="">— {form.pathway_id?'Select level':'Select pathway first'} —</option>
                  {form.pathway_id&&['Level 1','Level 2','Level 3','Optional Module 1','Optional Module 2','Optional Module 3'].map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Are learners creating individual/peer projects?" full>
                <Toggle field="creating_projects" yes="✅ Yes — Creating projects" no="❌ Not yet"/>
              </Field>
              {form.creating_projects&&(<>
                <Field label="Which project? (from pathway)">
                  <select style={S.inp} value={form.project_id} onChange={e=>set('project_id',e.target.value)}>
                    <option value="">— Select project —</option>
                    {(selectedPathway?.projects||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="other">Other / Not listed</option>
                  </select>
                </Field>
                <Field label="Project notes / description">
                  <StableTextarea value={form.project_notes} style={S.ta} onChange={v=>set('project_notes',v)} placeholder="Describe the project learners are working on..."/>
                </Field>
              </>)}
            </div>

            {/* S6 — Observations */}
            <SectionTitle icon="👁️" title="Section 6 — Observations"/>
            <div style={S.g1}>
              {form.engagement_type==='Physical Visit'&&(
                <Field label="What was done / observations during the physical session?" full>
                  <StableTextarea value={form.observations} style={{...S.ta,height:'100px'}} onChange={v=>set('observations',v)} placeholder="Describe what happened during the session..."/>
                </Field>
              )}
              {form.engagement_type==='Phone Call'&&(
                <Field label="If monitoring was through a phone call — what was discussed?" full>
                  <StableTextarea value={form.phone_call_notes} style={S.ta} onChange={v=>set('phone_call_notes',v)} placeholder="Briefly describe what was discussed..."/>
                </Field>
              )}
              <Field label="Challenges observed / faced during the visit" full>
                <StableTextarea value={form.challenges} style={S.ta} onChange={v=>set('challenges',v)} placeholder="Any challenges or obstacles..."/>
              </Field>
              <Field label="Club leader's level of confidence observed during the session">
                <select style={S.inp} value={form.club_leader_confidence} onChange={e=>set('club_leader_confidence',e.target.value)}>
                  <option value="">— Select confidence level —</option>
                  {CONFIDENCE_LEVELS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* S7 — Actions */}
            <SectionTitle icon="⚡" title="Section 7 — Actions & Follow-up"/>
            <div style={S.g2}>
              <Field label="Actions agreed / intended for this visit" full>
                <StableTextarea value={form.actions_agreed} style={S.ta} onChange={v=>set('actions_agreed',v)} placeholder="What actions were agreed upon this visit?"/>
              </Field>
              <Field label="Next visit date">
                <input style={S.inp} type="date" value={form.next_visit_date} onChange={e=>set('next_visit_date',e.target.value)}/>
              </Field>
              <Field label="Recommend for Star Club?" full>
                <Toggle field="recommended_star_club" yes="⭐ Yes — Recommend for Star Club" no="⭐ Not recommended yet" color="#F5C518"/>
              </Field>
              {form.recommended_star_club&&(
                <Field label="Why recommend for Star Club?" full>
                  <StableTextarea value={form.star_club_reason} style={S.ta} onChange={v=>set('star_club_reason',v)} placeholder="Reason for Star Club nomination..."/>
                </Field>
              )}
              <Field label="Flag this school / centre?" full>
                <Toggle field="flag_school" yes="🚩 Yes — Flag this club" no="✅ No flag needed" color="#e74c3c"/>
              </Field>
              {form.flag_school&&(
                <Field label="Flag reason" full>
                  <StableTextarea value={form.flag_reason} style={S.ta} onChange={v=>set('flag_reason',v)} placeholder="Reason for flagging..."/>
                </Field>
              )}
            </div>

            {/* S8 — Other */}
            <SectionTitle icon="📝" title="Section 8 — Other Details"/>
            <div style={S.g1}>
              <Field label="Capture any other details here" full>
                <StableTextarea value={form.other_details} style={S.ta} onChange={v=>set('other_details',v)} placeholder="Any additional information not captured above..."/>
              </Field>
            </div>

            {/* Auto-populate preview */}
            {(form.recommended_star_club||form.flag_school||!form.club_running||(form.pathway_id&&form.scratch_level))&&(
              <div style={S.autoNote}>
                <p style={{margin:'0 0 8px',fontWeight:'700',fontSize:'13px',color:'#2980b9'}}>⚡ On submit, this will auto-populate:</p>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {form.recommended_star_club&&<span style={{...S.ab,background:'#fef9e7',color:'#a0720a'}}>⭐ Star Club</span>}
                  {(form.flag_school||!form.club_running)&&<span style={{...S.ab,background:'#fdedec',color:'#e74c3c'}}>🚩 Flags & Alerts</span>}
                  {form.pathway_id&&form.scratch_level&&<span style={{...S.ab,background:'#e8f4fd',color:'#2980b9'}}>🗺️ Pathway Progress</span>}
                </div>
              </div>
            )}

            <div style={S.fa}>
              <button style={S.cancelBtn} onClick={()=>setShowForm(false)}>Cancel</button>
              <button style={S.saveBtn} onClick={handleSave} disabled={saving}>{saving?'⏳ Saving...':editingVisit?'💾 Update Observation':'✅ Submit Observation'}</button>
            </div>
          </div>
        )}

        {/* Visits List */}
        {!showForm&&(<>
          <div style={S.filterBar}>
            <div style={S.filters}>
              <input style={S.search} placeholder="🔍 Search school or mentor..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <select style={S.select} value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
                <option value="">All Schools</option>
                {schools.map(s=><option key={s.id} value={s.id}>{s.official_name}</option>)}
              </select>
              <select style={S.select} value={filterEngagement} onChange={e=>setFilterEngagement(e.target.value)}>
                <option value="">All Ratings</option>
                {ENGAGEMENT_RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              {(filterSchool||filterEngagement||search)&&<button style={S.clearBtn} onClick={()=>{setFilterSchool('');setFilterEngagement('');setSearch('');}}>✕ Clear</button>}
            </div>
          </div>

          <div style={S.tableCard}>
            <div style={S.tableHeader}>
              <p style={S.tableTitle}>Session observations — RPF 2026</p>
              <p style={S.tableSub}>{filteredVisits.length} of {visits.length} observations</p>
            </div>
            {loading?<p style={{color:'#888',padding:'20px'}}>Loading...</p>:(
              <div style={{overflowX:'auto'}}>
                <table style={S.table}>
                  <thead>
                    <tr style={S.thead}>
                      {['VISIT #','SCHOOL / CENTRE','MENTOR','DATE','TYPE','CLUB','LEARNERS','ENGAGEMENT','LEVEL','FLAGS','ACTIONS'].map(h=>(
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map((v,i)=>(
                      <tr key={v.id} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                        <td style={{...S.td,fontWeight:'700',color:'#1eb457'}}>Visit {v.visit_number}</td>
                        <td style={{...S.td,fontWeight:'500',color:'#1a2332'}}>
                          <div>{v.school_name}</div>
                          <div style={{fontSize:'11px',color:'#8a96a3'}}>{v.club_id} · {v.county}</div>
                        </td>
                        <td style={S.td}>{v.mentor_name||'—'}</td>
                        <td style={S.td}>{v.date_of_visit?new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                        <td style={S.td}>
                          <span style={{...S.badge,background:v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',color:v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad'}}>
                            {v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{...S.badge,background:v.club_running?'#eafaf1':'#fdedec',color:v.club_running?'#1a8a4a':'#e74c3c'}}>
                            {v.club_running?'✅ Running':'❌ Not running'}
                          </span>
                        </td>
                        <td style={S.td}>{v.total_learners||0}</td>
                        <td style={S.td}>
                          {v.engagement_rating&&<span style={{...S.badge,background:v.engagement_rating==='Very Active'?'#eafaf1':v.engagement_rating==='Active'?'#e8f4fd':'#fef9e7',color:v.engagement_rating==='Very Active'?'#1a8a4a':v.engagement_rating==='Active'?'#2980b9':'#a0720a'}}>{v.engagement_rating}</span>}
                        </td>
                        <td style={S.td}>{v.scratch_level||'—'}</td>
                        <td style={S.td}>
                          {v.flag_school&&<span style={{...S.badge,background:'#fdedec',color:'#e74c3c',marginRight:'4px'}}>🚩</span>}
                          {v.recommended_star_club&&<span style={{...S.badge,background:'#fef9e7',color:'#a0720a'}}>⭐</span>}
                        </td>
                        <td style={S.td}>
                          <div style={{display:'flex',gap:'4px'}}>
                            <button style={S.hBtn} onClick={()=>viewSchoolHistory({id:v.school_id,official_name:v.school_name})}>📋</button>
                            <button style={S.eBtn} onClick={()=>openEdit(v)}>✏️</button>
                            <button style={S.dBtn} onClick={()=>handleDelete(v.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredVisits.length===0&&(
                      <tr><td colSpan={11} style={{padding:'40px',textAlign:'center',color:'#888'}}>No observations yet. Click "Record New Observation" to start! 📝</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>)}

        {/* History Modal */}
        {selectedSchool&&(
          <div style={S.overlay}>
            <div style={S.historyModal}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                <div>
                  <h3 style={{margin:0,color:'#1a2332'}}>{selectedSchool.official_name}</h3>
                  <p style={{margin:'4px 0 0',color:'#8a96a3',fontSize:'13px'}}>{schoolVisits.length} visits recorded</p>
                </div>
                <button style={S.closeBtn} onClick={()=>setSelectedSchool(null)}>✕ Close</button>
              </div>
              {schoolVisits.length===0?<p style={{color:'#888'}}>No visits yet.</p>:(
                <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                  {schoolVisits.map(v=>(
                    <div key={v.id} style={S.hCard}>
                      <div style={S.hHeader}>
                        <span style={S.vBadge}>Visit {v.visit_number}</span>
                        <span style={{fontSize:'13px',color:'#555'}}>{v.date_of_visit?new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</span>
                        <span style={{...S.badge,background:v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',color:v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad'}}>{v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone'}</span>
                        <span style={{...S.badge,background:v.club_running?'#eafaf1':'#fdedec',color:v.club_running?'#1a8a4a':'#e74c3c'}}>{v.club_running?'✅ Running':'❌ Not running'}</span>
                      </div>
                      <div style={S.hGrid}>
                        <div><b>Mentor:</b> {v.mentor_name||'—'}</div>
                        <div><b>Learners:</b> {v.total_learners||0} ({v.male_learners||0}M/{v.female_learners||0}F)</div>
                        <div><b>Engagement:</b> {v.engagement_rating||'—'}</div>
                        <div><b>Pathway:</b> {v.pathway_name||'—'}</div>
                        <div><b>Level:</b> {v.scratch_level||'—'}</div>
                        <div><b>Confidence:</b> {v.club_leader_confidence||'—'}</div>
                        <div><b>Devices:</b> {v.device_count||0}</div>
                        <div><b>Projects:</b> {v.creating_projects?'Yes':'No'}</div>
                      </div>
                      {v.observations&&<p style={S.hObs}><b>Observations:</b> {v.observations}</p>}
                      {v.challenges&&<p style={S.hObs}><b>Challenges:</b> {v.challenges}</p>}
                      {v.actions_agreed&&<p style={S.hObs}><b>Actions:</b> {v.actions_agreed}</p>}
                      <div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>
                        {v.recommended_star_club&&<span style={{...S.badge,background:'#fef9e7',color:'#a0720a'}}>⭐ Star Club</span>}
                        {v.flag_school&&<span style={{...S.badge,background:'#fdedec',color:'#e74c3c'}}>🚩 Flagged</span>}
                        {v.next_visit_date&&<span style={{...S.badge,background:'#e8f4fd',color:'#2980b9'}}>📅 Next: {new Date(v.next_visit_date).toLocaleDateString('en-GB')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </>)}

      {activeTab==='training'&&(
        <div style={S.tableCard}>
          <div style={S.tableHeader}><p style={S.tableTitle}>Capacity Building — RPF 2026</p><p style={S.tableSub}>Training sessions and onboarding records</p></div>
          <p style={{padding:'40px',textAlign:'center',color:'#888'}}>Capacity building records coming soon. 🚀</p>
        </div>
      )}
    </Layout>
  );
}

const S = {
  tabs:{display:'flex',marginBottom:'20px',borderBottom:'1px solid #e2e8f0'},
  tab:{padding:'10px 20px',background:'none',border:'none',cursor:'pointer',fontSize:'14px'},
  cards:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'12px',marginBottom:'20px'},
  card:{background:'#fff',borderRadius:'12px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  cl:{fontSize:'9px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',margin:'0 0 6px'},
  cv:{fontSize:'28px',fontWeight:'700',margin:0},
  addBtn:{padding:'12px 24px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer'},
  formCard:{background:'#fff',borderRadius:'16px',padding:'28px',boxShadow:'0 2px 16px rgba(0,0,0,0.08)',marginBottom:'24px'},
  formHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',paddingBottom:'16px',borderBottom:'2px solid #f0f0f0'},
  formTitle:{margin:0,fontSize:'20px',fontWeight:'700',color:'#1a2332'},
  closeBtn:{padding:'8px 16px',borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',fontSize:'13px',cursor:'pointer',color:'#555'},
  st:{display:'flex',alignItems:'center',gap:'10px',fontSize:'14px',fontWeight:'700',color:'#1a2332',background:'#f8f9fa',padding:'10px 16px',borderRadius:'8px',marginBottom:'16px',marginTop:'24px'},
  g1:{display:'grid',gridTemplateColumns:'1fr',gap:'16px',marginBottom:'8px'},
  g2:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px',marginBottom:'8px'},
  g3:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px',marginBottom:'8px'},
  field:{display:'flex',flexDirection:'column',gap:'6px',position:'relative'},
  fl:{fontSize:'13px',fontWeight:'600',color:'#555'},
  inp:{padding:'10px 14px',borderRadius:'10px',border:'1.5px solid #e2e8f0',fontSize:'14px',color:'#333',outline:'none',width:'100%',boxSizing:'border-box'},
  ta:{padding:'10px 14px',borderRadius:'10px',border:'1.5px solid #e2e8f0',fontSize:'14px',color:'#333',outline:'none',width:'100%',boxSizing:'border-box',height:'80px'},
  dd:{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:'10px',zIndex:200,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',maxHeight:'240px',overflowY:'auto'},
  ddi:{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #f0f0f0',fontSize:'13px'},
  sel:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'#eafaf1',borderRadius:'8px',fontSize:'13px',color:'#1a8a4a',fontWeight:'600',marginTop:'4px'},
  clrBtn:{background:'none',border:'none',cursor:'pointer',color:'#e74c3c',fontWeight:'700',fontSize:'14px'},
  infoBadge:{padding:'10px 14px',borderRadius:'10px',background:'#f0f7ff',color:'#2980b9',fontSize:'13px',fontWeight:'600',border:'1.5px solid #d0e8ff'},
  gpsBtn:{padding:'10px 14px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'13px',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap'},
  toggleRow:{display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',padding:'8px 0'},
  track:{width:'44px',height:'24px',borderRadius:'12px',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0},
  thumb:{position:'absolute',top:'2px',left:'2px',width:'20px',height:'20px',borderRadius:'50%',background:'#fff',transition:'transform 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'},
  autoNote:{background:'#f0f7ff',borderRadius:'10px',padding:'14px 16px',margin:'20px 0',border:'1px solid #d0e8ff'},
  ab:{padding:'4px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'600'},
  fa:{display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'24px',paddingTop:'16px',borderTop:'2px solid #f0f0f0'},
  saveBtn:{padding:'12px 28px',borderRadius:'10px',border:'none',background:'#1eb457',color:'#fff',fontSize:'15px',fontWeight:'600',cursor:'pointer'},
  cancelBtn:{padding:'12px 24px',borderRadius:'10px',border:'1.5px solid #e2e8f0',background:'#fff',color:'#555',fontSize:'14px',cursor:'pointer'},
  filterBar:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',gap:'12px',flexWrap:'wrap'},
  filters:{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'},
  search:{padding:'8px 12px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'13px',color:'#333',background:'#fff',outline:'none',minWidth:'200px'},
  select:{padding:'8px 10px',borderRadius:'8px',border:'1.5px solid #e2e8f0',fontSize:'12px',color:'#333',background:'#fff',cursor:'pointer'},
  clearBtn:{padding:'8px 12px',borderRadius:'8px',border:'1.5px solid #e74c3c',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#e74c3c'},
  tableCard:{background:'#fff',borderRadius:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'},
  tableHeader:{padding:'20px 24px',borderBottom:'1px solid #f0f0f0'},
  tableTitle:{fontSize:'15px',fontWeight:'600',color:'#1a2332',margin:'0 0 4px'},
  tableSub:{fontSize:'12px',color:'#8a96a3',margin:0},
  table:{width:'100%',borderCollapse:'collapse',minWidth:'900px'},
  thead:{background:'#f8f9fa'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#8a96a3',letterSpacing:'0.5px',borderBottom:'2px solid #f0f0f0',whiteSpace:'nowrap'},
  td:{padding:'10px 14px',fontSize:'13px',color:'#4a5568',verticalAlign:'top'},
  badge:{display:'inline-block',padding:'3px 8px',borderRadius:'999px',fontSize:'11px',fontWeight:'600',whiteSpace:'nowrap'},
  hBtn:{padding:'4px 8px',borderRadius:'6px',border:'1.5px solid #1eb457',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#1eb457'},
  eBtn:{padding:'4px 8px',borderRadius:'6px',border:'1.5px solid #69A9C9',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#69A9C9'},
  dBtn:{padding:'4px 8px',borderRadius:'6px',border:'1.5px solid #e74c3c',background:'#fff',fontSize:'12px',cursor:'pointer',color:'#e74c3c'},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  historyModal:{background:'#fff',borderRadius:'16px',padding:'28px',width:'90%',maxWidth:'700px',maxHeight:'85vh',overflowY:'auto'},
  hCard:{background:'#f8f9fa',borderRadius:'10px',padding:'16px',border:'1px solid #f0f0f0'},
  hHeader:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',flexWrap:'wrap'},
  vBadge:{padding:'4px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'700',background:'#1eb457',color:'#fff'},
  hGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'6px',fontSize:'13px',color:'#555',marginBottom:'8px'},
  hObs:{fontSize:'13px',color:'#555',margin:'6px 0',padding:'8px',background:'#fff',borderRadius:'6px',border:'1px solid #f0f0f0'},
};