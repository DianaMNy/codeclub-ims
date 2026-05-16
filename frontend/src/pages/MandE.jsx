// src/pages/MandE.jsx
import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const EMPTY_FORM = {
  school_id: '',
  date_of_visit: new Date().toISOString().split('T')[0],
  is_first_visit: false,
  engagement_type: 'Physical Visit',
  latitude: '', longitude: '', gps_raw: '',
  club_running: true,
  not_running_reason: '',
  activation_actions: '',
  club_day: '',
  time_band: '',
  device_count: '',
  total_learners: '',
  male_learners: '',
  female_learners: '',
  engagement_rating: '',
  pathway_id: '',
  scratch_level: '',
  creating_projects: false,
  project_id: '',
  project_notes: '',
  observations: '',
  phone_call_notes: '',
  challenges: '',
  club_leader_confidence: '',
  actions_agreed: '',
  recommended_star_club: false,
  star_club_reason: '',
  flag_school: false,
  flag_reason: '',
  next_visit_date: '',
  other_details: '',
};

const ENGAGEMENT_RATINGS = ['Very Active', 'Active', 'Moderate', 'Low'];
const CONFIDENCE_LEVELS  = ['Very Confident', 'Confident', 'Developing', 'Needs Support'];
const SCRATCH_LEVELS     = ['Level 1', 'Level 2', 'Level 3', 'Optional Module 1', 'Optional Module 2', 'Optional Module 3'];
const DAYS_OF_WEEK       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MandE() {
  const [activeTab, setActiveTab]       = useState('observations');
  const [schools, setSchools]           = useState([]);
  const [visits, setVisits]             = useState([]);
  const [pathways, setPathways]         = useState([]);
  const [projects, setProjects]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolVisits, setSchoolVisits] = useState([]);
  const [filterSchool, setFilterSchool] = useState('');
  const [filterEngagement, setFilterEngagement] = useState('');
  const [search, setSearch]             = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchProjects = async (pathwayId) => {
    if (!pathwayId) { setProjects([]); return; }
    try {
      const res = await api.get(`/pathways/${pathwayId}/projects`);
      setProjects(res.data || []);
    } catch { setProjects([]); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditingVisit(null);
    setForm({ ...EMPTY_FORM, date_of_visit: new Date().toISOString().split('T')[0] });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (visit) => {
    setEditingVisit(visit);
    setForm({
      school_id:             visit.school_id || '',
      date_of_visit:         visit.date_of_visit?.split('T')[0] || '',
      is_first_visit:        visit.is_first_visit || false,
      engagement_type:       visit.engagement_type || 'Physical Visit',
      latitude:              visit.latitude || '',
      longitude:             visit.longitude || '',
      gps_raw:               visit.gps_raw || '',
      club_running:          visit.club_running ?? true,
      not_running_reason:    visit.not_running_reason || '',
      activation_actions:    visit.activation_actions || '',
      club_day:              visit.club_day || '',
      time_band:             visit.time_band || '',
      device_count:          visit.device_count || '',
      total_learners:        visit.total_learners || '',
      male_learners:         visit.male_learners || '',
      female_learners:       visit.female_learners || '',
      engagement_rating:     visit.engagement_rating || '',
      pathway_id:            visit.pathway_id || '',
      scratch_level:         visit.scratch_level || '',
      creating_projects:     visit.creating_projects || false,
      project_id:            visit.project_id || '',
      project_notes:         visit.project_notes || '',
      observations:          visit.observations || '',
      phone_call_notes:      visit.phone_call_notes || '',
      challenges:            visit.challenges || '',
      club_leader_confidence:visit.club_leader_confidence || '',
      actions_agreed:        visit.actions_agreed || '',
      recommended_star_club: visit.recommended_star_club || false,
      star_club_reason:      visit.star_club_reason || '',
      flag_school:           visit.flag_school || false,
      flag_reason:           visit.flag_reason || '',
      next_visit_date:       visit.next_visit_date?.split('T')[0] || '',
      other_details:         visit.other_details || '',
    });
    fetchProjects(visit.pathway_id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          gps_raw:   `${pos.coords.latitude} ${pos.coords.longitude} 0 ${pos.coords.accuracy}`,
        }));
        setGpsLoading(false);
      },
      (err) => { alert('GPS not available: ' + err.message); setGpsLoading(false); }
    );
  };

  const handleSave = async () => {
    if (!form.school_id) return alert('Please select a school or centre');
    if (!form.date_of_visit) return alert('Date of visit is required');
    setSaving(true);
    try {
      if (editingVisit) {
        await api.put(`/visits/${editingVisit.id}`, form);
      } else {
        await api.post('/visits', form);
      }
      setShowForm(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this observation?')) return;
    try {
      await api.delete(`/visits/${id}`);
      fetchData();
    } catch (err) { alert('Failed to delete'); }
  };

  const viewSchoolHistory = async (school) => {
    setSelectedSchool(school);
    try {
      const res = await api.get(`/visits/school/${school.id}`);
      setSchoolVisits(res.data);
    } catch { setSchoolVisits([]); }
  };

  const filtered = visits.filter(v => {
    if (filterSchool && v.school_id !== filterSchool) return false;
    if (filterEngagement && v.engagement_rating !== filterEngagement) return false;
    if (search && !v.school_name?.toLowerCase().includes(search.toLowerCase()) &&
        !v.mentor_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalVisits    = visits.length;
  const physicalVisits = visits.filter(v => v.engagement_type === 'Physical Visit').length;
  const phoneVisits    = visits.filter(v => v.engagement_type === 'Phone Call').length;
  const clubsRunning   = visits.filter(v => v.club_running).length;
  const flagged        = visits.filter(v => v.flag_school || !v.club_running).length;
  const totalLearners  = visits.reduce((sum, v) => sum + (parseInt(v.total_learners)||0), 0);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // ── Section header ─────────────────────────────────────────────────────────
  const SectionTitle = ({ icon, title }) => (
    <div style={styles.sectionTitle}>
      <span style={styles.sectionIcon}>{icon}</span>
      <span>{title}</span>
    </div>
  );

  // ── Form input helpers ─────────────────────────────────────────────────────
  const FormField = ({ label, required, children }) => (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}{required && <span style={{color:'#e74c3c'}}> *</span>}</label>
      {children}
    </div>
  );

  const Input = ({ field, type='text', placeholder='', ...props }) => (
    <input style={styles.input} type={type} placeholder={placeholder}
      value={form[field]} onChange={e => set(field, e.target.value)} {...props} />
  );

  const Select = ({ field, children, ...props }) => (
    <select style={styles.input} value={form[field]}
      onChange={e => set(field, e.target.value)} {...props}>
      {children}
    </select>
  );

  const Textarea = ({ field, placeholder='', rows=3 }) => (
    <textarea style={{...styles.input, height:`${rows*40}px`, resize:'vertical'}}
      placeholder={placeholder} value={form[field]}
      onChange={e => set(field, e.target.value)} />
  );

  const Toggle = ({ field, label }) => (
    <label style={styles.toggleLabel}>
      <div style={{...styles.toggleTrack, background: form[field] ? '#1eb457' : '#ddd'}}
        onClick={() => set(field, !form[field])}>
        <div style={{...styles.toggleThumb, transform: form[field] ? 'translateX(20px)' : 'translateX(0)'}} />
      </div>
      <span>{label}</span>
    </label>
  );

  return (
    <Layout title="M & E" subtitle="Session Observations · Visit Tracking · RPF 2026">

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key:'observations', label:'📋 Session Observations' },
          { key:'training',     label:'🎓 Capacity Building' },
        ].map(tab => (
          <button key={tab.key} style={{
            ...styles.tab,
            borderBottom: activeTab===tab.key ? '2px solid #1eb457' : '2px solid transparent',
            color: activeTab===tab.key ? '#1eb457' : '#888',
            fontWeight: activeTab===tab.key ? '600' : '400',
          }} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'observations' && (
        <>
          {/* Stats */}
          <div style={styles.cards}>
            {[
              { label:'TOTAL VISITS',    value:totalVisits,    color:'#69A9C9' },
              { label:'PHYSICAL VISITS', value:physicalVisits, color:'#1eb457' },
              { label:'PHONE CALLS',     value:phoneVisits,    color:'#9b59b6' },
              { label:'CLUBS RUNNING',   value:clubsRunning,   color:'#F7941D' },
              { label:'FLAGGED',         value:flagged,        color:'#e74c3c' },
              { label:'LEARNERS REACHED',value:totalLearners,  color:'#1abc9c' },
            ].map(card => (
              <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
                <p style={styles.cardLabel}>{card.label}</p>
                <p style={{...styles.cardValue, color:card.color}}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Add Observation Button */}
          {!showForm && (
            <div style={{marginBottom:'16px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
              <button style={styles.addBtn} onClick={openAdd}>
                📝 Record New Observation
              </button>
            </div>
          )}

          {/* ── OBSERVATION FORM ─────────────────────────────────────────── */}
          {showForm && (
            <div style={styles.formCard}>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>
                  {editingVisit ? '✏️ Edit Observation' : '📝 New Session Observation'}
                </h2>
                <button style={styles.closeBtn} onClick={() => setShowForm(false)}>✕ Cancel</button>
              </div>

              {/* SECTION 1 — Visit Identity */}
              <SectionTitle icon="🏷️" title="Section 1 — Visit Identity" />
              <div style={styles.grid2}>
                <FormField label="School / Community Centre" required>
                  <Select field="school_id" onChange={e => {
                    set('school_id', e.target.value);
                    const school = schools.find(s => s.id === e.target.value);
                    if (school) {
                      const count = visits.filter(v => v.school_id === e.target.value).length;
                      set('is_first_visit', count === 0);
                    }
                  }}>
                    <option value="">— Select school or centre —</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.official_name} ({s.club_id}) — {s.county}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Date of Visit" required>
                  <Input field="date_of_visit" type="date" />
                </FormField>

                <FormField label="Mentor">
                  <input style={{...styles.input, background:'#f8f9fa', color:'#888'}}
                    value={user.full_name || 'Current Mentor'} readOnly />
                </FormField>

                <FormField label="Visit Status">
                  <div style={styles.infoBadge}>
                    {form.is_first_visit ? '🆕 First visit to this club' :
                      `📍 Visit #${visits.filter(v => v.school_id === form.school_id).length + 1}`}
                  </div>
                </FormField>
              </div>

              {/* SECTION 2 — Location & Engagement */}
              <SectionTitle icon="📍" title="Section 2 — Location & Engagement" />
              <div style={styles.grid2}>
                <FormField label="Type of Engagement" required>
                  <Select field="engagement_type">
                    <option value="Physical Visit">🏫 Physical Visit</option>
                    <option value="Phone Call">📞 Phone Call</option>
                  </Select>
                </FormField>

                <FormField label="GPS Location">
                  <div style={{display:'flex', gap:'8px'}}>
                    <input style={{...styles.input, flex:1, background:'#f8f9fa'}}
                      value={form.latitude && form.longitude
                        ? `${parseFloat(form.latitude).toFixed(5)}, ${parseFloat(form.longitude).toFixed(5)}`
                        : 'Not captured'}
                      readOnly />
                    <button style={styles.gpsBtn} onClick={captureGPS} disabled={gpsLoading}>
                      {gpsLoading ? '⏳' : '📡 Get GPS'}
                    </button>
                  </div>
                </FormField>
              </div>

              <div style={styles.grid2}>
                <FormField label="Has the club started?">
                  <Toggle field="club_running" label={form.club_running ? '✅ Yes — Club is running' : '❌ No — Club not running'} />
                </FormField>

                {!form.club_running && (
                  <>
                    <FormField label="Reason club not running">
                      <Textarea field="not_running_reason" placeholder="Main reason..." rows={2} />
                    </FormField>
                    <FormField label="Actions to activate club">
                      <Textarea field="activation_actions" placeholder="Steps to activate..." rows={2} />
                    </FormField>
                  </>
                )}
              </div>

              {/* SECTION 3 — Schedule */}
              <SectionTitle icon="🗓️" title="Section 3 — Session Schedule" />
              <div style={styles.grid2}>
                <FormField label="What day is Code Club conducted?">
                  <Select field="club_day">
                    <option value="">— Select day —</option>
                    {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="Multiple days">Multiple days</option>
                  </Select>
                </FormField>
                <FormField label="Time band (e.g. Tuesday 10AM - 12PM)">
                  <Input field="time_band" placeholder="e.g. Tuesday 2PM - 4PM" />
                </FormField>
              </div>

              {/* SECTION 4 — Learners & Devices */}
              <SectionTitle icon="👥" title="Section 4 — Learners & Devices" />
              <div style={styles.grid3}>
                <FormField label="Devices available for learners">
                  <Input field="device_count" type="number" placeholder="0" />
                </FormField>
                <FormField label="Total learners engaged">
                  <Input field="total_learners" type="number" placeholder="0" />
                </FormField>
                <FormField label="Male learners">
                  <Input field="male_learners" type="number" placeholder="0" />
                </FormField>
                <FormField label="Female learners">
                  <Input field="female_learners" type="number" placeholder="0" />
                </FormField>
                <FormField label="Learner engagement rating">
                  <Select field="engagement_rating">
                    <option value="">— Select rating —</option>
                    {ENGAGEMENT_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </FormField>
              </div>

              {/* SECTION 5 — Learning Progress */}
              <SectionTitle icon="📚" title="Section 5 — Learning Progress" />
              <div style={styles.grid2}>
                <FormField label="Pathway being followed">
                  <Select field="pathway_id" onChange={e => {
                    set('pathway_id', e.target.value);
                    fetchProjects(e.target.value);
                  }}>
                    <option value="">— Select pathway —</option>
                    {pathways.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </FormField>

                <FormField label="Scratch level reached">
                  <Select field="scratch_level">
                    <option value="">— Select level —</option>
                    {SCRATCH_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </Select>
                </FormField>

                <FormField label="Are learners creating individual/peer projects?">
                  <Toggle field="creating_projects"
                    label={form.creating_projects ? '✅ Yes — Creating projects' : '❌ Not yet'} />
                </FormField>

                {form.creating_projects && (
                  <>
                    <FormField label="Which project?">
                      <Select field="project_id">
                        <option value="">— Select project —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="other">Other (describe below)</option>
                      </Select>
                    </FormField>
                    <FormField label="Project notes / description">
                      <Textarea field="project_notes" placeholder="Describe the project..." rows={2} />
                    </FormField>
                  </>
                )}
              </div>

              {/* SECTION 6 — Observations */}
              <SectionTitle icon="👁️" title="Section 6 — Observations" />
              <div style={styles.grid1}>
                {form.engagement_type === 'Physical Visit' && (
                  <FormField label="What was done / observations during the physical session?">
                    <Textarea field="observations" placeholder="Describe what happened during the session..." rows={4} />
                  </FormField>
                )}
                {form.engagement_type === 'Phone Call' && (
                  <FormField label="If monitoring was through a phone call, briefly describe what was discussed">
                    <Textarea field="phone_call_notes" placeholder="What was discussed during the call..." rows={3} />
                  </FormField>
                )}
                <FormField label="Challenges observed / faced during the visit">
                  <Textarea field="challenges" placeholder="Any challenges or obstacles..." rows={3} />
                </FormField>
                <FormField label="Club leader's level of confidence observed">
                  <Select field="club_leader_confidence">
                    <option value="">— Select confidence level —</option>
                    {CONFIDENCE_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
              </div>

              {/* SECTION 7 — Actions & Follow-up */}
              <SectionTitle icon="⚡" title="Section 7 — Actions & Follow-up" />
              <div style={styles.grid2}>
                <FormField label="Actions agreed / intended for this visit">
                  <Textarea field="actions_agreed" placeholder="What actions were agreed..." rows={3} />
                </FormField>

                <FormField label="Next visit date">
                  <Input field="next_visit_date" type="date" />
                </FormField>

                <FormField label="Recommend for Star Club?">
                  <Toggle field="recommended_star_club"
                    label={form.recommended_star_club ? '⭐ Yes — Recommend for Star Club' : '❌ Not recommended'} />
                </FormField>

                {form.recommended_star_club && (
                  <FormField label="Why recommend for Star Club?">
                    <Textarea field="star_club_reason" placeholder="Reason for Star Club nomination..." rows={2} />
                  </FormField>
                )}

                <FormField label="Flag this school / centre?">
                  <Toggle field="flag_school"
                    label={form.flag_school ? '🚩 Yes — Flag this club' : '✅ No flag needed'} />
                </FormField>

                {form.flag_school && (
                  <FormField label="Flag reason">
                    <Textarea field="flag_reason" placeholder="Reason for flagging..." rows={2} />
                  </FormField>
                )}
              </div>

              {/* SECTION 8 — Other */}
              <SectionTitle icon="📝" title="Section 8 — Other Details" />
              <div style={styles.grid1}>
                <FormField label="Any other details to capture">
                  <Textarea field="other_details" placeholder="Any additional information..." rows={3} />
                </FormField>
              </div>

              {/* Auto-populate notice */}
              <div style={styles.autoNotice}>
                <p style={{margin:'0 0 6px', fontWeight:'600', fontSize:'13px'}}>⚡ Auto-populate on submit:</p>
                <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                  {form.recommended_star_club && <span style={styles.autoBadge}>⭐ Star Club nomination</span>}
                  {(form.flag_school || !form.club_running) && <span style={{...styles.autoBadge, background:'#fdedec', color:'#e74c3c'}}>🚩 Flag & Alert</span>}
                  {form.pathway_id && form.scratch_level && <span style={{...styles.autoBadge, background:'#e8f4fd', color:'#2980b9'}}>🗺️ Pathway progress</span>}
                  {!form.recommended_star_club && form.club_running && !form.flag_school && !form.pathway_id &&
                    <span style={{color:'#8a96a3', fontSize:'12px'}}>Fill sections above to see auto-populate options</span>}
                </div>
              </div>

              {/* Save */}
              <div style={styles.formActions}>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Saving...' : editingVisit ? '💾 Update Observation' : '✅ Submit Observation'}
                </button>
              </div>
            </div>
          )}

          {/* ── VISITS LIST ───────────────────────────────────────────────── */}
          {!showForm && (
            <>
              {/* Filter Bar */}
              <div style={styles.filterBar}>
                <div style={styles.filters}>
                  <input style={styles.search} placeholder="🔍 Search school or mentor..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <select style={styles.select} value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
                    <option value="">All Schools</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.official_name}</option>)}
                  </select>
                  <select style={styles.select} value={filterEngagement} onChange={e => setFilterEngagement(e.target.value)}>
                    <option value="">All Ratings</option>
                    {ENGAGEMENT_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {(filterSchool||filterEngagement||search) && (
                    <button style={styles.clearBtn} onClick={() => {
                      setFilterSchool(''); setFilterEngagement(''); setSearch('');
                    }}>✕ Clear</button>
                  )}
                </div>
              </div>

              {/* Visits Table */}
              <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <p style={styles.tableTitle}>Session observations — RPF 2026</p>
                  <p style={styles.tableSub}>{filtered.length} of {visits.length} observations</p>
                </div>
                {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
                  <div style={{overflowX:'auto'}}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thead}>
                          <th style={styles.th}>VISIT</th>
                          <th style={styles.th}>SCHOOL / CENTRE</th>
                          <th style={styles.th}>COUNTY</th>
                          <th style={styles.th}>MENTOR</th>
                          <th style={styles.th}>DATE</th>
                          <th style={styles.th}>TYPE</th>
                          <th style={styles.th}>CLUB</th>
                          <th style={styles.th}>LEARNERS</th>
                          <th style={styles.th}>ENGAGEMENT</th>
                          <th style={styles.th}>LEVEL</th>
                          <th style={styles.th}>FLAGS</th>
                          <th style={styles.th}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((v, i) => (
                          <tr key={v.id} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                            <td style={{...styles.td, fontWeight:'700', color:'#1eb457'}}>
                              Visit {v.visit_number}
                            </td>
                            <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>
                              <div>{v.school_name}</div>
                              <div style={{fontSize:'11px', color:'#8a96a3'}}>{v.club_id}</div>
                            </td>
                            <td style={styles.td}>{v.county||'—'}</td>
                            <td style={styles.td}>{v.mentor_name||'—'}</td>
                            <td style={styles.td}>
                              {v.date_of_visit ? new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                            </td>
                            <td style={styles.td}>
                              <span style={{...styles.badge,
                                background: v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',
                                color: v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad'}}>
                                {v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{...styles.badge,
                                background: v.club_running?'#eafaf1':'#fdedec',
                                color: v.club_running?'#1a8a4a':'#e74c3c'}}>
                                {v.club_running?'✅ Running':'❌ Not running'}
                              </span>
                            </td>
                            <td style={styles.td}>{v.total_learners||0}</td>
                            <td style={styles.td}>
                              {v.engagement_rating && (
                                <span style={{...styles.badge,
                                  background: v.engagement_rating==='Very Active'?'#eafaf1':v.engagement_rating==='Active'?'#e8f4fd':'#fef9e7',
                                  color: v.engagement_rating==='Very Active'?'#1a8a4a':v.engagement_rating==='Active'?'#2980b9':'#a0720a'}}>
                                  {v.engagement_rating}
                                </span>
                              )}
                            </td>
                            <td style={styles.td}>{v.scratch_level||'—'}</td>
                            <td style={styles.td}>
                              {v.flag_school && <span style={{...styles.badge, background:'#fdedec', color:'#e74c3c'}}>🚩 Flagged</span>}
                              {v.recommended_star_club && <span style={{...styles.badge, background:'#fef9e7', color:'#a0720a'}}>⭐ Star</span>}
                            </td>
                            <td style={styles.td}>
                              <div style={{display:'flex', gap:'4px'}}>
                                <button style={styles.historyBtn}
                                  onClick={() => viewSchoolHistory({id:v.school_id, official_name:v.school_name})}>
                                  📋 History
                                </button>
                                <button style={styles.editBtn} onClick={() => openEdit(v)}>✏️</button>
                                <button style={styles.deleteBtn} onClick={() => handleDelete(v.id)}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr><td colSpan={12} style={{padding:'40px', textAlign:'center', color:'#888'}}>
                            No observations yet. Click "Record New Observation" to start! 📝
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── SCHOOL VISIT HISTORY MODAL ────────────────────────────────── */}
          {selectedSchool && (
            <div style={styles.overlay}>
              <div style={styles.historyModal}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                  <div>
                    <h3 style={{margin:0, color:'#1a2332'}}>{selectedSchool.official_name}</h3>
                    <p style={{margin:'4px 0 0', color:'#8a96a3', fontSize:'13px'}}>
                      Visit history trail — {schoolVisits.length} visits recorded
                    </p>
                  </div>
                  <button style={styles.closeBtn} onClick={() => setSelectedSchool(null)}>✕ Close</button>
                </div>
                {schoolVisits.length === 0 ? (
                  <p style={{color:'#888'}}>No visits recorded for this school yet.</p>
                ) : (
                  <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                    {schoolVisits.map(v => (
                      <div key={v.id} style={styles.historyCard}>
                        <div style={styles.historyHeader}>
                          <span style={styles.visitBadge}>Visit {v.visit_number}</span>
                          <span style={{fontSize:'13px', color:'#555'}}>
                            {v.date_of_visit ? new Date(v.date_of_visit).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                          </span>
                          <span style={{...styles.badge,
                            background:v.engagement_type==='Physical Visit'?'#eafaf1':'#f5eef8',
                            color:v.engagement_type==='Physical Visit'?'#1a8a4a':'#8e44ad'}}>
                            {v.engagement_type==='Physical Visit'?'🏫 Physical':'📞 Phone'}
                          </span>
                          <span style={{...styles.badge,
                            background:v.club_running?'#eafaf1':'#fdedec',
                            color:v.club_running?'#1a8a4a':'#e74c3c'}}>
                            {v.club_running?'✅ Running':'❌ Not running'}
                          </span>
                        </div>
                        <div style={styles.historyGrid}>
                          <div><span style={styles.historyKey}>Mentor:</span> {v.mentor_name||'—'}</div>
                          <div><span style={styles.historyKey}>Learners:</span> {v.total_learners||0} ({v.male_learners||0}M / {v.female_learners||0}F)</div>
                          <div><span style={styles.historyKey}>Engagement:</span> {v.engagement_rating||'—'}</div>
                          <div><span style={styles.historyKey}>Level:</span> {v.scratch_level||'—'}</div>
                          <div><span style={styles.historyKey}>Devices:</span> {v.device_count||0}</div>
                          <div><span style={styles.historyKey}>Confidence:</span> {v.club_leader_confidence||'—'}</div>
                        </div>
                        {v.observations && <p style={styles.historyObs}><strong>Observations:</strong> {v.observations}</p>}
                        {v.challenges && <p style={styles.historyObs}><strong>Challenges:</strong> {v.challenges}</p>}
                        {v.actions_agreed && <p style={styles.historyObs}><strong>Actions:</strong> {v.actions_agreed}</p>}
                        <div style={{display:'flex', gap:'6px', marginTop:'8px'}}>
                          {v.recommended_star_club && <span style={{...styles.badge,background:'#fef9e7',color:'#a0720a'}}>⭐ Star Club</span>}
                          {v.flag_school && <span style={{...styles.badge,background:'#fdedec',color:'#e74c3c'}}>🚩 Flagged</span>}
                          {v.next_visit_date && <span style={{...styles.badge,background:'#e8f4fd',color:'#2980b9'}}>📅 Next: {new Date(v.next_visit_date).toLocaleDateString('en-GB')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CAPACITY BUILDING TAB */}
      {activeTab === 'training' && (
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <p style={styles.tableTitle}>Capacity Building — RPF 2026</p>
            <p style={styles.tableSub}>Training sessions, onboarding and mentorship records</p>
          </div>
          <p style={{padding:'40px', textAlign:'center', color:'#888'}}>
            Capacity building records coming soon. 🚀
          </p>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  tabs: { display:'flex', marginBottom:'20px', borderBottom:'1px solid #e2e8f0' },
  tab: { padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:'14px', transition:'all 0.15s' },
  cards: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', margin:0 },
  addBtn: { padding:'12px 24px', borderRadius:'10px', border:'none', background:'#1eb457', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },

  // Form styles
  formCard: { background:'#fff', borderRadius:'16px', padding:'28px', boxShadow:'0 2px 16px rgba(0,0,0,0.08)', marginBottom:'24px' },
  formHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', paddingBottom:'16px', borderBottom:'2px solid #f0f0f0' },
  formTitle: { margin:0, fontSize:'20px', fontWeight:'700', color:'#1a2332' },
  closeBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  sectionTitle: { display:'flex', alignItems:'center', gap:'10px', fontSize:'14px', fontWeight:'700', color:'#1a2332', background:'#f8f9fa', padding:'10px 16px', borderRadius:'8px', marginBottom:'16px', marginTop:'20px' },
  sectionIcon: { fontSize:'18px' },
  grid1: { display:'grid', gridTemplateColumns:'1fr', gap:'16px', marginBottom:'8px' },
  grid2: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'16px', marginBottom:'8px' },
  grid3: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px', marginBottom:'8px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  fieldLabel: { fontSize:'13px', fontWeight:'600', color:'#555' },
  input: { padding:'10px 14px', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'14px', color:'#333', outline:'none', width:'100%', boxSizing:'border-box' },
  infoBadge: { padding:'10px 14px', borderRadius:'10px', background:'#f0f7ff', color:'#2980b9', fontSize:'13px', fontWeight:'600', border:'1.5px solid #d0e8ff' },
  gpsBtn: { padding:'10px 14px', borderRadius:'10px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' },
  toggleLabel: { display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', padding:'10px 0' },
  toggleTrack: { width:'44px', height:'24px', borderRadius:'12px', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 },
  toggleThumb: { position:'absolute', top:'2px', left:'2px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'transform 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' },
  autoNotice: { background:'#f0f7ff', borderRadius:'10px', padding:'14px 16px', margin:'20px 0', border:'1px solid #d0e8ff' },
  autoBadge: { padding:'4px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', background:'#eafaf1', color:'#1a8a4a' },
  formActions: { display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'24px', paddingTop:'16px', borderTop:'2px solid #f0f0f0' },
  saveBtn: { padding:'12px 28px', borderRadius:'10px', border:'none', background:'#1eb457', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'12px 24px', borderRadius:'10px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },

  // Filter / Table
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'200px' },
  select: { padding:'8px 10px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'12px', color:'#333', background:'#fff', cursor:'pointer' },
  clearBtn: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'1000px' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'10px 14px', fontSize:'13px', color:'#4a5568', verticalAlign:'top' },
  badge: { display:'inline-block', padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  historyBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #1eb457', background:'#fff', fontSize:'11px', cursor:'pointer', color:'#1eb457', whiteSpace:'nowrap' },
  editBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #69A9C9', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#69A9C9' },
  deleteBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },

  // History modal
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  historyModal: { background:'#fff', borderRadius:'16px', padding:'28px', width:'90%', maxWidth:'700px', maxHeight:'85vh', overflowY:'auto' },
  historyCard: { background:'#f8f9fa', borderRadius:'10px', padding:'16px', border:'1px solid #f0f0f0' },
  historyHeader: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px', flexWrap:'wrap' },
  visitBadge: { padding:'4px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:'700', background:'#1eb457', color:'#fff' },
  historyGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'6px', fontSize:'13px', color:'#555', marginBottom:'8px' },
  historyKey: { fontWeight:'600', color:'#1a2332' },
  historyObs: { fontSize:'13px', color:'#555', margin:'6px 0', padding:'8px', background:'#fff', borderRadius:'6px', border:'1px solid #f0f0f0' },
};