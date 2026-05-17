// src/pages/Pathways.jsx
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

const EMPTY_SHOWCASE = { school_id:'', pathway:'scratch', project_name:'', level_reached:'l1', photo_url:'', notes:'', status:'in_progress', county_snapshot:'', school_name_snapshot:'' };

export default function Pathways() {
  const isMobile = useIsMobile();
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

  // Projects Showcase
  const [showcaseProjects, setShowcaseProjects] = useState([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [showcaseForm, setShowcaseForm] = useState(EMPTY_SHOWCASE);
  const [showcaseEditing, setShowcaseEditing] = useState(null);
  const [showShowcaseForm, setShowShowcaseForm] = useState(false);
  const [showcaseSaving, setShowcaseSaving] = useState(false);
  const [showcaseSearch, setShowcaseSearch] = useState('');
  const [showcaseCounty, setShowcaseCounty] = useState('');
  const [showcasePathwayFilter, setShowcasePathwayFilter] = useState('');
  const [showcaseStatus, setShowcaseStatus] = useState('all');

  const fetchProgress = () => api.get('/pathways').then(r => setProgress(r.data));
  const fetchSyllabus = () => api.get('/pathways/syllabus').then(r => setCustomPathways(r.data)).catch(() => {});
  const fetchShowcase = () => {
    setShowcaseLoading(true);
    api.get('/projects-showcase').then(r => setShowcaseProjects(r.data)).catch(console.error).finally(() => setShowcaseLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/pathways'),
      api.get('/schools'),
      api.get('/teachers'),
      api.get('/pathways/syllabus').catch(() => ({ data: [] })),
      api.get('/projects-showcase').catch(() => ({ data: [] })),
    ]).then(([p, s, t, sy, sh]) => {
      setProgress(p.data);
      setSchools(s.data);
      setTeachers(t.data);
      setCustomPathways(sy.data || []);
      setShowcaseProjects(sh.data || []);
    }).catch(console.error).finally(() => setLoading(false));
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

  // ── Projects Showcase CRUD ───────────────────────────────────────────────────
  const openShowcaseEdit = (proj) => {
    setShowcaseEditing(proj.id);
    setShowcaseForm({
      school_id: proj.school_id || '',
      pathway: proj.pathway || 'scratch',
      project_name: proj.project_name || '',
      level_reached: proj.level_reached || 'l1',
      photo_url: proj.photo_url || '',
      notes: proj.notes || '',
      status: proj.status || 'in_progress',
      county_snapshot: proj.county_snapshot || '',
      school_name_snapshot: proj.school_name_snapshot || '',
    });
    setShowShowcaseForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowcaseSubmit = async () => {
    if (!showcaseForm.project_name || showcaseForm.project_name === '__other__') return alert('Please select or enter a project name');
    const school = schools.find(s => s.id === showcaseForm.school_id);
    const payload = { ...showcaseForm, county_snapshot: showcaseForm.county_snapshot || school?.county || '', school_name_snapshot: showcaseForm.school_name_snapshot || school?.official_name || '' };
    setShowcaseSaving(true);
    try {
      if (showcaseEditing) { await api.put(`/projects-showcase/${showcaseEditing}`, payload); }
      else { await api.post('/projects-showcase', payload); }
      const res = await api.get('/projects-showcase');
      setShowcaseProjects(res.data);
      setShowShowcaseForm(false); setShowcaseEditing(null); setShowcaseForm(EMPTY_SHOWCASE);
    } catch { alert('Failed to save project'); }
    finally { setShowcaseSaving(false); }
  };

  const handleShowcaseDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}"?`)) return;
    try {
      await api.delete(`/projects-showcase/${id}`);
      setShowcaseProjects(prev => prev.filter(p => p.id !== id));
    } catch { alert('Failed to delete project'); }
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
        {['overview','detail','record','syllabus','showcase'].map(tab => (
          <button key={tab} style={{...styles.tab,
            borderBottom: activeTab===tab ? '2px solid #69A9C9' : '2px solid transparent',
            color: activeTab===tab ? '#69A9C9' : '#888',
            fontWeight: activeTab===tab ? '600' : '400'}}
            onClick={() => setActiveTab(tab)}>
            {tab==='overview' ? '📊 Overview' : tab==='detail' ? '📋 Pathway Detail' : tab==='record' ? '➕ Record Progress' : tab==='syllabus' ? '📚 Manage Syllabus' : '🚀 Projects Showcase'}
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
            <div style={{overflowX:'auto'}}><table style={{...styles.table, minWidth:'600px'}}>
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
            </table></div>
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
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px'}}>
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
      {/* ── SHOWCASE TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'showcase' && (
        <div>
          {/* Stat cards */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'12px', marginBottom:'20px'}}>
            {[
              { label:'Total Projects', value:showcaseProjects.length, color:'#69A9C9', icon:'🚀' },
              { label:'Completed', value:showcaseProjects.filter(p=>p.status==='completed').length, color:'#1eb457', icon:'✅' },
              { label:'In Progress', value:showcaseProjects.filter(p=>p.status==='in_progress').length, color:'#F7941D', icon:'🔄' },
              { label:'Schools', value:new Set(showcaseProjects.map(p=>p.school_id||p.school_name_snapshot).filter(Boolean)).size, color:'#9b59b6', icon:'🏫' },
            ].map(stat => (
              <div key={stat.label} style={{background:'#fff', borderRadius:'10px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', borderTop:`3px solid ${stat.color}`}}>
                <p style={{margin:'0 0 6px 0', fontSize:'22px'}}>{stat.icon}</p>
                <p style={{margin:'0 0 2px 0', fontSize:'24px', fontWeight:'700', color:stat.color}}>{stat.value}</p>
                <p style={{margin:0, fontSize:'11px', color:'#8a96a3', fontWeight:'600'}}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionTitle}>🚀 Projects Showcase — Coolest Projects 2026</p>
                <p style={styles.sectionSub}>{showcaseProjects.length} project{showcaseProjects.length !== 1 ? 's' : ''} submitted</p>
              </div>
              <button style={styles.addBtn} onClick={() => { setShowcaseEditing(null); setShowcaseForm(EMPTY_SHOWCASE); setShowShowcaseForm(f => !f); }}>
                {showShowcaseForm && !showcaseEditing ? '✕ Cancel' : '+ Add Project'}
              </button>
            </div>

            {/* Add / Edit form */}
            {showShowcaseForm && (
              <div style={{...styles.formBox, marginBottom:'20px'}}>
                <p style={styles.formTitle}>{showcaseEditing ? '✏️ Edit Project' : '➕ Submit a Project'}</p>
                <div style={styles.formGrid}>
                  <div style={styles.formField}>
                    <label style={styles.label}>School</label>
                    <select style={styles.formSelect} value={showcaseForm.school_id}
                      onChange={e => {
                        const school = schools.find(s => s.id === e.target.value);
                        setShowcaseForm(f => ({ ...f, school_id:e.target.value, county_snapshot:school?.county||'', school_name_snapshot:school?.official_name||'' }));
                      }}>
                      <option value="">Select school...</option>
                      {schools.filter(s => s.status === 'active').map(s => (
                        <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Pathway</label>
                    <select style={styles.formSelect} value={showcaseForm.pathway}
                      onChange={e => setShowcaseForm(f => ({ ...f, pathway:e.target.value, project_name:'', level_reached:'l1' }))}>
                      {Object.keys(PATHWAY_STRUCTURE).map(key => (
                        <option key={key} value={key}>{PATHWAY_STRUCTURE[key].icon} {PATHWAY_STRUCTURE[key].label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Project</label>
                    <select style={styles.formSelect} value={showcaseForm.project_name}
                      onChange={e => setShowcaseForm(f => ({ ...f, project_name:e.target.value }))}>
                      <option value="">Select project...</option>
                      {(PATHWAY_STRUCTURE[showcaseForm.pathway]?.projects || []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="__other__">Other...</option>
                    </select>
                    {showcaseForm.project_name === '__other__' && (
                      <input style={{...styles.formInput, marginTop:'6px'}} placeholder="Type project name..."
                        onChange={e => setShowcaseForm(f => ({ ...f, project_name:e.target.value }))} />
                    )}
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Level Reached</label>
                    <select style={styles.formSelect} value={showcaseForm.level_reached}
                      onChange={e => setShowcaseForm(f => ({ ...f, level_reached:e.target.value }))}>
                      {LEVEL_ORDER.map((level, idx) => (
                        <option key={level} value={level}>
                          {idx < 3 ? `Level ${idx+1}` : `Optional ${idx-2}`} — {PATHWAY_STRUCTURE[showcaseForm.pathway]?.levels?.[level] || level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Status</label>
                    <div style={{display:'flex', gap:'8px'}}>
                      {['in_progress','completed'].map(s => (
                        <button key={s} onClick={() => setShowcaseForm(f => ({ ...f, status:s }))}
                          style={{flex:1, padding:'9px', borderRadius:'8px', border:`1.5px solid ${showcaseForm.status===s ? (s==='completed' ? '#1eb457' : '#F7941D') : '#e2e8f0'}`, background:showcaseForm.status===s ? (s==='completed' ? '#eafaf1' : '#fff5e6') : '#fff', color:showcaseForm.status===s ? (s==='completed' ? '#1a8a4a' : '#a0720a') : '#888', cursor:'pointer', fontSize:'12px', fontWeight:'600'}}>
                          {s === 'completed' ? '✅ Completed' : '🔄 In Progress'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Photo</label>
                    <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setShowcaseForm(f => ({ ...f, photo_url:reader.result }));
                      reader.readAsDataURL(file);
                    }} style={{fontSize:'13px', padding:'8px 0'}} />
                    {showcaseForm.photo_url && (
                      <div style={{marginTop:'8px', position:'relative', display:'inline-block'}}>
                        <img src={showcaseForm.photo_url} alt="preview" style={{width:'100px', height:'75px', objectFit:'cover', borderRadius:'8px', border:'1.5px solid #e2e8f0'}} />
                        <button onClick={() => setShowcaseForm(f => ({ ...f, photo_url:'' }))} style={{position:'absolute', top:'-6px', right:'-6px', background:'#e74c3c', border:'none', color:'#fff', borderRadius:'50%', width:'18px', height:'18px', fontSize:'10px', cursor:'pointer', lineHeight:'18px', textAlign:'center', padding:0}}>×</button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{marginTop:'12px'}}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Notes</label>
                    <textarea style={{...styles.formInput, minHeight:'80px', resize:'vertical', fontFamily:'inherit'}}
                      placeholder="Any notes about this project..."
                      value={showcaseForm.notes}
                      onChange={e => setShowcaseForm(f => ({ ...f, notes:e.target.value }))} />
                  </div>
                </div>

                <div style={{marginTop:'16px', display:'flex', gap:'12px'}}>
                  <button style={styles.saveBtn} onClick={handleShowcaseSubmit} disabled={showcaseSaving}>
                    {showcaseSaving ? 'Saving...' : showcaseEditing ? '💾 Update' : '✅ Submit Project'}
                  </button>
                  <button style={styles.cancelBtn} onClick={() => { setShowShowcaseForm(false); setShowcaseEditing(null); setShowcaseForm(EMPTY_SHOWCASE); }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div style={styles.filterBar}>
              <input style={{...styles.filterSelect, minWidth:'160px'}} placeholder="Search projects or schools..."
                value={showcaseSearch} onChange={e => setShowcaseSearch(e.target.value)} />
              <select style={styles.filterSelect} value={showcaseCounty} onChange={e => setShowcaseCounty(e.target.value)}>
                <option value="">All Counties</option>
                {[...new Set(showcaseProjects.map(p => p.county || p.county_snapshot).filter(Boolean))].sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select style={styles.filterSelect} value={showcasePathwayFilter} onChange={e => setShowcasePathwayFilter(e.target.value)}>
                <option value="">All Pathways</option>
                {Object.keys(PATHWAY_STRUCTURE).map(key => (
                  <option key={key} value={key}>{PATHWAY_STRUCTURE[key].icon} {PATHWAY_STRUCTURE[key].label}</option>
                ))}
              </select>
              <select style={styles.filterSelect} value={showcaseStatus} onChange={e => setShowcaseStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="completed">✅ Completed</option>
                <option value="in_progress">🔄 In Progress</option>
              </select>
              {(showcaseSearch || showcaseCounty || showcasePathwayFilter || showcaseStatus !== 'all') && (
                <button style={styles.clearBtn} onClick={() => { setShowcaseSearch(''); setShowcaseCounty(''); setShowcasePathwayFilter(''); setShowcaseStatus('all'); }}>✕ Clear</button>
              )}
            </div>

            {/* Gallery */}
            {showcaseLoading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (() => {
              const filtered = showcaseProjects.filter(p => {
                const county = p.county || p.county_snapshot || '';
                const matchSearch = !showcaseSearch || p.project_name.toLowerCase().includes(showcaseSearch.toLowerCase()) || (p.school_name||'').toLowerCase().includes(showcaseSearch.toLowerCase());
                const matchCounty = !showcaseCounty || county === showcaseCounty;
                const matchPathway = !showcasePathwayFilter || p.pathway === showcasePathwayFilter;
                const matchStatus = showcaseStatus === 'all' || p.status === showcaseStatus;
                return matchSearch && matchCounty && matchPathway && matchStatus;
              });

              if (filtered.length === 0) return (
                <div style={{textAlign:'center', padding:'48px 20px', color:'#888'}}>
                  {showcaseProjects.length === 0
                    ? <><p style={{fontSize:'40px', margin:'0 0 8px'}}>🚀</p><p style={{fontSize:'14px'}}>No projects yet. Click &quot;+ Add Project&quot; to submit the first one!</p></>
                    : <p style={{fontSize:'14px'}}>No projects match your filters.</p>}
                </div>
              );

              return (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'16px'}}>
                  {filtered.map(proj => {
                    const pw = PATHWAY_STRUCTURE[proj.pathway] || {};
                    const county = proj.county || proj.county_snapshot || '';
                    const schoolName = proj.school_name || proj.school_name_snapshot || '—';
                    return (
                      <div key={proj.id} style={styles.showcaseCard}>
                        {proj.photo_url
                          ? <img src={proj.photo_url} alt={proj.project_name} style={{width:'100%', height:'160px', objectFit:'cover', borderRadius:'10px 10px 0 0'}} />
                          : <div style={{width:'100%', height:'160px', background:(pw.color||'#888')+'15', borderRadius:'10px 10px 0 0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px'}}>{pw.icon||'🚀'}</div>
                        }
                        <div style={{padding:'14px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'6px'}}>
                            <p style={{margin:0, fontWeight:'700', fontSize:'14px', color:'#1a2332', flex:1}}>{proj.project_name}</p>
                            <span style={{...styles.badge, background:proj.status==='completed'?'#eafaf1':'#fef9e7', color:proj.status==='completed'?'#1a8a4a':'#a0720a', fontSize:'11px', whiteSpace:'nowrap'}}>
                              {proj.status === 'completed' ? '✅ Done' : '🔄 In Progress'}
                            </span>
                          </div>
                          <p style={{margin:'0 0 8px 0', fontSize:'12px', color:'#555', fontWeight:'500'}}>{schoolName}</p>
                          <div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'8px'}}>
                            {county && <span style={{...styles.badge, background:'#e8f4fd', color:'#2980b9', fontSize:'11px'}}>{county}</span>}
                            {pw.label && <span style={{...styles.badge, background:(pw.color||'#888')+'20', color:pw.color||'#888', fontSize:'11px'}}>{pw.icon} {pw.label}</span>}
                          </div>
                          {proj.level_reached && <p style={{margin:'0 0 4px 0', fontSize:'11px', color:'#888'}}>📈 {pw.levels?.[proj.level_reached] || proj.level_reached}</p>}
                          {proj.notes && <p style={{margin:'0 0 8px 0', fontSize:'12px', color:'#666', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>{proj.notes}</p>}
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #f0f0f0'}}>
                            <p style={{margin:0, fontSize:'11px', color:'#aaa'}}>{proj.mentor_name||'—'} · {proj.submitted_at ? new Date(proj.submitted_at).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : '—'}</p>
                            <div style={{display:'flex', gap:'4px'}}>
                              <button style={styles.editBtn} onClick={() => openShowcaseEdit(proj)}>✏️</button>
                              <button style={styles.deleteBtn} onClick={() => handleShowcaseDelete(proj.id, proj.project_name)}>🗑</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </Layout>
  );
}

const styles = {
  pathwayGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'12px', marginBottom:'24px' },
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
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formInput: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
  showcaseCard: { background:'#fff', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', overflow:'hidden', transition:'box-shadow 0.2s' },
};