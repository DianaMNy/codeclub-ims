// src/pages/Pathways.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Static pathway structure (source of truth for display) ──────────────────
const PATHWAY_STRUCTURE = {
  scratch: { label:'Scratch Fundamentals', icon:'🐱', color:'#F7941D',
    levels:{ l1:'Introduction to Scratch', l2:'More Scratch', l3:'Further Scratch', optional_1:'Animation Deep Dive', optional_2:'Game Mechanics', optional_3:'Storytelling with Scratch' },
    projects:['Animation Project','Game Design','Storytelling App'] },
  web_design: { label:'Web Design', icon:'🌐', color:'#69A9C9',
    levels:{ l1:'Introduction to HTML', l2:'CSS Styling', l3:'Responsive Design', optional_1:'JavaScript Basics', optional_2:'Interactive Pages', optional_3:'Publishing Online' },
    projects:['School Website','Personal Portfolio','Community Page'] },
  python: { label:'Python Basics', icon:'🐍', color:'#1eb457',
    levels:{ l1:'Introduction to Python', l2:'Functions & Loops', l3:'Data & Logic', optional_1:'File Handling', optional_2:'APIs & Web', optional_3:'Mini Projects' },
    projects:['Calculator App','Data Dashboard','Simple Game'] },
  physical_computing: { label:'Physical Computing', icon:'🤖', color:'#9b59b6',
    levels:{ l1:'Introduction to Hardware', l2:'Sensors & Inputs', l3:'Building Projects', optional_1:'Advanced Circuits', optional_2:'3D Design', optional_3:'Robotics' },
    projects:['Sensor Project','LED Project','Mini Robot'] },
  digital_citizenship: { label:'Digital Citizenship', icon:'🛡️', color:'#1abc9c',
    levels:{ l1:'Online Safety', l2:'Digital Footprint', l3:'Community & Ethics', optional_1:'Privacy & Security', optional_2:'Media Literacy', optional_3:'Digital Rights' },
    projects:['Digital Safety Poster','Community Blog','Platformer Game'] },
  game_design: { label:'Game Design', icon:'🎮', color:'#e74c3c',
    levels:{ l1:'Game Concepts', l2:'Game Mechanics', l3:'Building & Testing', optional_1:'Level Design', optional_2:'Sound & Graphics', optional_3:'Publishing' },
    projects:['Platformer Game','Puzzle Game','Educational Quiz'] },
  ai_ml: { label:'AI & Machine Learning', icon:'🧠', color:'#f39c12',
    levels:{ l1:'What is AI?', l2:'Training Models', l3:'Building with AI', optional_1:'Image Recognition', optional_2:'Natural Language', optional_3:'AI Ethics' },
    projects:['Image Classifier','Chatbot','Prediction Model'] },
};

const LEVEL_ORDER = ['l1','l2','l3','optional_1','optional_2','optional_3'];

const EMPTY_FORM = { school_id:'', teacher_id:'', pathway:'scratch', level_reached:'l1', completed:false, date_recorded:'' };

const EMPTY_PATHWAY = { key:'', label:'', icon:'📚', color:'#888888',
  l1:'', l2:'', l3:'', optional_1:'', optional_2:'', optional_3:'',
  project_1:'', project_2:'', project_3:'' };

