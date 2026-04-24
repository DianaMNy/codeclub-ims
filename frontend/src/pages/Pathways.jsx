// src/pages/Pathways.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PATHWAY_STRUCTURE = {
  scratch: { label: 'Scratch Fundamentals', icon: '🐱', color: '#F7941D',
    levels: { l1:'Introduction to Scratch', l2:'More Scratch', l3:'Further Scratch', optional_1:'Animation Deep Dive', optional_2:'Game Mechanics', optional_3:'Storytelling with Scratch' },
    projects: ['Animation Project','Game Design','Storytelling App'] },
  web_design: { label: 'Web Design', icon: '🌐', color: '#69A9C9',
    levels: { l1:'Introduction to HTML', l2:'CSS Styling', l3:'Responsive Design', optional_1:'JavaScript Basics', optional_2:'Interactive Pages', optional_3:'Publishing Online' },
    projects: ['School Website','Personal Portfolio','Community Page'] },
  python: { label: 'Python Basics', icon: '🐍', color: '#1eb457',
    levels: { l1:'Introduction to Python', l2:'Functions & Loops', l3:'Data & Logic', optional_1:'File Handling', optional_2:'APIs & Web', optional_3:'Mini Projects' },
    projects: ['Calculator App','Data Dashboard','Simple Game'] },
  physical_computing: { label: 'Physical Computing', icon: '🤖', color: '#9b59b6',
    levels: { l1:'Introduction to Hardware', l2:'Sensors & Inputs', l3:'Building Projects', optional_1:'Advanced Circuits', optional_2:'3D Design', optional_3:'Robotics' },
    projects: ['Sensor Project','LED Project','Mini Robot'] },
  digital_citizenship: { label: 'Digital Citizenship', icon: '🛡️', color: '#1abc9c',
    levels: { l1:'Online Safety', l2:'Digital Footprint', l3:'Community & Ethics', optional_1:'Privacy & Security', optional_2:'Media Literacy', optional_3:'Digital Rights' },
    projects: ['Digital Safety Poster','Community Blog','Platformer Game'] },
  game_design: { label: 'Game Design', icon: '🎮', color: '#e74c3c',
    levels: { l1:'Game Concepts', l2:'Game Mechanics', l3:'Building & Testing', optional_1:'Level Design', optional_2:'Sound & Graphics', optional_3:'Publishing' },
    projects: ['Platformer Game','Puzzle Game','Educational Quiz'] },
  ai_ml: { label: 'AI & Machine Learning', icon: '🧠', color: '#f39c12',
    levels: { l1:'What is AI?', l2:'Training Models', l3:'Building with AI', optional_1:'Image Recognition', optional_2:'Natural Language', optional_3:'AI Ethics' },
    projects: ['Image Classifier','Chatbot','Prediction Model'] },
};

const LEVEL_ORDER = ['l1','l2','l3','optional_1','optional_2','optional_3'];

