// src/pages/StarClub.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const CRITERIA = [
  'Active club running sessions regularly',
  'Teacher trained and safeguarding complete',
  'Learners completing pathway levels',
  'Evidence uploaded and documented',
];

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9',
  'Kajiado': '#F7941D',
  "Murang'a": '#1eb457',
};

function StarRating({ score, max = 10 }) {
  const filled = Math.round((score / max) * 5);
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: '16px', color: i <= filled ? '#F5C518' : '#e0e0e0' }}>★</span>
      ))}
      <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}>{score}/10</span>
    </div>
  );
}

export default function StarClub() {
  const [evaluations, setEvaluations] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [form, setForm] = useState({
    school_id: '', evaluation_name: '', evaluation_date: '',
    overall_score: '7', recognition_level: 'nominated',
    evaluator_comments: '', follow_up_needed: false, follow_up_notes: '',
  });

  useEffect(() => {
    Promise.all([api.get('/starclub'), api.get('/schools')])
      .then(([e, s]) => { setEvaluations(e.data); setSchools(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleCriteria = (c) => {
    setSelectedCriteria(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async () => {
    if (!form.school_id) return alert('Please select a school');
    setSaving(true);
    try {
      await api.post('/starclub', {
        ...form,
        criteria_met: selectedCriteria.length,
        overall_score: parseInt(form.overall_score),
      });
      const res = await api.get('/starclub');
      setEvaluations(res.data);
      setShowForm(false);
      setSelectedCriteria([]);
      setForm({ school_id:'', evaluation_name:'', evaluation_date:'', overall_score:'7', recognition_level:'nominated', evaluator_comments:'', follow_up_needed:false, follow_up_notes:'' });
    } catch (err) { alert('Failed to save evaluation'); }
    finally { setSaving(false); }
  };

  const starClubs = evaluations.filter(e => e.recognition_level === 'star_club');
  const nominated = evaluations.filter(e => e.recognition_level === 'nominated');
  const avgScore = evaluations.length
    ? (evaluations.reduce((s, e) => s + (e.overall_score || 0), 0) / evaluations.length).toFixed(1)
    : 0;

  return (
    <Layout title="Star Club Board" subtitle="Recognition · Awards · Top performing clubs · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        <div style={{...styles.card, borderTop:'4px solid #F5C518'}}>
          <p style={styles.cardLabel}>STAR CLUBS</p>
          <p style={styles.cardValue}>{starClubs.length}</p>
          <p style={{...styles.cardSub, color:'#F5C518'}}>achieved star status</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #1eb457'}}>
          <p style={styles.cardLabel}>NOMINATED</p>
          <p style={styles.cardValue}>{nominated.length}</p>
          <p style={{...styles.cardSub, color:'#1eb457'}}>under evaluation</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #69A9C9'}}>
          <p style={styles.cardLabel}>TOTAL EVALUATIONS</p>
          <p style={styles.cardValue}>{evaluations.length}</p>
          <p style={{...styles.cardSub, color:'#69A9C9'}}>submitted</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #9b59b6'}}>
          <p style={styles.cardLabel}>AVERAGE SCORE</p>
          <p style={styles.cardValue}>{avgScore}</p>
          <p style={{...styles.cardSub, color:'#9b59b6'}}>out of 10</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #F7941D'}}>
          <p style={styles.cardLabel}>CRITERIA (MAX)</p>
          <p style={styles.cardValue}>4</p>
          <p style={{...styles.cardSub, color:'#F7941D'}}>evaluation criteria</p>
        </div>
      </div>

      {/* Star Clubs Showcase */}
      {starClubs.length > 0 && (
        <div style={styles.showcase}>
          <p style={styles.showcaseTitle}>⭐ Star Clubs — RPF 2026</p>
          <div style={styles.showcaseGrid}>
            {starClubs.map(e => (
              <div key={e.id} style={styles.showcaseCard}>
                <div style={styles.starBadge}>⭐ STAR CLUB</div>
                <p style={styles.showcaseName}>{e.school_name}</p>
                <p style={styles.showcaseCounty}>{e.county}</p>
                <StarRating score={e.overall_score || 0} />
                <p style={styles.showcaseMentor}>Mentor: {e.mentor_name || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluations Table */}
      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div>
            <p style={styles.sectionTitle}>All Evaluations & Nominations</p>
            <p style={styles.sectionSub}>{evaluations.length} evaluations · ranked by score</p>
          </div>
          <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Nominate School'}
          </button>
        </div>

        {/* Nomination Form */}
        {showForm && (
          <div style={styles.formBox}>
            <p style={styles.formTitle}>⭐ Nominate a School for Star Club</p>

            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label style={styles.label}>School *</label>
                <select style={styles.formSelect} value={form.school_id}
                  onChange={e => setForm({...form, school_id: e.target.value})}>
                  <option value="">Select school...</option>
                  {schools.filter(s=>s.type==='school' && s.status==='active').map(s => (
                    <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Evaluation Name</label>
                <input style={styles.formInput} placeholder="e.g. Star Club Eval — Term 1 2026..."
                  value={form.evaluation_name}
                  onChange={e => setForm({...form, evaluation_name: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Evaluation Date</label>
                <input type="date" style={styles.formInput} value={form.evaluation_date}
                  onChange={e => setForm({...form, evaluation_date: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Overall Score (0-10)</label>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <input type="range" min="0" max="10" value={form.overall_score}
                    onChange={e => setForm({...form, overall_score: e.target.value})}
                    style={{flex:1}} />
                  <span style={{fontSize:'24px', fontWeight:'700', color:'#F5C518', minWidth:'40px'}}>
                    {form.overall_score}
                  </span>
                </div>
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Recognition Level</label>
                <select style={styles.formSelect} value={form.recognition_level}
                  onChange={e => setForm({...form, recognition_level: e.target.value})}>
                  <option value="none">None</option>
                  <option value="nominated">Nominated</option>
                  <option value="star_club">⭐ Star Club</option>
                </select>
              </div>
            </div>

            {/* Criteria Checklist */}
            <div style={{marginTop:'20px'}}>
              <label style={styles.label}>Criteria Met ({selectedCriteria.length}/4)</label>
              <div style={styles.criteriaGrid}>
                {CRITERIA.map((c, i) => (
                  <div key={i} style={{...styles.criteriaItem,
                    background: selectedCriteria.includes(c) ? '#eafaf1' : '#f8f9fa',
                    border: selectedCriteria.includes(c) ? '1.5px solid #1eb457' : '1.5px solid #e2e8f0',
                    cursor:'pointer'}}
                    onClick={() => toggleCriteria(c)}>
                    <span style={{fontSize:'18px'}}>{selectedCriteria.includes(c) ? '✅' : '⬜'}</span>
                    <span style={{fontSize:'13px', color:'#333'}}>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginTop:'16px'}}>
              <div style={styles.formField}>
                <label style={styles.label}>Evaluator Comments</label>
                <textarea style={styles.formTextarea} rows={3}
                  placeholder="Comments on the school's performance..."
                  value={form.evaluator_comments}
                  onChange={e => setForm({...form, evaluator_comments: e.target.value})} />
              </div>
            </div>

            <div style={styles.formActions}>
              <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : '⭐ Save Evaluation'}
              </button>
              <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead><tr style={styles.thead}>
              <th style={styles.th}>RANK</th>
              <th style={styles.th}>SCHOOL</th>
              <th style={styles.th}>COUNTY</th>
              <th style={styles.th}>CLUB ID</th>
              <th style={styles.th}>SCORE</th>
              <th style={styles.th}>CRITERIA MET</th>
              <th style={styles.th}>RECOGNITION</th>
              <th style={styles.th}>MENTOR</th>
              <th style={styles.th}>DATE</th>
            </tr></thead>
            <tbody>
              {evaluations.map((e, i) => (
                <tr key={e.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                  <td style={{...styles.td, fontWeight:'700', color: i===0?'#F5C518':i===1?'#aaa':i===2?'#cd7f32':'#888'}}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                  </td>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{e.school_name || '—'}</td>
                  <td style={styles.td}>
                    {e.county && (
                      <span style={{...styles.badge,
                        background: (COUNTY_COLORS[e.county]||'#888')+'20',
                        color: COUNTY_COLORS[e.county]||'#888'}}>
                        {e.county}
                      </span>
                    )}
                  </td>
                  <td style={{...styles.td, fontFamily:'monospace', color:'#8a96a3'}}>{e.club_id || '—'}</td>
                  <td style={styles.td}><StarRating score={e.overall_score || 0} /></td>
                  <td style={styles.td}>
                    <span style={{...styles.badge, background:'#f5eef8', color:'#8e44ad'}}>
                      {e.criteria_met || 0}/4 criteria
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{...styles.badge,
                      background: e.recognition_level==='star_club' ? '#fef9e7' :
                                  e.recognition_level==='nominated' ? '#eafaf1' : '#f8f9fa',
                      color: e.recognition_level==='star_club' ? '#F5C518' :
                             e.recognition_level==='nominated' ? '#1a8a4a' : '#888'}}>
                      {e.recognition_level==='star_club' ? '⭐ Star Club' :
                       e.recognition_level==='nominated' ? '🏅 Nominated' : 'None'}
                    </span>
                  </td>
                  <td style={styles.td}>{e.mentor_name || '—'}</td>
                  <td style={styles.td}>
                    {e.evaluation_date ? new Date(e.evaluation_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {evaluations.length === 0 && (
                <tr><td colSpan={9} style={{padding:'40px', textAlign:'center', color:'#888'}}>
                  No evaluations yet. Click "+ Nominate School" to add the first one!
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'16px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 8px 0' },
  cardValue: { fontSize:'36px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'12px', margin:0, fontWeight:'500' },
  showcase: { background:'linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)', borderRadius:'12px', padding:'24px', marginBottom:'20px' },
  showcaseTitle: { fontSize:'16px', fontWeight:'700', color:'#F5C518', margin:'0 0 16px 0' },
  showcaseGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' },
  showcaseCard: { background:'rgba(255,255,255,0.08)', borderRadius:'10px', padding:'16px', textAlign:'center', border:'1px solid rgba(245,197,24,0.3)' },
  starBadge: { background:'#F5C518', color:'#1a2332', borderRadius:'999px', padding:'3px 10px', fontSize:'10px', fontWeight:'800', display:'inline-block', marginBottom:'10px' },
  showcaseName: { fontSize:'14px', fontWeight:'600', color:'#fff', margin:'0 0 4px 0' },
  showcaseCounty: { fontSize:'12px', color:'rgba(255,255,255,0.6)', margin:'0 0 8px 0' },
  showcaseMentor: { fontSize:'11px', color:'rgba(255,255,255,0.5)', margin:'8px 0 0 0' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#F5C518', color:'#1a2332', fontSize:'13px', fontWeight:'700', cursor:'pointer' },
  formBox: { background:'#f8f9fa', borderRadius:'10px', padding:'20px', marginBottom:'20px', border:'1px solid #e2e8f0' },
  formTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px 0' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formInput: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  formTextarea: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none', resize:'vertical', fontFamily:'inherit' },
  criteriaGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginTop:'8px' },
  criteriaItem: { display:'flex', alignItems:'center', gap:'10px', padding:'12px', borderRadius:'8px', transition:'all 0.15s' },
  formActions: { display:'flex', gap:'12px', marginTop:'20px' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#F5C518', color:'#1a2332', fontSize:'14px', fontWeight:'700', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
};
