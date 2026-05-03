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
  'Kiambu': '#69A9C9',
  'Kajiado': '#F7941D',
  "Murang'a": '#1eb457',
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
  training_completed:false, safeguarding_done:false,
  training_date:'', safeguarding_date:''
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [filterSafeguarding, setFilterSafeguarding] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/teachers'),
      api.get('/schools'),
    ]).then(([t, s]) => {
      setTeachers(t.data);
      setSchools(s.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const openAdd = () => {
    setEditingTeacher(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setForm({
      school_id: teacher.school_id || '',
      full_name: teacher.full_name || '',
      role: teacher.role || 'club_leader',
      phone: teacher.phone || '',
      email: teacher.email || '',
      ict_confidence: teacher.ict_confidence || 'beginner',
      training_completed: teacher.training_completed || false,
      safeguarding_done: teacher.safeguarding_done || false,
      training_date: teacher.training_date ? teacher.training_date.split('T')[0] : '',
      safeguarding_date: teacher.safeguarding_date ? teacher.safeguarding_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingTeacher) {
        await api.put(`/teachers/${editingTeacher.id}`, form);
      } else {
        await api.post('/teachers', form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/teachers/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filtered = teachers
    .filter(t => {
      if (filterCounty && t.county !== filterCounty) return false;
      if (filterRole && t.role !== filterRole) return false;
      if (filterTraining === 'yes' && !t.training_completed) return false;
      if (filterTraining === 'no' && t.training_completed) return false;
      if (filterSafeguarding === 'yes' && !t.safeguarding_done) return false;
      if (filterSafeguarding === 'no' && t.safeguarding_done) return false;
      if (search && !t.full_name.toLowerCase().includes(search.toLowerCase()) &&
          !t.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] || '';
      const bv = b[sortKey] || '';
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });

  const totalTraining = teachers.filter(t => t.training_completed).length;
  const totalSafeguarding = teachers.filter(t => t.safeguarding_done).length;
  const clubLeaders = teachers.filter(t => t.role === 'club_leader').length;
  const additional = teachers.filter(t => t.role === 'additional').length;
  const completionRate = teachers.length ? Math.round((totalSafeguarding / teachers.length) * 100) : 0;

  const exportCSV = () => {
    const headers = ['Name','Role','School','County','Area','Mentor','ICT','Training','Training Date','Safeguarding','Safeguarding Date'];
    const rows = filtered.map(t => [
      t.full_name, t.role, t.school_name||'', t.county||'',
      t.subcounty_area||'', t.mentor_name||'', t.ict_confidence||'',
      t.training_completed?'Yes':'No',
      t.training_date ? new Date(t.training_date).toLocaleDateString('en-KE') : '',
      t.safeguarding_done?'Yes':'No',
      t.safeguarding_date ? new Date(t.safeguarding_date).toLocaleDateString('en-KE') : '',
    ]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download='teachers_export.csv'; a.click();
  };

  const SortTh = ({ label, sortK }) => (
    <th style={{...styles.th, cursor:'pointer'}} onClick={() => handleSort(sortK)}>
      {label} {sortKey === sortK ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );

  return (
    <Layout title="Teachers & Safeguarding" subtitle="Educators · Safeguarding · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL EDUCATORS', value: teachers.length, sub:'enrolled in system', color:'#69A9C9' },
          { label:'CLUB LEADERS', value: clubLeaders, sub:'main facilitators', color:'#1eb457' },
          { label:'ADDITIONAL TEACHERS', value: additional, sub:'supporting educators', color:'#F7941D' },
          { label:'TRAINING DONE', value: totalTraining, sub:`of ${teachers.length} enrolled`, color:'#9b59b6' },
          { label:'SAFEGUARDING DONE', value: totalSafeguarding, sub:`of ${teachers.length} enrolled`, color:'#1abc9c' },
          { label:'COMPLETION RATE', value: `${completionRate}%`, sub:'safeguarding rate', color:'#e74c3c' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={styles.cardValue}>{card.value}</p>
            <p style={{...styles.cardSub, color: card.color}}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filters}>
          <input style={styles.search} placeholder="🔍 Search teacher or school..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select style={styles.select} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="club_leader">Club Leaders</option>
            <option value="additional">Additional</option>
          </select>
          <select style={styles.select} value={filterTraining} onChange={e=>setFilterTraining(e.target.value)}>
            <option value="">All Training</option>
            <option value="yes">Training Complete</option>
            <option value="no">Not Trained</option>
          </select>
          <select style={styles.select} value={filterSafeguarding} onChange={e=>setFilterSafeguarding(e.target.value)}>
            <option value="">All Safeguarding</option>
            <option value="yes">Safeguarding Done</option>
            <option value="no">Not Done</option>
          </select>
          {(filterCounty||filterRole||filterTraining||filterSafeguarding||search) && (
            <button style={styles.clearBtn} onClick={()=>{
              setFilterCounty('');setFilterRole('');setFilterTraining('');
              setFilterSafeguarding('');setSearch('');
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
          <p style={styles.tableTitle}>All teachers & club leaders — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} of {teachers.length} educators · live database</p>
        </div>
        {loading ? <p style={{color:'#888',padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <SortTh label="TEACHER / CLUB LEADER" sortK="full_name" />
                <th style={styles.th}>ROLE</th>
                <SortTh label="SCHOOL" sortK="school_name" />
                <SortTh label="COUNTY" sortK="county" />
                <SortTh label="MENTOR" sortK="mentor_name" />
                <th style={styles.th}>ICT</th>
                <th style={styles.th}>TRAINING</th>
                <th style={styles.th}>TRAINING DATE</th>
                <th style={styles.th}>SAFEGUARDING</th>
                <th style={styles.th}>SAFEGUARDING DATE</th>
                <th style={styles.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher, i) => (
                <tr key={teacher.id} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{teacher.full_name}</td>
                  <td style={styles.td}>
                    <span style={{...styles.roleBadge,
  background: teacher.role==='club_leader'?'#e8f4fd':
              teacher.role==='centre_club_leader'?'#f5eef8':'#f0f4f8',
  color: teacher.role==='club_leader'?'#2980b9':
         teacher.role==='centre_club_leader'?'#8e44ad':'#666'}}>
  {teacher.role==='club_leader'?'⭐ Club Leader':
   teacher.role==='centre_club_leader'?'🏢 Centre Club Leader':'+ Additional'}
</span>
                  </td>
                  <td style={styles.td}>{teacher.school_name||'—'}</td>
                  <td style={styles.td}>
                    {teacher.county && (
                      <span style={{...styles.countyBadge,
                        background:(COUNTY_COLORS[teacher.county]||'#888')+'20',
                        color:COUNTY_COLORS[teacher.county]||'#888'}}>
                        {teacher.county}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>{teacher.mentor_name||'—'}</td>
                  <td style={styles.td}>
                    <span style={{...styles.ictBadge,
                      background: teacher.ict_confidence==='advanced'?'#eafaf1':teacher.ict_confidence==='intermediate'?'#fff3e0':'#f0f4ff',
                      color: teacher.ict_confidence==='advanced'?'#1eb457':teacher.ict_confidence==='intermediate'?'#F7941D':'#3b5bdb'}}>
                      {teacher.ict_confidence||'—'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{...styles.checkBadge,
                      background:teacher.training_completed?'#eafaf1':'#fef9e7',
                      color:teacher.training_completed?'#1a8a4a':'#a0720a'}}>
                      {teacher.training_completed?'✅ Done':'⏳ Pending'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {teacher.training_date
                      ? new Date(teacher.training_date).toLocaleDateString('en-KE')
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    <span style={{...styles.checkBadge,
                      background:teacher.safeguarding_done?'#eafaf1':'#fdedec',
                      color:teacher.safeguarding_done?'#1a8a4a':'#e74c3c'}}>
                      {teacher.safeguarding_done?'✅ Done':'❌ Not done'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {teacher.safeguarding_date
                      ? new Date(teacher.safeguarding_date).toLocaleDateString('en-KE')
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    <button style={styles.editBtn} onClick={()=>openEdit(teacher)}>✏️ Edit</button>
                    <button style={styles.deleteBtn} onClick={()=>setDeleteConfirm(teacher)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editingTeacher?'✏️ Edit Teacher':'+ Add Teacher / Club Leader'}</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input style={styles.input} value={form.full_name}
                  onChange={e=>setForm({...form,full_name:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>School *</label>
                <select style={styles.input} value={form.school_id}
                  onChange={e=>setForm({...form,school_id:e.target.value})}>
                  <option value="">— Select School —</option>
                  {schools.map(s=><option key={s.id} value={s.id}>{s.official_name} ({s.club_id})</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
               <select style={styles.input} value={form.role}
  onChange={e=>setForm({...form,role:e.target.value})}>
  <option value="club_leader">⭐ Club Leader (School)</option>
  <option value="centre_club_leader">🏢 Centre Club Leader</option>
  <option value="additional">+ Additional Teacher</option>
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

            {/* Training Section */}
            <p style={styles.sectionLabel}>📚 Training</p>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={form.training_completed}
                    onChange={e=>setForm({...form,training_completed:e.target.checked})} />
                  {' '}Training Completed
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Training Date</label>
                <input style={styles.input} type="date" value={form.training_date}
                  onChange={e=>setForm({...form,training_date:e.target.value})} />
              </div>
            </div>

            {/* Safeguarding Section */}
            <p style={styles.sectionLabel}>🛡️ Safeguarding</p>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={form.safeguarding_done}
                    onChange={e=>setForm({...form,safeguarding_done:e.target.checked})} />
                  {' '}Safeguarding Done
                </label>
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
            <h3 style={{color:'#e74c3c',margin:'0 0 12px'}}>⚠️ Delete Teacher</h3>
            <p style={{color:'#555',margin:'0 0 20px'}}>
              Are you sure you want to delete <strong>{deleteConfirm.full_name}</strong>? This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button style={{...styles.saveBtn,background:'#e74c3c'}} onClick={()=>handleDelete(deleteConfirm.id)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'30px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'11px', margin:0, fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'220px' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  actions: { display:'flex', gap:'10px' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#2980b9', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  roleBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  ictBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', textTransform:'capitalize' },
  checkBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  editBtn: { padding:'4px 10px', borderRadius:'6px', border:'1.5px solid #69A9C9', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#69A9C9', marginRight:'6px' },
  deleteBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'#fff', borderRadius:'16px', padding:'32px', width:'90%', maxWidth:'650px', maxHeight:'85vh', overflowY:'auto' },
  modalTitle: { fontSize:'18px', fontWeight:'700', color:'#1a2332', margin:'0 0 24px 0' },
  sectionLabel: { fontSize:'13px', fontWeight:'700', color:'#1a2332', margin:'0 0 12px 0', paddingBottom:'6px', borderBottom:'2px solid #f0f0f0' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px' },
  formGroup: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  input: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', outline:'none' },
  modalActions: { display:'flex', justifyContent:'flex-end', gap:'12px' },
  cancelBtn: { padding:'10px 20px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#2980b9', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
};