export default function Pathways() {
  const [progress, setProgress] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPathway, setSelectedPathway] = useState('scratch');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ school_id:'', teacher_id:'', pathway:'scratch', level_reached:'l1', completed:false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/pathways'),
      api.get('/schools'),
      api.get('/teachers'),
    ]).then(([p, s, t]) => {
      setProgress(p.data);
      setSchools(s.data);
      setTeachers(t.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.school_id) return alert('Please select a school');
    setSaving(true);
    try {
      await api.post('/pathways', form);
      const res = await api.get('/pathways');
      setProgress(res.data);
      setShowForm(false);
      setForm({ school_id:'', teacher_id:'', pathway:'scratch', level_reached:'l1', completed:false });
    } catch (err) {
      alert('Failed to save pathway progress');
    } finally { setSaving(false); }
  };

  const pathwayCounts = Object.keys(PATHWAY_STRUCTURE).map(key => ({
    key,
    ...PATHWAY_STRUCTURE[key],
    count: progress.filter(p => p.pathway === key).length,
    completed: progress.filter(p => p.pathway === key && p.completed).length,
  }));

  const filteredProgress = progress.filter(p => p.pathway === selectedPathway);

  return (
    <Layout title="Pathways & Training" subtitle="Learning tracks · Levels · Projects · RPF 2026">

      {/* Pathway Cards Overview */}
      <div style={styles.pathwayGrid}>
        {pathwayCounts.map(p => (
          <div key={p.key} style={{...styles.pathwayCard, borderTop:`4px solid ${p.color}`,
            boxShadow: selectedPathway === p.key ? `0 0 0 2px ${p.color}` : '0 2px 8px rgba(0,0,0,0.06)',
            cursor:'pointer'}}
            onClick={() => { setSelectedPathway(p.key); setActiveTab('detail'); }}>
            <div style={{fontSize:'28px', marginBottom:'8px'}}>{p.icon}</div>
            <p style={styles.pathwayLabel}>{p.label}</p>
            <p style={{...styles.pathwayCount, color: p.color}}>{p.count} schools</p>
            <p style={styles.pathwaySub}>{p.completed} completed</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['overview','detail','record'].map(tab => (
          <button key={tab} style={{...styles.tab, borderBottom: activeTab===tab ? `2px solid #69A9C9` : '2px solid transparent',
            color: activeTab===tab ? '#69A9C9' : '#888', fontWeight: activeTab===tab ? '600' : '400'}}
            onClick={() => setActiveTab(tab)}>
            {tab === 'overview' ? '📊 Overview' : tab === 'detail' ? '📋 Pathway Detail' : '➕ Record Progress'}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>All pathway progress — RPF 2026</p>
          <p style={styles.sectionSub}>{progress.length} pathway records across all schools</p>
          {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
            <table style={styles.table}>
              <thead><tr style={styles.thead}>
                <th style={styles.th}>SCHOOL</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>PATHWAY</th>
                <th style={styles.th}>LEVEL REACHED</th>
                <th style={styles.th}>TEACHER</th>
                <th style={styles.th}>STATUS</th>
              </tr></thead>
              <tbody>
                {progress.map((p, i) => {
                  const pw = PATHWAY_STRUCTURE[p.pathway] || {};
                  return (
                    <tr key={p.id} style={{background: i%2===0 ? '#fff' : '#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{p.school_name || '—'}</td>
                      <td style={styles.td}>{p.county || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background: (pw.color||'#888')+'20', color: pw.color||'#888'}}>
                          {pw.icon} {pw.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.levelBadge}>
                          {pw.levels?.[p.level_reached] || p.level_reached}
                        </span>
                      </td>
                      <td style={styles.td}>{p.teacher_name || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: p.completed ? '#eafaf1' : '#fef9e7',
                          color: p.completed ? '#1a8a4a' : '#a0720a'}}>
                          {p.completed ? '✅ Completed' : '🔄 In Progress'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {progress.length === 0 && (
                  <tr><td colSpan={6} style={{padding:'40px', textAlign:'center', color:'#888'}}>
                    No pathway progress recorded yet. Use "Record Progress" tab to add some!
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DETAIL TAB */}
      {activeTab === 'detail' && (
        <div>
          {/* Pathway selector */}
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

          {/* Selected pathway detail */}
          {(() => {
            const pw = PATHWAY_STRUCTURE[selectedPathway];
            return (
              <div style={styles.row}>
                {/* Levels */}
                <div style={{...styles.section, flex:1}}>
                  <p style={styles.sectionTitle}>{pw.icon} {pw.label} — Levels</p>
                  <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'16px'}}>
                    {LEVEL_ORDER.map((level, idx) => (
                      <div key={level} style={{...styles.levelRow,
                        borderLeft: `4px solid ${idx < 3 ? pw.color : '#ddd'}`}}>
                        <div>
                          <p style={{margin:0, fontSize:'12px', fontWeight:'700', color: idx<3 ? pw.color : '#aaa',
                            letterSpacing:'0.5px'}}>
                            {idx < 3 ? `LEVEL ${idx+1}` : `OPTIONAL MODULE ${idx-2}`}
                          </p>
                          <p style={{margin:0, fontSize:'14px', color:'#1a2332', fontWeight:'500'}}>
                            {pw.levels[level]}
                          </p>
                        </div>
                        <span style={{fontSize:'12px', color:'#888'}}>
                          {filteredProgress.filter(p => LEVEL_ORDER.indexOf(p.level_reached) >= idx).length} schools
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
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
                    <p style={{margin:0, fontSize:'32px', fontWeight:'700', color: pw.color}}>
                      {filteredProgress.length}
                    </p>
                    <p style={{margin:0, fontSize:'12px', color:'#888'}}>
                      {filteredProgress.filter(p=>p.completed).length} completed · {filteredProgress.filter(p=>!p.completed).length} in progress
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* RECORD PROGRESS TAB */}
      {activeTab === 'record' && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>➕ Record Pathway Progress</p>
          <p style={styles.sectionSub}>Add a new pathway record for a school</p>

          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>School *</label>
              <select style={styles.formSelect} value={form.school_id}
                onChange={e => setForm({...form, school_id: e.target.value})}>
                <option value="">Select school...</option>
                {schools.filter(s=>s.type==='school').map(s => (
                  <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Teacher (optional)</label>
              <select style={styles.formSelect} value={form.teacher_id}
                onChange={e => setForm({...form, teacher_id: e.target.value})}>
                <option value="">Select teacher...</option>
                {teachers.filter(t => !form.school_id || t.school_id === form.school_id).map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Pathway *</label>
              <select style={styles.formSelect} value={form.pathway}
                onChange={e => setForm({...form, pathway: e.target.value})}>
                {Object.keys(PATHWAY_STRUCTURE).map(key => (
                  <option key={key} value={key}>
                    {PATHWAY_STRUCTURE[key].icon} {PATHWAY_STRUCTURE[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Level Reached *</label>
              <select style={styles.formSelect} value={form.level_reached}
                onChange={e => setForm({...form, level_reached: e.target.value})}>
                {LEVEL_ORDER.map((level, idx) => (
                  <option key={level} value={level}>
                    {idx < 3 ? `Level ${idx+1}` : `Optional Module ${idx-2}`} — {PATHWAY_STRUCTURE[form.pathway]?.levels[level]}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Status</label>
              <select style={styles.formSelect} value={form.completed}
                onChange={e => setForm({...form, completed: e.target.value === 'true'})}>
                <option value="false">🔄 In Progress</option>
                <option value="true">✅ Completed</option>
              </select>
            </div>
          </div>

          <div style={{marginTop:'24px', display:'flex', gap:'12px'}}>
            <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : '✅ Save Progress'}
            </button>
            <button style={styles.cancelBtn} onClick={() => setActiveTab('overview')}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  pathwayGrid: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'12px', marginBottom:'24px' },
  pathwayCard: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', textAlign:'center', transition:'all 0.2s' },
  pathwayLabel: { fontSize:'12px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  pathwayCount: { fontSize:'24px', fontWeight:'700', margin:'0 0 2px 0' },
  pathwaySub: { fontSize:'11px', color:'#888', margin:0 },
  tabs: { display:'flex', gap:'0', marginBottom:'20px', borderBottom:'1px solid #e2e8f0' },
  tab: { padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:'14px', transition:'all 0.15s' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  row: { display:'flex', gap:'20px' },
  table: { width:'100%', borderCollapse:'collapse', marginTop:'16px' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  levelBadge: { fontSize:'12px', color:'#555', fontStyle:'italic' },
  pathwaySelector: { display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' },
  pathwayBtn: { padding:'7px 14px', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:'500', transition:'all 0.15s' },
  levelRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#f8f9fa', borderRadius:'0 8px 8px 0' },
  projectCard: { padding:'12px 16px', background:'#f8f9fa', borderRadius:'0 8px 8px 0' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px', marginTop:'20px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
};
