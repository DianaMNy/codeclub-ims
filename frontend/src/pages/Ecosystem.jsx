// src/pages/Ecosystem.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

const COUNTY_COLORS = {
  'Kiambu': '#69A9C9', 'Kajiado': '#F7941D', "Murang'a": '#1eb457',
};

const ROLE_LABELS = {
  'club_leader':        { label: '⭐ Club Leader',          color: '#2980b9', bg: '#e8f4fd' },
  'centre_club_leader': { label: '🏢 Centre Club Leader',   color: '#1abc9c', bg: '#e8f8f5' },
  'additional':         { label: '👩‍🏫 Additional Teacher',   color: '#1eb457', bg: '#eafaf1' },
  'head_of_school':     { label: '🏫 Head of School',       color: '#8e44ad', bg: '#f5eef8' },
  'centre_manager':     { label: '🏢 Centre Manager',       color: '#9b59b6', bg: '#f0e6ff' },
  'ict_intern':         { label: '💻 ICT Intern (CDE)',      color: '#F7941D', bg: '#fdecd5' },
  'subcounty_director': { label: '📋 Sub-County Director',  color: '#e74c3c', bg: '#fdedec' },
};

const EMPTY_EXTRA = {
  full_name:'', role:'ict_intern', phone:'', email:'',
  county:'', subcounty_area:'',
  training_completed:false, safeguarding_done:false, survey_done:false
};

const EMPTY_HOS = {
  full_name:'', phone:'', email:'', school_id:'',
  training_completed:false, safeguarding_done:false,
  role:'head_of_school'
};

