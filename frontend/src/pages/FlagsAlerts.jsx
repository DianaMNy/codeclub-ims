// src/pages/FlagsAlerts.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9',
  'Kajiado': '#F7941D',
  "Murang'a": '#1eb457',
};

const FLAG_TYPE_LABELS = {
  'mentor_initiated': { label: '👤 Mentor Raised', color: '#e74c3c', bg: '#fdedec' },
  'auto_30': { label: '⏰ 30-Day Auto', color: '#F7941D', bg: '#fdecd5' },
  'auto_60': { label: '⏰ 60-Day Auto', color: '#e67e22', bg: '#fef0e7' },
  'auto_90': { label: '🚨 90-Day Critical', color: '#c0392b', bg: '#fdedec' },
};

const STATUS_STYLES = {
  'open': { label: '🔴 Open', color: '#e74c3c', bg: '#fdedec' },
  'escalated': { label: '🚨 Escalated', color: '#c0392b', bg: '#fde8e8' },
  'resolved': { label: '✅ Resolved', color: '#1a8a4a', bg: '#eafaf1' },
};

export default function FlagsAlerts() {
  const [flags, setFlags] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [form, setForm] = useState({
    school_id: '', reason: '', flag_type: 'mentor_initiated',
  });

  useEffect(() => {
    Promise.all([api.get('/flagalerts'), api.get('/schools')])
      .then(([f, s]) => { setFlags(f.data); setSchools(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshFlags = async () => {
    const res = await api.get('/flagalerts');
    setFlags(res.data);
  };

  const handleRaiseFlag = async () => {
    if (!form.school_id) return alert('Please select a school');
    if (!form.reason) return alert('Please enter a reason');
    setSaving(true);
    try {
      await api.post('/flagalerts', form);
      await refreshFlags();
      setShowForm(false);
      setForm({ school_id:'', reason:'', flag_type:'mentor_initiated' });
    } catch (err) { alert('Failed to raise flag'); }
    finally { setSaving(false); }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/flagalerts/${id}/resolve`, { resolution_notes: resolutionNote });
      await refreshFlags();
      setResolvingId(null);
      setResolutionNote('');
    } catch (err) { alert('Failed to resolve flag'); }
  };

  const handleEscalate = async (id) => {
    try {
      await api.patch(`/flagalerts/${id}/escalate`);
      await refreshFlags();
    } catch (err) { alert('Failed to escalate flag'); }
  };

  const filtered = flags.filter(f => {
    if (filterStatus && f.status !== filterStatus) return false;
    if (filterCounty && f.county !== filterCounty) return false;
    return true;
  });

  const open = flags.filter(f => f.status === 'open').length;
  const escalated = flags.filter(f => f.status === 'escalated').length;
  const resolved = flags.filter(f => f.status === 'resolved').length;
  const critical = flags.filter(f => f.flag_type === 'auto_90').length;

  return (
    <Layout title="Flags & Alerts" subtitle="School monitoring · Escalations · Follow-ups · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        <div style={{...styles.card, borderTop:'4px solid #e74c3c'}}>
          <p style={styles.cardLabel}>OPEN FLAGS</p>
          <p style={styles.cardValue}>{open}</p>
          <p style={{...styles.cardSub, color:'#e74c3c'}}>need attention</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #c0392b'}}>
          <p style={styles.cardLabel}>ESCALATED</p>
          <p style={styles.cardValue}>{escalated}</p>
          <p style={{...styles.cardSub, color:'#c0392b'}}>critical issues</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #1eb457'}}>
          <p style={styles.cardLabel}>RESOLVED</p>
          <p style={styles.cardValue}>{resolved}</p>
          <p style={{...styles.cardSub, color:'#1eb457'}}>closed flags</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #F7941D'}}>
          <p style={styles.cardLabel}>AUTO FLAGS</p>
          <p style={styles.cardValue}>{critical}</p>
          <p style={{...styles.cardSub, color:'#F7941D'}}>90-day critical</p>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #69A9C9'}}>
          <p style={styles.cardLabel}>TOTAL FLAGS</p>
          <p style={styles.cardValue}>{flags.length}</p>
          <p style={{...styles.cardSub, color:'#69A9C9'}}>all time</p>
        </div>
      </div>

      {/* Alert banner if critical flags */}
      {(open > 0 || escalated > 0) && (
        <div style={styles.alertBanner}>
          <span style={{fontSize:'20px'}}>🚨</span>
          <div>
            <p style={styles.alertTitle}>
              {escalated > 0 ? `${escalated} escalated flag${escalated>1?'s':''} require immediate attention!` :
               `${open} open flag${open>1?'s':''} need to be reviewed.`}
            </p>
            <p style={styles.alertSub}>Review and resolve flags below to keep programme on track.</p>
          </div>
        </div>
      )}

      {/* Filters + Raise Flag */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
          <select style={styles.select} value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            <option value="Kiambu">Kiambu</option>
            <option value="Kajiado">Kajiado</option>
            <option value="Murang'a">Murang'a</option>
          </select>
          {(filterStatus || filterCounty) && (
            <button style={styles.clearBtn} onClick={() => { setFilterStatus(''); setFilterCounty(''); }}>
              ✕ Clear
            </button>
          )}
        </div>
        <button style={styles.raiseBtn} onClick={() => setShowForm(!showForm)}>
          🚩 Raise Flag
        </button>
      </div>

      {/* Raise Flag Form */}
      {showForm && (
        <div style={styles.formBox}>
          <p style={styles.formTitle}>🚩 Raise a New Flag</p>
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
              <label style={styles.label}>Flag Type</label>
              <select style={styles.formSelect} value={form.flag_type}
                onChange={e => setForm({...form, flag_type: e.target.value})}>
                <option value="mentor_initiated">👤 Mentor Initiated</option>
                <option value="auto_30">⏰ 30-Day No Activity</option>
                <option value="auto_60">⏰ 60-Day No Activity</option>
                <option value="auto_90">🚨 90-Day Critical</option>
              </select>
            </div>
          </div>
          <div style={{marginTop:'12px'}}>
            <div style={styles.formField}>
              <label style={styles.label}>Reason *</label>
              <textarea style={styles.formTextarea} rows={3}
                placeholder="Why is this school being flagged? What is the concern?"
                value={form.reason}
                onChange={e => setForm({...form, reason: e.target.value})} />
            </div>
          </div>
          <div style={styles.formActions}>
            <button style={styles.saveBtn} onClick={handleRaiseFlag} disabled={saving}>
              {saving ? 'Raising...' : '🚩 Raise Flag'}
            </button>
            <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Flags Table */}
      <div style={styles.section}>
        <p style={styles.sectionTitle}>All Flags & Alerts</p>
        <p style={styles.sectionSub}>{filtered.length} flags · sorted by urgency</p>

        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <div style={{marginTop:'16px', display:'flex', flexDirection:'column', gap:'12px'}}>
            {filtered.map(flag => {
              const statusStyle = STATUS_STYLES[flag.status] || STATUS_STYLES.open;
              const flagTypeInfo = FLAG_TYPE_LABELS[flag.flag_type] || FLAG_TYPE_LABELS.mentor_initiated;
              const isResolving = resolvingId === flag.id;

              return (
                <div key={flag.id} style={{
                  ...styles.flagCard,
                  borderLeft: `4px solid ${statusStyle.color}`,
                  opacity: flag.status === 'resolved' ? 0.7 : 1,
                }}>
                  <div style={styles.flagTop}>
                    <div style={styles.flagLeft}>
                      <div style={styles.flagMeta}>
                        <span style={{...styles.badge, background: flagTypeInfo.bg, color: flagTypeInfo.color}}>
                          {flagTypeInfo.label}
                        </span>
                        <span style={{...styles.badge, background: statusStyle.bg, color: statusStyle.color}}>
                          {statusStyle.label}
                        </span>
                        {flag.county && (
                          <span style={{...styles.badge,
                            background: (COUNTY_COLORS[flag.county]||'#888')+'20',
                            color: COUNTY_COLORS[flag.county]||'#888'}}>
                            {flag.county}
                          </span>
                        )}
                        <span style={styles.clubId}>{flag.club_id || '—'}</span>
                      </div>
                      <p style={styles.flagSchool}>{flag.school_name || '—'}</p>
                      <p style={styles.flagReason}>{flag.reason}</p>
                      <p style={styles.flagMeta2}>
                        Raised by {flag.mentor_name || 'Admin'} · {new Date(flag.flagged_at).toLocaleDateString()}
                        {flag.escalation_level > 0 && ` · Escalation level ${flag.escalation_level}`}
                      </p>
                      {flag.status === 'resolved' && flag.resolution_notes && (
                        <p style={styles.resolutionNote}>✅ Resolution: {flag.resolution_notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    {flag.status !== 'resolved' && (
                      <div style={styles.flagActions}>
                        <button style={styles.resolveBtn}
                          onClick={() => setResolvingId(isResolving ? null : flag.id)}>
                          {isResolving ? '✕ Cancel' : '✅ Resolve'}
                        </button>
                        {flag.status === 'open' && (
                          <button style={styles.escalateBtn} onClick={() => handleEscalate(flag.id)}>
                            🚨 Escalate
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resolution input */}
                  {isResolving && (
                    <div style={styles.resolveBox}>
                      <textarea style={styles.formTextarea} rows={2}
                        placeholder="How was this resolved? What action was taken?"
                        value={resolutionNote}
                        onChange={e => setResolutionNote(e.target.value)} />
                      <button style={{...styles.saveBtn, marginTop:'8px'}}
                        onClick={() => handleResolve(flag.id)}>
                        ✅ Confirm Resolution
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{textAlign:'center', padding:'60px 20px', color:'#888'}}>
                <p style={{fontSize:'48px', margin:'0 0 12px'}}>✅</p>
                <p style={{fontSize:'16px', fontWeight:'600', color:'#1a2332'}}>No flags found!</p>
                <p style={{fontSize:'13px'}}>All schools are on track. Great work!</p>
              </div>
            )}
          </div>
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
  alertBanner: { display:'flex', alignItems:'center', gap:'16px', background:'#fde8e8', border:'1px solid #f5c6c6', borderRadius:'10px', padding:'16px 20px', marginBottom:'20px' },
  alertTitle: { fontSize:'14px', fontWeight:'600', color:'#c0392b', margin:0 },
  alertSub: { fontSize:'12px', color:'#e74c3c', margin:'4px 0 0' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px' },
  filters: { display:'flex', gap:'10px', alignItems:'center' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  raiseBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#e74c3c', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  formBox: { background:'#fff9f9', borderRadius:'10px', padding:'20px', marginBottom:'16px', border:'1px solid #fcc' },
  formTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px 0' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  formTextarea: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none', resize:'vertical', fontFamily:'inherit', width:'100%', boxSizing:'border-box' },
  formActions: { display:'flex', gap:'12px', marginTop:'16px' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#e74c3c', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  flagCard: { background:'#fff', borderRadius:'10px', padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid #f0f0f0' },
  flagTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px' },
  flagLeft: { flex:1 },
  flagMeta: { display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'8px', alignItems:'center' },
  flagSchool: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 6px 0' },
  flagReason: { fontSize:'13px', color:'#555', margin:'0 0 8px 0', lineHeight:1.5 },
  flagMeta2: { fontSize:'11px', color:'#8a96a3', margin:0 },
  resolutionNote: { fontSize:'12px', color:'#1a8a4a', margin:'8px 0 0', background:'#eafaf1', padding:'6px 10px', borderRadius:'6px' },
  flagActions: { display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 },
  resolveBtn: { padding:'7px 14px', borderRadius:'7px', border:'none', background:'#eafaf1', color:'#1a8a4a', fontSize:'12px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' },
  escalateBtn: { padding:'7px 14px', borderRadius:'7px', border:'none', background:'#fdedec', color:'#e74c3c', fontSize:'12px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' },
  resolveBox: { marginTop:'12px', padding:'12px', background:'#f8f9fa', borderRadius:'8px' },
  badge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  clubId: { fontSize:'11px', fontFamily:'monospace', color:'#8a96a3', fontWeight:'600' },
};