export default function Pathways() {
  const [progress, setProgress]     = useState([]);
  const [schools, setSchools]       = useState([]);
  const [teachers, setTeachers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('overview');
  const [selectedPathway, setSelectedPathway] = useState('scratch');

  // Progress form
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  // Filters
  const [filterSchool, setFilterSchool]   = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');

  // Syllabus CRUD
  const [customPathways, setCustomPathways] = useState([]);
  const [showPathwayForm, setShowPathwayForm] = useState(false);
  const [editingPathwayId, setEditingPathwayId] = useState(null);
  const [pathwayForm, setPathwayForm] = useState(EMPTY_PATHWAY);
  const [savingPathway, setSavingPathway] = useState(false);

  const fetchProgress = () => api.get('/pathways').then(r => setProgress(r.data));
  const fetchSyllabus = () => api.get('/pathways/syllabus').then(r => setCustomPathways(r.data)).catch(() => {});

  useEffect(() => {
    Promise.all([api.get('/pathways'), api.get('/schools'), api.get('/teachers'), api.get('/pathways/syllabus').catch(() => ({ data: [] }))])
      .then(([p, s, t, sy]) => {
        setProgress(p.data);
        setSchools(s.data);
        setTeachers(t.data);
        setCustomPathways(sy.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Progress CRUD ────────────────────────────────────────────────────────────
  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); setActiveTab('record'); };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      school_id: row.school_id || '',
      teacher_id: row.teacher_id || '',
      pathway: row.pathway || 'scratch',
      level_reached: row.level_reached || 'l1',
      completed: row.completed || false,
      date_recorded: row.date_recorded ? row.date_recorded.split('T')[0] : '',
    });
    setShowForm(true);
    setActiveTab('record');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, schoolName) => {
    if (!window.confirm(`Delete pathway record for "${schoolName}"?`)) return;
    try { await api.delete(`/pathways/${id}`); await fetchProgress(); }
    catch { alert('Failed to delete record'); }
  };

  const handleSubmit = async () => {
    if (!form.school_id) return alert('Please select a school');
    setSaving(true);
    try {
      if (editingId) { await api.put(`/pathways/${editingId}`, form); }
      else { await api.post('/pathways', form); }
      await fetchProgress();
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setActiveTab('overview');
    } catch { alert('Failed to save pathway progress'); }
    finally { setSaving(false); }
  };

  // ── Syllabus CRUD ────────────────────────────────────────────────────────────
  const openAddPathway = () => { setEditingPathwayId(null); setPathwayForm(EMPTY_PATHWAY); setShowPathwayForm(true); };

  const openEditPathway = (pw) => {
    const lvls = typeof pw.levels === 'string' ? JSON.parse(pw.levels) : (pw.levels || {});
    const projs = typeof pw.projects === 'string' ? JSON.parse(pw.projects) : (pw.projects || []);
    setEditingPathwayId(pw.id);
    setPathwayForm({
      key: pw.key || '', label: pw.label || '', icon: pw.icon || '📚', color: pw.color || '#888888',
      l1: lvls.l1||'', l2: lvls.l2||'', l3: lvls.l3||'',
      optional_1: lvls.optional_1||'', optional_2: lvls.optional_2||'', optional_3: lvls.optional_3||'',
      project_1: projs[0]||'', project_2: projs[1]||'', project_3: projs[2]||'',
    });
    setShowPathwayForm(true);
  };

  const handleDeletePathway = async (id, label) => {
    if (!window.confirm(`Delete pathway "${label}"? This won't delete progress records.`)) return;
    try { await api.delete(`/pathways/syllabus/${id}`); await fetchSyllabus(); }
    catch { alert('Failed to delete pathway'); }
  };

  const handleSavePathway = async () => {
    if (!pathwayForm.key || !pathwayForm.label) return alert('Key and label are required');
    setSavingPathway(true);
    const payload = {
      key: pathwayForm.key, label: pathwayForm.label, icon: pathwayForm.icon, color: pathwayForm.color,
      levels: { l1:pathwayForm.l1, l2:pathwayForm.l2, l3:pathwayForm.l3, optional_1:pathwayForm.optional_1, optional_2:pathwayForm.optional_2, optional_3:pathwayForm.optional_3 },
      projects: [pathwayForm.project_1, pathwayForm.project_2, pathwayForm.project_3].filter(Boolean),
    };
    try {
      if (editingPathwayId) { await api.put(`/pathways/syllabus/${editingPathwayId}`, payload); }
      else { await api.post('/pathways/syllabus', payload); }
      await fetchSyllabus();
      setShowPathwayForm(false); setEditingPathwayId(null); setPathwayForm(EMPTY_PATHWAY);
    } catch { alert('Failed to save pathway'); }
    finally { setSavingPathway(false); }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const pathwayCounts = Object.keys(PATHWAY_STRUCTURE).map(key => ({
    key, ...PATHWAY_STRUCTURE[key],
    count: progress.filter(p => p.pathway === key).length,
    completed: progress.filter(p => p.pathway === key && p.completed).length,
  }));

  const filteredProgress = progress.filter(p => {
    const matchSchool = !filterSchool || p.school_id === filterSchool;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'completed' ? p.completed : !p.completed);
    return matchSchool && matchStatus;
  });

  const detailProgress = progress.filter(p => p.pathway === selectedPathway);

  // Teachers who are code_club_leader or centre_manager role
  const clubTeachers = teachers.filter(t => ['code_club_leader','centre_manager','teacher'].includes(t.role));

  return (
    <Layout title="Pathways & Training" subtitle="Learning tracks · Levels · Projects · RPF 2026">

      {/* Pathway Cards Overview */}
      <div style={styles.pathwayGrid}>
        {pathwayCounts.map(p => (
          <div key={p.key} style={{...styles.pathwayCard, borderTop:`4px solid ${p.color}`,
            boxShadow: selectedPathway===p.key && activeTab==='detail' ? `0 0 0 2px ${p.color}` : '0 2px 8px rgba(0,0,0,0.06)',
            cursor:'pointer'}}
            onClick={() => { setSelectedPathway(p.key); setActiveTab('detail'); }}>
            <div style={{fontSize:'28px', marginBottom:'8px'}}>{p.icon}</div>
            <p style={styles.pathwayLabel}>{p.label}</p>
            <p style={{...styles.pathwayCount, color:p.color}}>{p.count} schools</p>
            <p style={styles.pathwaySub}>{p.completed} completed</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview','detail','record','syllabus'].map(tab => (
          <button key={tab} style={{...styles.tab,
            borderBottom: activeTab===tab ? '2px solid #69A9C9' : '2px solid transparent',
            color: activeTab===tab ? '#69A9C9' : '#888',
            fontWeight: activeTab===tab ? '600' : '400'}}
            onClick={() => setActiveTab(tab)}>
            {tab==='overview' ? '📊 Overview' : tab==='detail' ? '📋 Pathway Detail' : tab==='record' ? '➕ Record Progress' : '📚 Manage Syllabus'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={styles.section}>
          <div style={styles.sectionHead}>
            <div>
              <p style={styles.sectionTitle}>All pathway progress — RPF 2026</p>
              <p style={styles.sectionSub}>{filteredProgress.length} of {progress.length} records</p>
            </div>
            <button style={styles.addBtn} onClick={openAdd}>+ Record Progress</button>
          </div>

          {/* Filters */}
          <div style={styles.filterBar}>
            <select style={styles.filterSelect} value={filterSchool}
              onChange={e => setFilterSchool(e.target.value)}>
              <option value="">All Schools</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.official_name}</option>)}
            </select>
            <select style={styles.filterSelect} value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="in_progress">🔄 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>
            {(filterSchool || filterStatus !== 'all') && (
              <button style={styles.clearBtn} onClick={() => { setFilterSchool(''); setFilterStatus('all'); }}>✕ Clear</button>
            )}
          </div>

          {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
            <table style={styles.table}>
              <thead><tr style={styles.thead}>
                <th style={styles.th}>SCHOOL</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>PATHWAY</th>
                <th style={styles.th}>LEVEL REACHED</th>
                <th style={styles.th}>TEACHER</th>
                <th style={styles.th}>MENTOR</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}>DATE</th>
                <th style={styles.th}>ACTIONS</th>
              </tr></thead>
              <tbody>
                {filteredProgress.map((p, i) => {
                  const pw = PATHWAY_STRUCTURE[p.pathway] || {};
                  return (
                    <tr key={p.id} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{p.school_name || '—'}</td>
                      <td style={styles.td}>{p.county || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background:(pw.color||'#888')+'20', color:pw.color||'#888'}}>
                          {pw.icon} {pw.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.levelBadge}>{pw.levels?.[p.level_reached] || p.level_reached}</span>
                      </td>
                      <td style={styles.td}>{p.teacher_name || '—'}</td>
                      <td style={styles.td}>{p.mentor_name || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: p.completed ? '#eafaf1' : '#fef9e7',
                          color: p.completed ? '#1a8a4a' : '#a0720a'}}>
                          {p.completed ? '✅ Completed' : '🔄 In Progress'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {p.date_recorded ? new Date(p.date_recorded).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                      </td>
                      <td style={styles.td}>
                        <div style={{display:'flex', gap:'6px'}}>
                          <button style={styles.editBtn} onClick={() => openEdit(p)}>✏️ Edit</button>
                          <button style={styles.deleteBtn} onClick={() => handleDelete(p.id, p.school_name)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProgress.length === 0 && (
                  <tr><td colSpan={9} style={{padding:'40px', textAlign:'center', color:'#888'}}>
                    {progress.length === 0 ? 'No pathway records yet. Click "+ Record Progress" to add.' : 'No results match your filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── DETAIL TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'detail' && (
        <div>
          <div style={styles.pathwaySelector}>
            {Object.keys(PATHWAY_STRUCTURE).map(key => {
              const pw = PATHWAY_STRUCTURE[key];
              return (
                <button key={key} onClick={() => setSelectedPathway(key)}
                  style={{...styles.pathwayBtn,
                    background: selectedPathway===key ? pw.color : '#fff',
                    color: selectedPathway===key ? '#fff' : '#555',
                    border: `1.5px solid ${selectedPathway===key ? pw.color : '#e2e8f0'}`}}>
                  {pw.icon} {pw.label}
                </button>
              );
            })}
          </div>

          {(() => {
            const pw = PATHWAY_STRUCTURE[selectedPathway];
            return (
              <div style={styles.row}>
                <div style={{...styles.section, flex:1}}>
                  <p style={styles.sectionTitle}>{pw.icon} {pw.label} — Levels</p>
                  <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'16px'}}>
                    {LEVEL_ORDER.map((level, idx) => (
                      <div key={level} style={{...styles.levelRow, borderLeft:`4px solid ${idx<3 ? pw.color : '#ddd'}`}}>
                        <div>
                          <p style={{margin:0, fontSize:'12px', fontWeight:'700', color:idx<3?pw.color:'#aaa', letterSpacing:'0.5px'}}>
                            {idx < 3 ? `LEVEL ${idx+1}` : `OPTIONAL MODULE ${idx-2}`}
                          </p>
                          <p style={{margin:0, fontSize:'14px', color:'#1a2332', fontWeight:'500'}}>
                            {pw.levels[level]}
                          </p>
                        </div>
                        <span style={{fontSize:'12px', color:'#888'}}>
                          {detailProgress.filter(p => LEVEL_ORDER.indexOf(p.level_reached) >= idx).length} schools
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{...styles.section, flex:1}}>
                  <p style={styles.sectionTitle}>🚀 Projects — {pw.label}</p>
                  <p style={styles.sectionSub}>Available after completing L3</p>
                  <div style={{display:'flex', flexDirection:'column', gap:'12px', marginTop:'16px'}}>
                    {pw.projects.map(project => (
                      <div key={project} style={{...styles.projectCard, borderLeft:`4px solid ${pw.color}`}}>
                        <p style={{margin:0, fontSize:'14px', fontWeight:'600', color:'#1a2332'}}>{project}</p>
                        <p style={{margin:0, fontSize:'12px', color:'#888'}}>Showcase eligible · Coolest Projects 2026</p>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:'24px', padding:'16px', background:'#f8f9fa', borderRadius:'8px'}}>
                    <p style={{margin:'0 0 8px 0', fontSize:'13px', fontWeight:'600', color:'#555'}}>Schools on this pathway</p>
                    <p style={{margin:0, fontSize:'32px', fontWeight:'700', color:pw.color}}>{detailProgress.length}</p>
                    <p style={{margin:0, fontSize:'12px', color:'#888'}}>
                      {detailProgress.filter(p=>p.completed).length} completed · {detailProgress.filter(p=>!p.completed).length} in progress
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── RECORD PROGRESS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'record' && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>{editingId ? '✏️ Edit Pathway Record' : '➕ Record Pathway Progress'}</p>
          <p style={styles.sectionSub}>{editingId ? 'Update an existing pathway record' : 'Add a new pathway record for a school'}</p>

          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>School *</label>
              <select style={styles.formSelect} value={form.school_id}
                onChange={e => setForm({...form, school_id:e.target.value, teacher_id:''})}>
                <option value="">Select school...</option>
                {schools.filter(s=>s.status==='active').map(s => (
                  <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Code Club Leader / Centre Manager</label>
              <select style={styles.formSelect} value={form.teacher_id}
                onChange={e => setForm({...form, teacher_id:e.target.value})}>
                <option value="">Select club leader...</option>
                {teachers
                  .filter(t => !form.school_id || t.school_id === form.school_id)
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} {t.role ? `(${t.role.replace(/_/g,' ')})` : ''}</option>
                  ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Pathway *</label>
              <select style={styles.formSelect} value={form.pathway}
                onChange={e => setForm({...form, pathway:e.target.value, level_reached:'l1'})}>
                {Object.keys(PATHWAY_STRUCTURE).map(key => (
                  <option key={key} value={key}>{PATHWAY_STRUCTURE[key].icon} {PATHWAY_STRUCTURE[key].label}</option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Level Reached *</label>
              <select style={styles.formSelect} value={form.level_reached}
                onChange={e => setForm({...form, level_reached:e.target.value})}>
                {LEVEL_ORDER.map((level, idx) => (
                  <option key={level} value={level}>
                    {idx < 3 ? `Level ${idx+1}` : `Optional Module ${idx-2}`} — {PATHWAY_STRUCTURE[form.pathway]?.levels[level]}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Status</label>
              <select style={styles.formSelect} value={String(form.completed)}
                onChange={e => setForm({...form, completed:e.target.value==='true'})}>
                <option value="false">🔄 In Progress</option>
                <option value="true">✅ Completed</option>
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Date Recorded</label>
              <input type="date" style={styles.formInput} value={form.date_recorded}
                onChange={e => setForm({...form, date_recorded:e.target.value})} />
            </div>
          </div>

          <div style={{marginTop:'24px', display:'flex', gap:'12px'}}>
            <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingId ? '💾 Update Record' : '✅ Save Progress'}
            </button>
            <button style={styles.cancelBtn} onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setActiveTab('overview'); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── MANAGE SYLLABUS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'syllabus' && (
        <div>
          <div style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionTitle}>📚 Manage Pathways Syllabus</p>
                <p style={styles.sectionSub}>Add, edit or remove pathways as the curriculum changes</p>
              </div>
              <button style={styles.addBtn} onClick={showPathwayForm ? () => { setShowPathwayForm(false); setEditingPathwayId(null); } : openAddPathway}>
                {showPathwayForm ? '✕ Cancel' : '+ Add Pathway'}
              </button>
            </div>

            {/* Pathway Form */}
            {showPathwayForm && (
              <div style={{...styles.formBox, marginBottom:'20px'}}>
                <p style={styles.formTitle}>{editingPathwayId ? '✏️ Edit Pathway' : '➕ Add New Pathway'}</p>
                <div style={styles.formGrid}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Pathway Key * (no spaces, e.g. web_design)</label>
                    <input style={styles.formInput} placeholder="e.g. data_science" value={pathwayForm.key}
                      onChange={e => setPathwayForm({...pathwayForm, key:e.target.value.toLowerCase().replace(/\s/g,'_')})}
                      disabled={!!editingPathwayId} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.label}>Pathway Name *</label>
                    <input style={styles.formInput} placeholder="e.g. Data Science" value={pathwayForm.label}
                      onChange={e => setPathwayForm({...pathwayForm, label:e.target.value})} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.label}>Icon (emoji)</label>
                    <input style={styles.formInput} placeholder="📊" value={pathwayForm.icon}
                      onChange={e => setPathwayForm({...pathwayForm, icon:e.target.value})} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.label}>Colour (hex)</label>
                    <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                      <input type="color" value={pathwayForm.color}
                        onChange={e => setPathwayForm({...pathwayForm, color:e.target.value})}
                        style={{width:'44px', height:'38px', borderRadius:'6px', border:'1.5px solid #e2e8f0', cursor:'pointer', padding:'2px'}} />
                      <input style={{...styles.formInput, flex:1}} value={pathwayForm.color}
                        onChange={e => setPathwayForm({...pathwayForm, color:e.target.value})} />
                    </div>
                  </div>
                </div>

                <p style={{...styles.label, marginTop:'16px', marginBottom:'8px'}}>Levels (L1–L3 required, Optional 1–3 optional)</p>
                <div style={styles.formGrid}>
                  {['l1','l2','l3','optional_1','optional_2','optional_3'].map((lvl, idx) => (
                    <div key={lvl} style={styles.formField}>
                      <label style={styles.label}>{idx<3 ? `Level ${idx+1}` : `Optional Module ${idx-2}`}</label>
                      <input style={styles.formInput}
                        placeholder={idx<3 ? `Level ${idx+1} name (required)` : `Optional module ${idx-2}`}
                        value={pathwayForm[lvl]}
                        onChange={e => setPathwayForm({...pathwayForm, [lvl]:e.target.value})} />
                    </div>
                  ))}
                </div>

                <p style={{...styles.label, marginTop:'16px', marginBottom:'8px'}}>Projects (up to 3)</p>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px'}}>
                  {['project_1','project_2','project_3'].map((pj, idx) => (
                    <div key={pj} style={styles.formField}>
                      <label style={styles.label}>Project {idx+1}</label>
                      <input style={styles.formInput} placeholder={`Project ${idx+1} name`}
                        value={pathwayForm[pj]}
                        onChange={e => setPathwayForm({...pathwayForm, [pj]:e.target.value})} />
                    </div>
                  ))}
                </div>

                <div style={{marginTop:'20px', display:'flex', gap:'12px'}}>
                  <button style={styles.saveBtn} onClick={handleSavePathway} disabled={savingPathway}>
                    {savingPathway ? 'Saving...' : editingPathwayId ? '💾 Update Pathway' : '✅ Save Pathway'}
                  </button>
                  <button style={styles.cancelBtn} onClick={() => { setShowPathwayForm(false); setEditingPathwayId(null); }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Built-in pathways (read-only display) */}
            <p style={{fontSize:'12px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 12px 0'}}>BUILT-IN PATHWAYS (RPF 2026)</p>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'12px', marginBottom:'24px'}}>
              {Object.entries(PATHWAY_STRUCTURE).map(([key, pw]) => (
                <div key={key} style={{...styles.syllabusCard, borderLeft:`4px solid ${pw.color}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <p style={{margin:'0 0 2px 0', fontWeight:'600', color:'#1a2332', fontSize:'13px'}}>{pw.icon} {pw.label}</p>
                      <p style={{margin:0, fontSize:'11px', color:'#888'}}>3 core levels · 3 optional · {pw.projects.length} projects</p>
                    </div>
                    <span style={{...styles.badge, background:pw.color+'20', color:pw.color, fontSize:'11px'}}>Built-in</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom pathways */}
            {customPathways.length > 0 && (
              <>
                <p style={{fontSize:'12px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 12px 0'}}>CUSTOM PATHWAYS</p>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'12px'}}>
                  {customPathways.map(pw => {
                    const color = pw.color || '#888';
                    return (
                      <div key={pw.id} style={{...styles.syllabusCard, borderLeft:`4px solid ${color}`}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                          <div>
                            <p style={{margin:'0 0 2px 0', fontWeight:'600', color:'#1a2332', fontSize:'13px'}}>{pw.icon} {pw.label}</p>
                            <p style={{margin:0, fontSize:'11px', color:'#888'}}>Key: {pw.key}</p>
                          </div>
                          <div style={{display:'flex', gap:'6px'}}>
                            <button style={styles.editBtn} onClick={() => openEditPathway(pw)}>✏️</button>
                            <button style={styles.deleteBtn} onClick={() => handleDeletePathway(pw.id, pw.label)}>🗑</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  pathwayGrid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'12px', marginBottom:'24px' },
  pathwayCard: { background:'#fff', borderRadius:'12px', padding:'16px', textAlign:'center', transition:'all 0.2s', cursor:'pointer' },
  pathwayLabel: { fontSize:'12px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  pathwayCount: { fontSize:'24px', fontWeight:'700', margin:'0 0 2px 0' },
  pathwaySub: { fontSize:'11px', color:'#888', margin:0 },
  tabs: { display:'flex', gap:'0', marginBottom:'20px', borderBottom:'1px solid #e2e8f0' },
  tab: { padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:'14px', transition:'all 0.15s' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  filterBar: { display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' },
  filterSelect: { padding:'9px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'9px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#e74c3c', fontSize:'13px', cursor:'pointer', fontWeight:'600' },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  levelBadge: { fontSize:'12px', color:'#555', fontStyle:'italic' },
  editBtn: { padding:'5px 12px', borderRadius:'6px', border:'1.5px solid #69A9C9', background:'#fff', color:'#69A9C9', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  deleteBtn: { padding:'5px 10px', borderRadius:'6px', border:'1.5px solid #e74c3c', background:'#fff', color:'#e74c3c', fontSize:'12px', cursor:'pointer' },
  pathwaySelector: { display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' },
  pathwayBtn: { padding:'7px 14px', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:'500', transition:'all 0.15s' },
  row: { display:'flex', gap:'20px' },
  levelRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f8f9fa', borderRadius:'0 8px 8px 0' },
  projectCard: { padding:'12px 16px', background:'#f8f9fa', borderRadius:'0 8px 8px 0' },
  syllabusCard: { padding:'14px 16px', background:'#fff', borderRadius:'0 8px 8px 0', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  formBox: { background:'#f8f9fa', borderRadius:'10px', padding:'20px', border:'1px solid #e2e8f0' },
  formTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px 0' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formInput: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
};