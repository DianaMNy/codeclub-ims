// src/pages/Teachers.jsx
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
  'Kiambu': '#69A9C9', 'Kajiado': '#F7941D', "Murang'a": '#1eb457',
};

const KENYA_COUNTIES = [
  'Mombasa','Kwale','Kilifi','Tana River','Lamu','Taita-Taveta',
  'Garissa','Wajir','Mandera','Marsabit','Isiolo','Meru',
  'Tharaka-Nithi','Embu','Kitui','Machakos','Makueni','Nyandarua',
  'Nyeri','Kirinyaga',"Murang'a",'Kiambu','Turkana','West Pokot',
  'Samburu','Trans Nzoia','Uasin Gishu','Elgeyo-Marakwet','Nandi',
  'Baringo','Laikipia','Nakuru','Narok','Kajiado','Kericho','Bomet',
  'Kakamega','Vihiga','Bungoma','Busia','Siaya','Kisumu','Homa Bay',
  'Migori','Kisii','Nyamira','Nairobi'
];

const EMPTY_FORM = {
  school_id:'', full_name:'', role:'club_leader', phone:'',
  email:'', ict_confidence:'beginner',
  training_completed:false, safeguarding_done:false, survey_done:false,
  training_date:'', safeguarding_date:'',
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterCounty, setFilterCounty]             = useState('');
  const [filterTraining, setFilterTraining]         = useState('');
  const [filterSafeguarding, setFilterSafeguarding] = useState('');
  const [filterSurvey, setFilterSurvey]             = useState('');
  const [filterRole, setFilterRole]                 = useState('');
  const [search, setSearch]                         = useState('');
  const [sortKey, setSortKey]   = useState('full_name');
  const [sortDir, setSortDir]   = useState('asc');
  const [showModal, setShowModal]           = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.get('/teachers'), api.get('/schools')])
      .then(([t, s]) => { setTeachers(t.data); setSchools(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const openAdd = () => { setEditingTeacher(null); setForm(EMPTY_FORM); setShowModal(true); };

  const openEdit = (t) => {
    setEditingTeacher(t);
    setForm({
      school_id:          t.school_id || '',
      full_name:          t.full_name || '',
      role:               t.role || 'club_leader',
      phone:              t.phone || '',
      email:              t.email || '',
      ict_confidence:     t.ict_confidence || 'beginner',
      training_completed: t.training_completed || false,
      safeguarding_done:  t.safeguarding_done || false,
      survey_done:        t.survey_done || false,
      training_date:      t.training_date ? t.training_date.split('T')[0] : '',
      safeguarding_date:  t.safeguarding_date ? t.safeguarding_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name) return alert('Full name is required');
    setSaving(true);
    try {
      const payload = { ...form, school_id: form.school_id || null };
      if (editingTeacher) { await api.put(`/teachers/${editingTeacher.id}`, payload); }
      else { await api.post('/teachers', payload); }
      setShowModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/teachers/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const filtered = teachers
    .filter(t => {
      if (filterCounty && t.county !== filterCounty) return false;
      if (filterRole && t.role !== filterRole) return false;
      if (filterTraining === 'yes' && !t.training_completed) return false;
      if (filterTraining === 'no' && t.training_completed) return false;
      if (filterSafeguarding === 'yes' && !t.safeguarding_done) return false;
      if (filterSafeguarding === 'no' && t.safeguarding_done) return false;
      if (filterSurvey === 'yes' && !t.survey_done) return false;
      if (filterSurvey === 'no' && t.survey_done) return false;
      if (search && !t.full_name.toLowerCase().includes(search.toLowerCase()) &&
          !t.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] || '', bv = b[sortKey] || '';
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });

  const clubLeaders       = teachers.filter(t => t.role === 'club_leader').length;
  const centreLeaders     = teachers.filter(t => t.role === 'centre_club_leader').length;
  const additional        = teachers.filter(t => t.role === 'additional').length;
  const totalTraining     = teachers.filter(t => t.training_completed).length;
  const totalSafeguarding = teachers.filter(t => t.safeguarding_done).length;
  const totalSurvey       = teachers.filter(t => t.survey_done).length;

  const exportCSV = () => {
    const headers = ['Name','Role','School','County','Mentor','ICT','Training','Safeguarding','Survey'];
    const rows = filtered.map(t => [
      t.full_name, t.role, t.school_name||'', t.county||'',
      t.mentor_name||'', t.ict_confidence||'',
      t.training_completed?'Yes':'No',
      t.safeguarding_done?'Yes':'No',
      t.survey_done?'Yes':'No',
    ]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='teachers_export.csv'; a.click();
  };

  const SortTh = ({ label, sortK }) => (
    <th style={{...styles.th, cursor:'pointer'}} onClick={() => handleSort(sortK)}>
      {label} {sortKey === sortK ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );

  const CheckBadge = ({ done, yesLabel='✅ Done', noLabel, noColor='#e74c3c', noBg='#fdedec' }) => (
    <span style={{...styles.checkBadge,
      background:done?'#eafaf1':noBg, color:done?'#1a8a4a':noColor}}>
      {done ? yesLabel : noLabel}
    </span>
  );

  return (
    <Layout title="Teachers" subtitle="Club Leaders · Centre Club Leaders · Additional Teachers · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'CLUB LEADERS',        value:clubLeaders,       sub:'school facilitators',   color:'#2980b9' },
          { label:'CENTRE CLUB LEADERS', value:centreLeaders,     sub:'community centres',     color:'#8e44ad' },
          { label:'ADDITIONAL TEACHERS', value:additional,        sub:'supporting educators',  color:'#F7941D' },
          { label:'TOTAL EDUCATORS',     value:teachers.length,   sub:'all roles',             color:'#69A9C9' },
          { label:'TRAINING DONE',       value:totalTraining,     sub:`of ${teachers.length}`, color:'#9b59b6' },
          { label:'SAFEGUARDING DONE',   value:totalSafeguarding, sub:`of ${teachers.length}`, color:'#1abc9c' },
          { label:'SURVEY DONE',         value:totalSurvey,       sub:`of ${teachers.length}`, color:'#1eb457' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={styles.cardValue}>{card.value}</p>
            <p style={{...styles.cardSub, color:card.color}}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <input style={styles.search} placeholder="🔍 Search teacher or school..."
            value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={styles.select} value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="club_leader">⭐ Club Leaders</option>
            <option value="centre_club_leader">🏢 Centre Club Leaders</option>
            <option value="additional">👩‍🏫 Additional Teachers</option>
          </select>
          <select style={styles.select} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={filterTraining} onChange={e=>setFilterTraining(e.target.value)}>
            <option value="">All Training</option>
            <option value="yes">✅ Training Done</option>
            <option value="no">❌ Not Trained</option>
          </select>
          <select style={styles.select} value={filterSafeguarding} onChange={e=>setFilterSafeguarding(e.target.value)}>
            <option value="">All Safeguarding</option>
            <option value="yes">✅ Safeguarding Done</option>
            <option value="no">❌ Not Done</option>
          </select>
          <select style={styles.select} value={filterSurvey} onChange={e=>setFilterSurvey(e.target.value)}>
            <option value="">All Survey</option>
            <option value="yes">✅ Survey Done</option>
            <option value="no">❌ Not Done</option>
          </select>
          {(filterCounty||filterRole||filterTraining||filterSafeguarding||filterSurvey||search) && (
            <button style={styles.clearBtn} onClick={()=>{
              setFilterCounty('');setFilterRole('');setFilterTraining('');
              setFilterSafeguarding('');setFilterSurvey('');setSearch('');
            }}>✕ Clear</button>
          )}
        </div>
        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
          <button style={styles.addBtn} onClick={openAdd}>+ Add Teacher</button>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>All club leaders & teachers — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} of {teachers.length} educators · live database</p>
        </div>
        {loading ? <p style={{color:'#888',padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <SortTh label="NAME" sortK="full_name" />
                <th style={styles.th}>ROLE</th>
                <SortTh label="SCHOOL / CENTRE" sortK="school_name" />
                <SortTh label="COUNTY" sortK="county" />
                <SortTh label="MENTOR" sortK="mentor_name" />
                <th style={styles.th}>ICT</th>
                <th style={styles.th}>TRAINING</th>
                <th style={styles.th}>SAFEGUARDING</th>
                <th style={styles.th}>SURVEY</th>
                <th style={styles.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{t.full_name}</td>
                  <td style={styles.td}>
                    <span style={{...styles.roleBadge,
                      background:t.role==='club_leader'?'#e8f4fd':t.role==='centre_club_leader'?'#f5eef8':'#eafaf1',
                      color:t.role==='club_leader'?'#2980b9':t.role==='centre_club_leader'?'#8e44ad':'#1eb457'}}>
                      {t.role==='club_leader'?'⭐ Club Leader':t.role==='centre_club_leader'?'🏢 Centre Club Leader':'👩‍🏫 Additional'}
                    </span>
                  </td>
                  <td style={styles.td}>{t.school_name||'—'}</td>
                  <td style={styles.td}>
                    {t.county ? (
                      <span style={{...styles.countyBadge,
                        background:(COUNTY_COLORS[t.county]||'#888')+'20',
                        color:COUNTY_COLORS[t.county]||'#888'}}>
                        {t.county}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={styles.td}>{t.mentor_name||'—'}</td>
                  <td style={styles.td}>
                    <span style={{...styles.ictBadge,
                      background:t.ict_confidence==='advanced'?'#eafaf1':t.ict_confidence==='intermediate'?'#fff3e0':'#f0f4ff',
                      color:t.ict_confidence==='advanced'?'#1eb457':t.ict_confidence==='intermediate'?'#F7941D':'#3b5bdb'}}>
                      {t.ict_confidence||'—'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <CheckBadge done={t.training_completed} noLabel="⏳ Pending" noColor="#a0720a" noBg="#fef9e7" />
                  </td>
                  <td style={styles.td}>
                    <CheckBadge done={t.safeguarding_done} noLabel="❌ Not done" />
                  </td>
                  <td style={styles.td}>
                    <CheckBadge done={t.survey_done} noLabel="⏳ Pending" noColor="#a0720a" noBg="#fef9e7" />
                  </td>
                  <td style={styles.td}>
                    <button style={styles.editBtn} onClick={()=>openEdit(t)}>✏️ Edit</button>
                    <button style={styles.deleteBtn} onClick={()=>setDeleteConfirm(t)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{padding:'40px',textAlign:'center',color:'#888'}}>
                  No records match your filters.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {editingTeacher ? '✏️ Edit Teacher' : '+ Add Teacher / Club Leader'}
            </h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input style={styles.input} value={form.full_name}
                  onChange={e=>setForm({...form,full_name:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select style={styles.input} value={form.role}
                  onChange={e=>setForm({...form,role:e.target.value})}>
                  <option value="club_leader">⭐ Club Leader (School)</option>
                  <option value="centre_club_leader">🏢 Centre Club Leader</option>
                  <option value="additional">👩‍🏫 Additional Teacher</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>School / Centre</label>
                <select style={styles.input} value={form.school_id}
                  onChange={e=>setForm({...form,school_id:e.target.value})}>
                  <option value="">— Select —</option>
                  {schools.map(s=><option key={s.id} value={s.id}>{s.official_name} ({s.club_id})</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ICT Confidence</label>
                <select style={styles.input} value={form.ict_confidence}
                  onChange={e=>setForm({...form,ict_confidence:e.target.value})}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input style={styles.input} value={form.phone}
                  onChange={e=>setForm({...form,phone:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
            </div>

            <p style={styles.sectionLabel}>📋 Completion Status</p>
            <div style={styles.checkboxRow}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={form.training_completed}
                  onChange={e=>setForm({...form,training_completed:e.target.checked})} />
                {' '}✅ Training Completed
              </label>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={form.safeguarding_done}
                  onChange={e=>setForm({...form,safeguarding_done:e.target.checked})} />
                {' '}🛡️ Safeguarding Done
              </label>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={form.survey_done}
                  onChange={e=>setForm({...form,survey_done:e.target.checked})} />
                {' '}📝 Survey Done
              </label>
            </div>

            <p style={styles.sectionLabel}>📅 Dates (optional)</p>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Training Date</label>
                <input style={styles.input} type="date" value={form.training_date}
                  onChange={e=>setForm({...form,training_date:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Safeguarding Date</label>
                <input style={styles.input} type="date" value={form.safeguarding_date}
                  onChange={e=>setForm({...form,safeguarding_date:e.target.value})} />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setShowModal(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving?'Saving...':editingTeacher?'Save Changes':'Add Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={{...styles.modal, maxWidth:'400px'}}>
            <h3 style={{color:'#e74c3c',margin:'0 0 12px'}}>⚠️ Delete</h3>
            <p style={{color:'#555',margin:'0 0 20px'}}>
              Delete <strong>{deleteConfirm.full_name}</strong>? This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button style={{...styles.saveBtn,background:'#e74c3c'}}
                onClick={()=>handleDelete(deleteConfirm.id)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'10px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'14px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'10px', margin:0, fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'180px' },
  select: { padding:'8px 10px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'12px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  actions: { display:'flex', gap:'10px' },
  exportBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  addBtn: { padding:'8px 16px', borderRadius:'8px', border:'none', background:'#2980b9', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'auto' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'900px' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'10px 14px', fontSize:'13px', color:'#4a5568' },
  roleBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600' },
  ictBadge: { padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', textTransform:'capitalize' },
  checkBadge: { padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  editBtn: { padding:'4px 10px', borderRadius:'6px', border:'1.5px solid #69A9C9', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#69A9C9', marginRight:'6px' },
  deleteBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'#fff', borderRadius:'16px', padding:'32px', width:'90%', maxWidth:'650px', maxHeight:'85vh', overflowY:'auto' },
  modalTitle: { fontSize:'18px', fontWeight:'700', color:'#1a2332', margin:'0 0 24px 0' },
  sectionLabel: { fontSize:'13px', fontWeight:'700', color:'#1a2332', margin:'16px 0 12px', paddingBottom:'6px', borderBottom:'2px solid #f0f0f0' },
  checkboxRow: { display:'flex', gap:'24px', flexWrap:'wrap', marginBottom:'8px' },
  checkLabel: { fontSize:'13px', color:'#555', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' },
  formGroup: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  input: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', outline:'none' },
  modalActions: { display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'16px' },
  cancelBtn: { padding:'10px 20px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#2980b9', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
};