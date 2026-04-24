// src/pages/MandE.jsx — Monitoring & Evaluation
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const TABS = [
  { key: 'observations', label: '👁️ Session Observations', color: '#69A9C9' },
  { key: 'reflections', label: '📝 Teacher Reflections', color: '#1eb457' },
  { key: 'surveys', label: '✅ Surveys & Compliance', color: '#F7941D' },
  { key: 'training', label: '🎓 Training & Onboarding', color: '#9b59b6' },
];

// GPS Hook
function useGPS() {
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const captureGPS = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsLoading(false);
      },
      () => {
        setGpsError('Could not get location. Please allow location access.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return { gps, gpsError, gpsLoading, captureGPS };
}

// GPS Map Popup
function GPSMapPopup({ obs, onClose }) {
  const hasGPS = obs.gps_lat && obs.gps_lng;
  const mapUrl = hasGPS
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${obs.gps_lng - 0.01},${obs.gps_lat - 0.01},${obs.gps_lng + 0.01},${obs.gps_lat + 0.01}&layer=mapnik&marker=${obs.gps_lat},${obs.gps_lng}`
    : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.popup} onClick={e => e.stopPropagation()}>
        <div style={styles.popupHeader}>
          <div>
            <p style={styles.popupTitle}>📍 GPS Location — {obs.school_name}</p>
            <p style={styles.popupSub}>{new Date(obs.observation_date).toLocaleDateString()} · {obs.mentor_name || 'Admin'}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {hasGPS ? (
          <>
            <div style={styles.coordRow}>
              <div style={styles.coordBox}>
                <p style={styles.coordLabel}>LATITUDE</p>
                <p style={styles.coordValue}>{parseFloat(obs.gps_lat).toFixed(6)}</p>
              </div>
              <div style={styles.coordBox}>
                <p style={styles.coordLabel}>LONGITUDE</p>
                <p style={styles.coordValue}>{parseFloat(obs.gps_lng).toFixed(6)}</p>
              </div>
              <div style={styles.coordBox}>
                <p style={styles.coordLabel}>ACCURACY</p>
                <p style={styles.coordValue}>{obs.gps_accuracy ? `±${Math.round(obs.gps_accuracy)}m` : '—'}</p>
              </div>
              <a
                href={`https://www.google.com/maps?q=${obs.gps_lat},${obs.gps_lng}`}
                target="_blank"
                rel="noreferrer"
                style={styles.gmapsBtn}>
                🗺️ Open in Google Maps
              </a>
            </div>
            <iframe
              title="map"
              src={mapUrl}
              style={styles.mapFrame}
              frameBorder="0"
              scrolling="no"
            />
            <p style={styles.mapNote}>
              📍 Mentor was at this location when the observation was submitted · Verified via browser GPS
            </p>
          </>
        ) : (
          <div style={styles.noGPS}>
            <p style={{fontSize:'48px', margin:'0 0 12px'}}>📍</p>
            <p style={{fontSize:'16px', fontWeight:'600', color:'#1a2332'}}>No GPS data for this observation</p>
            <p style={{fontSize:'13px', color:'#888'}}>This observation was submitted before GPS capture was required.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MandE() {
  const [activeTab, setActiveTab] = useState('observations');
  const [schools, setSchools] = useState([]);
  const [observations, setObservations] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [training, setTraining] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedObs, setSelectedObs] = useState(null);
  const { gps, gpsError, gpsLoading, captureGPS } = useGPS();

  const [obsForm, setObsForm] = useState({
    school_id:'', observation_date:'', observed_teacher:'',
    session_type:'regular', learner_count:'', session_quality:'good',
    student_engagement:'high', safeguarding_noted:false,
    safeguarding_category:'', observation_notes:'',
    follow_up_required:false, action_items:'',
    quality_score:'4', engagement_score:'4',
  });

  const [reflForm, setReflForm] = useState({
    school_id:'', teacher_name:'', reflection_title:'',
    reflection_text:'', confidence_rating:'3', milestone:'',
  });

  const [surveyForm, setSurveyForm] = useState({
    school_id:'', survey_name:'', survey_type:'teacher_survey',
    status:'completed', date_completed:'', survey_score:'',
    follow_up_required:false, follow_up_notes:'',
  });

  const [trainingForm, setTrainingForm] = useState({
    training_name:'', training_type:'initial_training',
    date_held:'', county:'', teachers_attended:'',
    mentors_attended:'', facilitator:'', notes:'',
  });

  useEffect(() => {
    Promise.all([
      api.get('/schools'),
      api.get('/mande/observations'),
      api.get('/mande/reflections'),
      api.get('/mande/surveys'),
      api.get('/mande/training'),
    ]).then(([s, o, r, sv, t]) => {
      setSchools(s.data);
      setObservations(o.data);
      setReflections(r.data);
      setSurveys(sv.data);
      setTraining(t.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const refreshData = async () => {
    const [o, r, sv, t] = await Promise.all([
      api.get('/mande/observations'),
      api.get('/mande/reflections'),
      api.get('/mande/surveys'),
      api.get('/mande/training'),
    ]);
    setObservations(o.data);
    setReflections(r.data);
    setSurveys(sv.data);
    setTraining(t.data);
  };

  const handleSaveObservation = async () => {
    if (!obsForm.school_id) return alert('Please select a school');
    if (!obsForm.observation_date) return alert('Please enter observation date');
    if (!gps) return alert('📍 GPS location is required. Please capture your location first.');
    setSaving(true);
    try {
      await api.post('/mande/observations', {
        ...obsForm,
        gps_lat: gps.lat,
        gps_lng: gps.lng,
        gps_accuracy: gps.accuracy,
      });
      await refreshData();
      setShowForm(false);
      setObsForm({ school_id:'', observation_date:'', observed_teacher:'', session_type:'regular', learner_count:'', session_quality:'good', student_engagement:'high', safeguarding_noted:false, safeguarding_category:'', observation_notes:'', follow_up_required:false, action_items:'', quality_score:'4', engagement_score:'4' });
    } catch (err) { alert('Failed to save observation'); }
    finally { setSaving(false); }
  };

  const handleSaveReflection = async () => {
    if (!reflForm.school_id) return alert('Please select a school');
    if (!reflForm.reflection_text) return alert('Please enter reflection text');
    setSaving(true);
    try {
      await api.post('/mande/reflections', reflForm);
      await refreshData();
      setShowForm(false);
      setReflForm({ school_id:'', teacher_name:'', reflection_title:'', reflection_text:'', confidence_rating:'3', milestone:'' });
    } catch (err) { alert('Failed to save reflection'); }
    finally { setSaving(false); }
  };

  const handleSaveSurvey = async () => {
    if (!surveyForm.school_id) return alert('Please select a school');
    if (!surveyForm.survey_name) return alert('Please enter survey name');
    setSaving(true);
    try {
      await api.post('/mande/surveys', surveyForm);
      await refreshData();
      setShowForm(false);
      setSurveyForm({ school_id:'', survey_name:'', survey_type:'teacher_survey', status:'completed', date_completed:'', survey_score:'', follow_up_required:false, follow_up_notes:'' });
    } catch (err) { alert('Failed to save survey'); }
    finally { setSaving(false); }
  };

  const handleSaveTraining = async () => {
    if (!trainingForm.training_name) return alert('Please enter training name');
    setSaving(true);
    try {
      await api.post('/mande/training', trainingForm);
      await refreshData();
      setShowForm(false);
      setTrainingForm({ training_name:'', training_type:'initial_training', date_held:'', county:'', teachers_attended:'', mentors_attended:'', facilitator:'', notes:'' });
    } catch (err) { alert('Failed to save training'); }
    finally { setSaving(false); }
  };

  return (
    <Layout title="M & E" subtitle="Monitoring & Evaluation · Sessions · Reflections · Surveys · Training">

      {/* GPS Map Popup */}
      {selectedObs && <GPSMapPopup obs={selectedObs} onClose={() => setSelectedObs(null)} />}

      {/* Summary Cards */}
      <div style={styles.cards}>
        {[
          { label:'SESSION OBSERVATIONS', value: observations.length, color:'#69A9C9', icon:'👁️' },
          { label:'TEACHER REFLECTIONS', value: reflections.length, color:'#1eb457', icon:'📝' },
          { label:'SURVEYS & COMPLIANCE', value: surveys.length, color:'#F7941D', icon:'✅' },
          { label:'TRAINING SESSIONS', value: training.length, color:'#9b59b6', icon:'🎓' },
          { label:'FOLLOW-UPS NEEDED', value: observations.filter(o=>o.follow_up_required).length + surveys.filter(s=>s.follow_up_required).length, color:'#e74c3c', icon:'🚩' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={{fontSize:'32px', margin:'0 0 4px'}}>{card.icon}</p>
            <p style={{...styles.cardValue}}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <button key={tab.key} style={{...styles.tab,
            borderBottom: activeTab===tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
            color: activeTab===tab.key ? tab.color : '#888',
            fontWeight: activeTab===tab.key ? '600' : '400'}}
            onClick={() => { setActiveTab(tab.key); setShowForm(false); }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SESSION OBSERVATIONS */}
      {activeTab === 'observations' && (
        <div>
          {!showForm ? (
            <div style={styles.section}>
              <div style={styles.sectionHead}>
                <div>
                  <p style={styles.sectionTitle}>Session Observations</p>
                  <p style={styles.sectionSub}>{observations.length} observations · {observations.filter(o=>o.gps_lat).length} with GPS verified location</p>
                </div>
                <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ New Observation</button>
              </div>
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>DATE</th>
                  <th style={styles.th}>SCHOOL</th>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>TEACHER</th>
                  <th style={styles.th}>QUALITY</th>
                  <th style={styles.th}>ENGAGEMENT</th>
                  <th style={styles.th}>GPS</th>
                  <th style={styles.th}>FOLLOW UP</th>
                  <th style={styles.th}>MENTOR</th>
                </tr></thead>
                <tbody>
                  {observations.map((o, i) => (
                    <tr key={o.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={styles.td}>{o.observation_date ? new Date(o.observation_date).toLocaleDateString() : '—'}</td>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{o.school_name || '—'}</td>
                      <td style={styles.td}>{o.county || '—'}</td>
                      <td style={styles.td}>{o.observed_teacher || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background:'#e8f4fd', color:'#2980b9'}}>{o.session_quality || '—'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>{o.student_engagement || '—'}</span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={{...styles.gpsViewBtn,
                            background: o.gps_lat ? '#e8f4fd' : '#f8f9fa',
                            color: o.gps_lat ? '#2980b9' : '#aaa',
                            cursor: 'pointer'}}
                          onClick={() => setSelectedObs(o)}>
                          {o.gps_lat ? '📍 View Map' : '📍 No GPS'}
                        </button>
                      </td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: o.follow_up_required ? '#fdedec' : '#eafaf1',
                          color: o.follow_up_required ? '#e74c3c' : '#1a8a4a'}}>
                          {o.follow_up_required ? '🚩 Yes' : '✅ No'}
                        </span>
                      </td>
                      <td style={styles.td}>{o.mentor_name || '—'}</td>
                    </tr>
                  ))}
                  {observations.length === 0 && (
                    <tr><td colSpan={9} style={{padding:'40px', textAlign:'center', color:'#888'}}>
                      No observations yet. Click "+ New Observation" to add one.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.section}>
              <p style={styles.sectionTitle}>👁️ New Session Observation</p>
              <p style={styles.sectionSub}>📍 GPS location is required to verify mentor presence at school</p>

              <div style={styles.gpsBox}>
                <div style={styles.gpsLeft}>
                  <p style={{margin:0, fontSize:'14px', fontWeight:'600', color:'#1a2332'}}>📍 GPS Location Verification</p>
                  {gps ? (
                    <p style={{margin:'4px 0 0', fontSize:'12px', color:'#1a8a4a'}}>
                      ✅ Location captured: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{Math.round(gps.accuracy)}m accuracy)
                    </p>
                  ) : (
                    <p style={{margin:'4px 0 0', fontSize:'12px', color:'#e74c3c'}}>
                      {gpsError || '❌ Location not captured — tap button to capture GPS (required)'}
                    </p>
                  )}
                </div>
                <button style={{...styles.gpsBtn, background: gps ? '#1eb457' : '#69A9C9'}}
                  onClick={captureGPS} disabled={gpsLoading}>
                  {gpsLoading ? '📡 Getting location...' : gps ? '✅ Location captured' : '📍 Capture My Location'}
                </button>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.label}>School *</label>
                  <select style={styles.formSelect} value={obsForm.school_id}
                    onChange={e => setObsForm({...obsForm, school_id: e.target.value})}>
                    <option value="">Select school...</option>
                    {schools.filter(s=>s.type==='school').map(s => (
                      <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Observation Date *</label>
                  <input type="date" style={styles.formInput} value={obsForm.observation_date}
                    onChange={e => setObsForm({...obsForm, observation_date: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Teacher Observed</label>
                  <input style={styles.formInput} placeholder="Teacher name..." value={obsForm.observed_teacher}
                    onChange={e => setObsForm({...obsForm, observed_teacher: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Number of Learners</label>
                  <input type="number" style={styles.formInput} value={obsForm.learner_count}
                    onChange={e => setObsForm({...obsForm, learner_count: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Session Quality</label>
                  <select style={styles.formSelect} value={obsForm.session_quality}
                    onChange={e => setObsForm({...obsForm, session_quality: e.target.value})}>
                    <option value="poor">Poor</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Student Engagement</label>
                  <select style={styles.formSelect} value={obsForm.student_engagement}
                    onChange={e => setObsForm({...obsForm, student_engagement: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Quality Score (1-5)</label>
                  <select style={styles.formSelect} value={obsForm.quality_score}
                    onChange={e => setObsForm({...obsForm, quality_score: e.target.value})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Follow Up Required?</label>
                  <select style={styles.formSelect} value={obsForm.follow_up_required}
                    onChange={e => setObsForm({...obsForm, follow_up_required: e.target.value === 'true'})}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>

              <div style={{marginTop:'16px'}}>
                <div style={styles.formField}>
                  <label style={styles.label}>Observation Notes</label>
                  <textarea style={styles.formTextarea} rows={3} value={obsForm.observation_notes}
                    placeholder="Describe what you observed..."
                    onChange={e => setObsForm({...obsForm, observation_notes: e.target.value})} />
                </div>
              </div>

              {obsForm.follow_up_required === true || obsForm.follow_up_required === 'true' ? (
                <div style={{marginTop:'12px'}}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Action Items</label>
                    <textarea style={styles.formTextarea} rows={2} value={obsForm.action_items}
                      placeholder="What actions are needed..."
                      onChange={e => setObsForm({...obsForm, action_items: e.target.value})} />
                  </div>
                </div>
              ) : null}

              <div style={styles.formActions}>
                <button style={styles.saveBtn} onClick={handleSaveObservation} disabled={saving || !gps}>
                  {saving ? 'Saving...' : !gps ? '📍 Capture GPS first' : '✅ Save Observation'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEACHER REFLECTIONS */}
      {activeTab === 'reflections' && (
        <div>
          {!showForm ? (
            <div style={styles.section}>
              <div style={styles.sectionHead}>
                <div>
                  <p style={styles.sectionTitle}>Teacher Reflections</p>
                  <p style={styles.sectionSub}>{reflections.length} reflections submitted</p>
                </div>
                <button style={{...styles.addBtn, background:'#1eb457'}} onClick={() => setShowForm(true)}>+ New Reflection</button>
              </div>
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>DATE</th>
                  <th style={styles.th}>SCHOOL</th>
                  <th style={styles.th}>TEACHER</th>
                  <th style={styles.th}>TITLE</th>
                  <th style={styles.th}>CONFIDENCE</th>
                  <th style={styles.th}>STATUS</th>
                </tr></thead>
                <tbody>
                  {reflections.map((r, i) => (
                    <tr key={r.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={styles.td}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{r.school_name || '—'}</td>
                      <td style={styles.td}>{r.teacher_name || '—'}</td>
                      <td style={styles.td}>{r.reflection_title || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background:'#e8f4fd', color:'#2980b9'}}>
                          {r.confidence_rating ? `${r.confidence_rating}/5` : '—'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                  {reflections.length === 0 && (
                    <tr><td colSpan={6} style={{padding:'40px', textAlign:'center', color:'#888'}}>No reflections yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.section}>
              <p style={styles.sectionTitle}>📝 New Teacher Reflection</p>
              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.label}>School *</label>
                  <select style={styles.formSelect} value={reflForm.school_id}
                    onChange={e => setReflForm({...reflForm, school_id: e.target.value})}>
                    <option value="">Select school...</option>
                    {schools.filter(s=>s.type==='school').map(s => (
                      <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Teacher Name</label>
                  <input style={styles.formInput} placeholder="Teacher name..." value={reflForm.teacher_name}
                    onChange={e => setReflForm({...reflForm, teacher_name: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Reflection Title</label>
                  <input style={styles.formInput} placeholder="Title..." value={reflForm.reflection_title}
                    onChange={e => setReflForm({...reflForm, reflection_title: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Confidence Rating (1-5)</label>
                  <select style={styles.formSelect} value={reflForm.confidence_rating}
                    onChange={e => setReflForm({...reflForm, confidence_rating: e.target.value})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Very Low','Low','Medium','High','Very High'][n-1]}</option>)}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Milestone</label>
                  <input style={styles.formInput} placeholder="e.g. Completed Level 1..." value={reflForm.milestone}
                    onChange={e => setReflForm({...reflForm, milestone: e.target.value})} />
                </div>
              </div>
              <div style={{marginTop:'16px'}}>
                <div style={styles.formField}>
                  <label style={styles.label}>Reflection Text *</label>
                  <textarea style={styles.formTextarea} rows={5} value={reflForm.reflection_text}
                    placeholder="What did the teacher reflect on? What went well? What could be improved?"
                    onChange={e => setReflForm({...reflForm, reflection_text: e.target.value})} />
                </div>
              </div>
              <div style={styles.formActions}>
                <button style={{...styles.saveBtn, background:'#1eb457'}} onClick={handleSaveReflection} disabled={saving}>
                  {saving ? 'Saving...' : '✅ Save Reflection'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SURVEYS */}
      {activeTab === 'surveys' && (
        <div>
          {!showForm ? (
            <div style={styles.section}>
              <div style={styles.sectionHead}>
                <div>
                  <p style={styles.sectionTitle}>Surveys & Compliance</p>
                  <p style={styles.sectionSub}>{surveys.length} surveys recorded</p>
                </div>
                <button style={{...styles.addBtn, background:'#F7941D'}} onClick={() => setShowForm(true)}>+ New Survey</button>
              </div>
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>DATE</th>
                  <th style={styles.th}>SCHOOL</th>
                  <th style={styles.th}>SURVEY NAME</th>
                  <th style={styles.th}>TYPE</th>
                  <th style={styles.th}>STATUS</th>
                  <th style={styles.th}>SCORE</th>
                  <th style={styles.th}>FOLLOW UP</th>
                </tr></thead>
                <tbody>
                  {surveys.map((s, i) => (
                    <tr key={s.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={styles.td}>{s.date_completed ? new Date(s.date_completed).toLocaleDateString() : '—'}</td>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{s.school_name || '—'}</td>
                      <td style={styles.td}>{s.survey_name || '—'}</td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#f5eef8', color:'#8e44ad'}}>{s.survey_type}</span></td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#eafaf1', color:'#1a8a4a'}}>{s.status}</span></td>
                      <td style={styles.td}>{s.survey_score || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background: s.follow_up_required?'#fdedec':'#eafaf1', color: s.follow_up_required?'#e74c3c':'#1a8a4a'}}>
                          {s.follow_up_required ? '🚩 Yes' : '✅ No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {surveys.length === 0 && (
                    <tr><td colSpan={7} style={{padding:'40px', textAlign:'center', color:'#888'}}>No surveys yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.section}>
              <p style={styles.sectionTitle}>✅ New Survey / Compliance Check</p>
              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.label}>School *</label>
                  <select style={styles.formSelect} value={surveyForm.school_id}
                    onChange={e => setSurveyForm({...surveyForm, school_id: e.target.value})}>
                    <option value="">Select school...</option>
                    {schools.filter(s=>s.type==='school').map(s => (
                      <option key={s.id} value={s.id}>{s.official_name} — {s.county}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Survey Name *</label>
                  <input style={styles.formInput} placeholder="e.g. Term 1 Teacher Survey..." value={surveyForm.survey_name}
                    onChange={e => setSurveyForm({...surveyForm, survey_name: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Survey Type</label>
                  <select style={styles.formSelect} value={surveyForm.survey_type}
                    onChange={e => setSurveyForm({...surveyForm, survey_type: e.target.value})}>
                    <option value="teacher_survey">Teacher Survey</option>
                    <option value="safeguarding">Safeguarding</option>
                    <option value="compliance_check">Compliance Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Date Completed</label>
                  <input type="date" style={styles.formInput} value={surveyForm.date_completed}
                    onChange={e => setSurveyForm({...surveyForm, date_completed: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Survey Score</label>
                  <input type="number" style={styles.formInput} value={surveyForm.survey_score}
                    onChange={e => setSurveyForm({...surveyForm, survey_score: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Follow Up Required?</label>
                  <select style={styles.formSelect} value={surveyForm.follow_up_required}
                    onChange={e => setSurveyForm({...surveyForm, follow_up_required: e.target.value === 'true'})}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
              <div style={styles.formActions}>
                <button style={{...styles.saveBtn, background:'#F7941D'}} onClick={handleSaveSurvey} disabled={saving}>
                  {saving ? 'Saving...' : '✅ Save Survey'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRAINING */}
      {activeTab === 'training' && (
        <div>
          {!showForm ? (
            <div style={styles.section}>
              <div style={styles.sectionHead}>
                <div>
                  <p style={styles.sectionTitle}>Training & Onboarding</p>
                  <p style={styles.sectionSub}>{training.length} training sessions recorded</p>
                </div>
                <button style={{...styles.addBtn, background:'#9b59b6'}} onClick={() => setShowForm(true)}>+ New Training</button>
              </div>
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  <th style={styles.th}>DATE</th>
                  <th style={styles.th}>TRAINING NAME</th>
                  <th style={styles.th}>TYPE</th>
                  <th style={styles.th}>COUNTY</th>
                  <th style={styles.th}>TEACHERS</th>
                  <th style={styles.th}>MENTORS</th>
                  <th style={styles.th}>FACILITATOR</th>
                </tr></thead>
                <tbody>
                  {training.map((t, i) => (
                    <tr key={t.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                      <td style={styles.td}>{t.date_held ? new Date(t.date_held).toLocaleDateString() : '—'}</td>
                      <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{t.training_name}</td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#f5eef8', color:'#8e44ad'}}>{t.training_type}</span></td>
                      <td style={styles.td}>{t.county || '—'}</td>
                      <td style={styles.td}>{t.teachers_attended || 0}</td>
                      <td style={styles.td}>{t.mentors_attended || 0}</td>
                      <td style={styles.td}>{t.facilitator || '—'}</td>
                    </tr>
                  ))}
                  {training.length === 0 && (
                    <tr><td colSpan={7} style={{padding:'40px', textAlign:'center', color:'#888'}}>No training sessions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.section}>
              <p style={styles.sectionTitle}>🎓 New Training / Onboarding Session</p>
              <div style={styles.formGrid}>
                <div style={styles.formField}>
                  <label style={styles.label}>Training Name *</label>
                  <input style={styles.formInput} placeholder="e.g. Safeguarding Refresher..." value={trainingForm.training_name}
                    onChange={e => setTrainingForm({...trainingForm, training_name: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Training Type</label>
                  <select style={styles.formSelect} value={trainingForm.training_type}
                    onChange={e => setTrainingForm({...trainingForm, training_type: e.target.value})}>
                    <option value="initial_training">Initial Training</option>
                    <option value="safeguarding">Safeguarding</option>
                    <option value="mentor_onboarding">Mentor Onboarding</option>
                    <option value="ict_skills">ICT Skills</option>
                    <option value="pathway_training">Pathway Training</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Date Held</label>
                  <input type="date" style={styles.formInput} value={trainingForm.date_held}
                    onChange={e => setTrainingForm({...trainingForm, date_held: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>County</label>
                  <select style={styles.formSelect} value={trainingForm.county}
                    onChange={e => setTrainingForm({...trainingForm, county: e.target.value})}>
                    <option value="">Select county...</option>
                    <option value="Kiambu">Kiambu</option>
                    <option value="Kajiado">Kajiado</option>
                    <option value="Murang'a">Murang'a</option>
                    <option value="All Counties">All Counties</option>
                  </select>
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Teachers Attended</label>
                  <input type="number" style={styles.formInput} value={trainingForm.teachers_attended}
                    onChange={e => setTrainingForm({...trainingForm, teachers_attended: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Mentors Attended</label>
                  <input type="number" style={styles.formInput} value={trainingForm.mentors_attended}
                    onChange={e => setTrainingForm({...trainingForm, mentors_attended: e.target.value})} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Facilitator</label>
                  <input style={styles.formInput} placeholder="Who facilitated..." value={trainingForm.facilitator}
                    onChange={e => setTrainingForm({...trainingForm, facilitator: e.target.value})} />
                </div>
              </div>
              <div style={{marginTop:'12px'}}>
                <div style={styles.formField}>
                  <label style={styles.label}>Notes</label>
                  <textarea style={styles.formTextarea} rows={3} value={trainingForm.notes}
                    placeholder="Training notes, outcomes, feedback..."
                    onChange={e => setTrainingForm({...trainingForm, notes: e.target.value})} />
                </div>
              </div>
              <div style={styles.formActions}>
                <button style={{...styles.saveBtn, background:'#9b59b6'}} onClick={handleSaveTraining} disabled={saving}>
                  {saving ? 'Saving...' : '✅ Save Training'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'24px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', textAlign:'center' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 4px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', color:'#1a2332', margin:0 },
  tabBar: { display:'flex', marginBottom:'20px', borderBottom:'1px solid #e2e8f0', background:'#fff', borderRadius:'12px 12px 0 0', padding:'0 8px', overflowX:'auto' },
  tab: { padding:'14px 20px', background:'none', border:'none', cursor:'pointer', fontSize:'14px', transition:'all 0.15s', whiteSpace:'nowrap' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#69A9C9', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  gpsViewBtn: { padding:'4px 10px', borderRadius:'6px', border:'none', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  gpsBox: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f0f7ff', borderRadius:'10px', padding:'16px 20px', marginBottom:'20px', border:'1px solid #d4eaf5' },
  gpsLeft: { flex:1 },
  gpsBtn: { padding:'10px 20px', borderRadius:'8px', border:'none', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', marginLeft:'16px' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'16px', marginTop:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formInput: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  formTextarea: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none', resize:'vertical', fontFamily:'inherit' },
  formActions: { display:'flex', gap:'12px', marginTop:'24px' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
  // GPS Popup
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
  popup: { background:'#fff', borderRadius:'16px', padding:'28px', width:'600px', maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  popupHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  popupTitle: { fontSize:'16px', fontWeight:'700', color:'#1a2332', margin:0 },
  popupSub: { fontSize:'12px', color:'#888', margin:'4px 0 0' },
  closeBtn: { background:'#f0f0f0', border:'none', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontSize:'14px' },
  coordRow: { display:'flex', gap:'12px', alignItems:'center', marginBottom:'16px', flexWrap:'wrap' },
  coordBox: { background:'#f8f9fa', borderRadius:'8px', padding:'12px 16px', flex:1, minWidth:'100px' },
  coordLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 4px' },
  coordValue: { fontSize:'14px', fontWeight:'600', color:'#1a2332', margin:0 },
  gmapsBtn: { padding:'10px 16px', borderRadius:'8px', background:'#4285f4', color:'#fff', textDecoration:'none', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' },
  mapFrame: { width:'100%', height:'300px', borderRadius:'10px', border:'none', marginBottom:'12px' },
  mapNote: { fontSize:'11px', color:'#888', textAlign:'center', margin:0 },
  noGPS: { textAlign:'center', padding:'40px 20px' },
};