export default function Ecosystem() {
  const [teachers, setTeachers] = useState([]);
  const [hosList, setHosList] = useState([]);
  const [extras, setExtras] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(null); // 'hos' | 'extra'
  const [editingItem, setEditingItem] = useState(null);
  const [hosForm, setHosForm] = useState(EMPTY_HOS);
  const [extraForm, setExtraForm] = useState(EMPTY_EXTRA);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
 
 

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, h, e, s] = await Promise.all([
        api.get('/teachers'),
        api.get('/hos'),
        api.get('/ecosystem-extras'),
        api.get('/schools'),
      ]);
      setTeachers(t.data);
      setHosList(h.data);
      setExtras(e.data);
      setSchools(s.data);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Combine all into one list for display
  const allBuilders = [
    ...teachers.map(t => ({
      ...t,
      _source: 'teacher',
      school_name: t.school_name,
      county: t.county,
      survey_done: null, // teachers don't have survey
    })),
    ...hosList.map(h => ({
      ...h,
      _source: 'hos',
     role: h.role || 'head_of_school', // use actual role from DB,
      survey_done: null,
    })),
    ...extras.map(e => ({
      ...e,
      _source: 'extra',
      school_name: null,
    })),
  ];

  const filtered = allBuilders.filter(b => {
    if (filterRole && b.role !== filterRole) return false;
    if (filterCounty && b.county !== filterCounty) return false;
    if (filterTraining === 'yes' && !b.training_completed) return false;
    if (filterTraining === 'no' && b.training_completed) return false;
    if (search && !b.full_name?.toLowerCase().includes(search.toLowerCase()) &&
        !b.school_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const clubLeaders = allBuilders.filter(b => b.role === 'club_leader').length;
  const hosCount = allBuilders.filter(b => b.role === 'head_of_school').length;
  const ictInterns = allBuilders.filter(b => b.role === 'ict_intern').length;
  const directors = allBuilders.filter(b => b.role === 'subcounty_director').length;
  const trained = allBuilders.filter(b => b.training_completed).length;
  const safeguarded = allBuilders.filter(b => b.safeguarding_done).length;
  const centreManagers = allBuilders.filter(b => b.role === 'centre_manager').length;

  // Update training/safeguarding/survey inline
  const handleToggle = async (item, field) => {
    const newVal = !item[field];
    try {
      if (item._source === 'teacher') {
        await api.put(`/teachers/${item.id}`, { ...item, [field]: newVal });
      } else if (item._source === 'hos') {
        await api.put(`/hos/${item.id}`, { ...item, [field]: newVal });
      } else if (item._source === 'extra') {
        await api.put(`/ecosystem-extras/${item.id}`, { ...item, [field]: newVal });
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const openAddHos = () => {
    setEditingItem(null);
    setHosForm(EMPTY_HOS);
    setShowModal('hos');
  };

  const openEditHos = (item) => {
    setEditingItem(item);
    setHosForm({
      full_name: item.full_name || '',
      phone: item.phone || '',
      email: item.email || '',
      school_id: item.school_id || '',
      training_completed: item.training_completed || false,
      safeguarding_done: item.safeguarding_done || false,
    });
    setShowModal('hos');
  };

  const openAddExtra = () => {
    setEditingItem(null);
    setExtraForm(EMPTY_EXTRA);
    setShowModal('extra');
  };

  const openEditExtra = (item) => {
    setEditingItem(item);
    setExtraForm({
      full_name: item.full_name || '',
      role: item.role || 'ict_intern',
      phone: item.phone || '',
      email: item.email || '',
      county: item.county || '',
      subcounty_area: item.subcounty_area || '',
      training_completed: item.training_completed || false,
      safeguarding_done: item.safeguarding_done || false,
      survey_done: item.survey_done || false,
    });
    setShowModal('extra');
  };

  const handleSaveHos = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await api.put(`/hos/${editingItem.id}`, hosForm);
      } else {
        await api.post('/hos', hosForm);
      }
      setShowModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExtra = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await api.put(`/ecosystem-extras/${editingItem.id}`, extraForm);
      } else {
        await api.post('/ecosystem-extras', extraForm);
      }
      setShowModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteConfirm._source === 'hos') {
        await api.delete(`/hos/${deleteConfirm.id}`);
      } else if (deleteConfirm._source === 'extra') {
        await api.delete(`/ecosystem-extras/${deleteConfirm.id}`);
      }
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const exportCSV = () => {
    const headers = ['Name','Role','School/Centre','County','Training','Safeguarding','Survey'];
    const rows = filtered.map(b => [
      b.full_name, b.role, b.school_name||'', b.county||'',
      b.training_completed?'Yes':'No',
      b.safeguarding_done?'Yes':'No',
      b.survey_done!=null?(b.survey_done?'Yes':'No'):'N/A',
    ]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download='ecosystem_export.csv'; a.click();
  };

  const ToggleBtn = ({ item, field, yesLabel='✅ Done', noLabel='⏳ Pending', noColor='#a0720a', noBg='#fef9e7' }) => (
    <span
      style={{
        ...styles.checkBadge, cursor:'pointer',
        background: item[field] ? '#eafaf1' : noBg,
        color: item[field] ? '#1a8a4a' : noColor,
      }}
      onClick={() => handleToggle(item, field)}
      title="Click to toggle"
    >
      {item[field] ? yesLabel : noLabel}
    </span>
  );

  return (
    <Layout title="Ecosystem Building" subtitle="Managers · Educators · Partners · RPF 2026">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL ECOSYSTEM', value: allBuilders.length, sub:'all categories', color:'#69A9C9' },
          { label:'CLUB LEADERS', value: clubLeaders, sub:'schools & centres', color:'#2980b9' },
          { label:'HEADS OF SCHOOL', value: hosCount, sub:'safeguarding sponsors', color:'#8e44ad' },
          { label:'ICT INTERNS', value: ictInterns, sub:'CDE interns', color:'#F7941D' },
          { label:'SUB-COUNTY DIRECTORS', value: directors, sub:'education directors', color:'#e74c3c' },
          { label:'TRAINING DONE', value: trained, sub:`of ${allBuilders.length}`, color:'#1eb457' },
          { label:'SAFEGUARDING DONE', value: safeguarded, sub:`of ${allBuilders.length}`, color:'#1abc9c' },
          { label:'CENTRE MANAGERS', value: centreManagers, sub:'community centres', color:'#9b59b6' },
          
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
          <input style={styles.search} placeholder="🔍 Search name or school..."
            value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={styles.select} value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
  <option value="">All Roles</option>
  <option value="club_leader">Club Leaders</option>
  <option value="additional">Additional Teachers</option>
  <option value="centre_club_leader">Centre Club Leaders</option>
  <option value="head_of_school">Heads of School</option>
  <option value="centre_manager">Centre Managers</option>
  <option value="ict_intern">ICT Interns</option>
  <option value="subcounty_director">Sub-County Directors</option>
</select>
          <select style={styles.select} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={filterTraining} onChange={e=>setFilterTraining(e.target.value)}>
            <option value="">All Training</option>
            <option value="yes">Training Complete</option>
            <option value="no">Not Trained</option>
          </select>
          {(filterRole||filterCounty||filterTraining||search) && (
            <button style={styles.clearBtn} onClick={()=>{setFilterRole('');setFilterCounty('');setFilterTraining('');setSearch('');}}>✕ Clear</button>
          )}
        </div>
        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
          <button style={styles.hosBtn} onClick={openAddHos}>+ Add HOS / Centre Manager</button>
          <button style={styles.addBtn} onClick={openAddExtra}>+ Add ICT/Director</button>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>Ecosystem builders directory — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} of {allBuilders.length} people · live database · click badges to toggle status</p>
        </div>
        {loading ? <p style={{color:'#888',padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>NAME</th>
                <th style={styles.th}>ROLE</th>
                <th style={styles.th}>SCHOOL / CENTRE</th>
                <th style={styles.th}>COUNTY</th>
                <th style={styles.th}>TRAINING</th>
                <th style={styles.th}>SAFEGUARDING</th>
                <th style={styles.th}>SURVEY</th>
                <th style={styles.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => {
                const roleInfo = ROLE_LABELS[b.role] || { label: b.role, color:'#888', bg:'#f0f0f0' };
                const canEdit = b._source === 'hos' || b._source === 'extra';
                return (
                  <tr key={`${b._source}-${b.id}`} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                    <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{b.full_name}</td>
                    <td style={styles.td}>
                      <span style={{...styles.roleBadge, background:roleInfo.bg, color:roleInfo.color}}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={styles.td}>{b.school_name||'—'}</td>
                    <td style={styles.td}>
                      {b.county && (
                        <span style={{...styles.countyBadge, background:(COUNTY_COLORS[b.county]||'#888')+'20', color:COUNTY_COLORS[b.county]||'#888'}}>
                          {b.county}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <ToggleBtn item={b} field="training_completed" noLabel="⏳ Pending" />
                    </td>
                    <td style={styles.td}>
                      <ToggleBtn item={b} field="safeguarding_done" noLabel="❌ Not done" noColor="#e74c3c" noBg="#fdedec" />
                    </td>
                    <td style={styles.td}>
                      {b.survey_done !== null ? (
                        <ToggleBtn item={b} field="survey_done" noLabel="⏳ Pending" />
                      ) : (
                        <span style={{color:'#ccc', fontSize:'12px'}}>N/A</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {canEdit && (
                        <>
                          <button style={styles.editBtn} onClick={()=> b._source==='hos' ? openEditHos(b) : openEditExtra(b)}>✏️ Edit</button>
                          <button style={styles.deleteBtn} onClick={()=>setDeleteConfirm(b)}>🗑️</button>
                        </>
                      )}
                      {!canEdit && <span style={{color:'#ccc', fontSize:'11px'}}>via Teachers</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* HOS Modal */}
      {showModal === 'hos' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
  <h3 style={styles.modalTitle}>
  {editingItem ? '✏️ Edit' : '+'} {
    hosForm.school_id && schools.find(s => s.id === hosForm.school_id)?.type === 'community_centre'
      ? 'Centre Manager'
      : 'Head of School'
  }
</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input style={styles.input} value={hosForm.full_name}
                  onChange={e=>setHosForm({...hosForm,full_name:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
  <label style={styles.label}>Role</label>
  <select style={styles.input} value={hosForm.role}
    onChange={e=>setHosForm({...hosForm,role:e.target.value})}>
    <option value="head_of_school">🏫 Head of School</option>
    <option value="centre_manager">🏢 Centre Manager</option>
  </select>
</div>
              <div style={styles.formGroup}>
              <label style={styles.label}>
  School / Community Centre
</label>
                <select style={styles.input} value={hosForm.school_id}
                  onChange={e=>setHosForm({...hosForm,school_id:e.target.value})}>
                  <option value="">— Select School —</option>
                  {schools.map(s=><option key={s.id} value={s.id}>{s.official_name} ({s.club_id})</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input style={styles.input} value={hosForm.phone}
                  onChange={e=>setHosForm({...hosForm,phone:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={hosForm.email}
                  onChange={e=>setHosForm({...hosForm,email:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={hosForm.training_completed}
                    onChange={e=>setHosForm({...hosForm,training_completed:e.target.checked})} />
                  {' '}Training Completed
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={hosForm.safeguarding_done}
                    onChange={e=>setHosForm({...hosForm,safeguarding_done:e.target.checked})} />
                  {' '}Safeguarding Done
                </label>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setShowModal(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSaveHos} disabled={saving}>
  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 
    hosForm.school_id && schools.find(s => s.id === hosForm.school_id)?.type === 'community_centre'
      ? 'Add Centre Manager' : 'Add HOS'}
</button>
            </div>
          </div>
        </div>
      )}

      {/* ICT Intern / Sub-County Director Modal */}
      {showModal === 'extra' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editingItem ? '✏️ Edit Person' : '+ Add ICT Intern / Sub-County Director'}</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input style={styles.input} value={extraForm.full_name}
                  onChange={e=>setExtraForm({...extraForm,full_name:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select style={styles.input} value={extraForm.role}
                  onChange={e=>setExtraForm({...extraForm,role:e.target.value})}>
                  <option value="ict_intern">💻 ICT Intern (CDE)</option>
                  <option value="subcounty_director">📋 Sub-County Director</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input style={styles.input} value={extraForm.phone}
                  onChange={e=>setExtraForm({...extraForm,phone:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={extraForm.email}
                  onChange={e=>setExtraForm({...extraForm,email:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>County</label>
                <select style={styles.input} value={extraForm.county}
                  onChange={e=>setExtraForm({...extraForm,county:e.target.value})}>
                  <option value="">— Select County —</option>
                  {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Subcounty / Area</label>
                <input style={styles.input} value={extraForm.subcounty_area}
                  onChange={e=>setExtraForm({...extraForm,subcounty_area:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={extraForm.training_completed}
                    onChange={e=>setExtraForm({...extraForm,training_completed:e.target.checked})} />
                  {' '}Training Completed
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={extraForm.safeguarding_done}
                    onChange={e=>setExtraForm({...extraForm,safeguarding_done:e.target.checked})} />
                  {' '}Safeguarding Done
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input type="checkbox" checked={extraForm.survey_done}
                    onChange={e=>setExtraForm({...extraForm,survey_done:e.target.checked})} />
                  {' '}Survey Done
                </label>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setShowModal(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSaveExtra} disabled={saving}>
                {saving?'Saving...':editingItem?'Save Changes':'Add Person'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={{...styles.modal, maxWidth:'400px'}}>
            <h3 style={{color:'#e74c3c',margin:'0 0 12px'}}>⚠️ Delete Person</h3>
            <p style={{color:'#555',margin:'0 0 20px'}}>
              Are you sure you want to delete <strong>{deleteConfirm.full_name}</strong>?
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button style={{...styles.saveBtn,background:'#e74c3c'}} onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'12px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'30px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'11px', margin:0, fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' },
  search: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', outline:'none', minWidth:'200px' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  actions: { display:'flex', gap:'10px' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  hosBtn: { padding:'8px 16px', borderRadius:'8px', border:'none', background:'#8e44ad', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  addBtn: { padding:'8px 16px', borderRadius:'8px', border:'none', background:'#F7941D', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  roleBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  checkBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' },
  editBtn: { padding:'4px 10px', borderRadius:'6px', border:'1.5px solid #69A9C9', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#69A9C9', marginRight:'6px' },
  deleteBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'#fff', borderRadius:'16px', padding:'32px', width:'90%', maxWidth:'600px', maxHeight:'85vh', overflowY:'auto' },
  modalTitle: { fontSize:'18px', fontWeight:'700', color:'#1a2332', margin:'0 0 24px 0' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px' },
  formGroup: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  input: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', outline:'none' },
  modalActions: { display:'flex', justifyContent:'flex-end', gap:'12px' },
  cancelBtn: { padding:'10px 20px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#8e44ad', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
};