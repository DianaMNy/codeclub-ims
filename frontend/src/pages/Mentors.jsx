// src/pages/Mentors.jsx
import { useEffect, useState } from 'react';
import { getMentors } from '../api/index';
import axios from 'axios';
import Layout from '../components/Layout';

const [selectedMentor, setSelectedMentor] = useState(null);
const [mentorDetail, setMentorDetail] = useState(null);
const [loadingDetail, setLoadingDetail] = useState(false);

const openDetail = async (mentor) => {
  setSelectedMentor(mentor);
  setLoadingDetail(true);
  try {
    const res = await api.get(`/mentors/${mentor.id}`);
    setMentorDetail(res.data);
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingDetail(false);
  }
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AVATAR_COLORS = [
  '#1eb457','#F7941D','#69A9C9','#9b59b6',
  '#e74c3c','#1abc9c','#f39c12','#2980b9',
];

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
  full_name:'', email:'', phone:'', subcounty_area:'',
  status:'active', join_date:'', county:''
};

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getColor(name) {
  let sum = 0;
  for (let c of name) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [sortKey, setSortKey] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = () => {
    setLoading(true);
    getMentors()
      .then(res => setMentors(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const openAdd = () => {
    setEditingMentor(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (mentor) => {
    setEditingMentor(mentor);
    setForm({
      full_name: mentor.full_name || '',
      email: mentor.email || '',
      phone: mentor.phone || '',
      subcounty_area: mentor.subcounty_area || '',
      status: mentor.status || 'active',
      join_date: mentor.join_date ? mentor.join_date.split('T')[0] : '',
      county: mentor.county || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingMentor) {
        await api.put(`/mentors/${editingMentor.id}`, form);
      } else {
        await api.post('/mentors', form);
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
      await api.delete(`/mentors/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filtered = mentors
    .filter(m => {
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      if (filterCounty && m.county !== filterCounty) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] || '';
      const bv = b[sortKey] || '';
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });

  const activeMentors = mentors.filter(m => m.status === 'active').length;
  const onLeave = mentors.filter(m => m.status === 'on_leave').length;
  const totalSchools = mentors.reduce((sum, m) => sum + parseInt(m.schools_assigned || 0), 0);

  const SortTh = ({ label, sortK }) => (
    <th style={{...styles.th, cursor:'pointer'}} onClick={() => handleSort(sortK)}>
      {label} {sortKey === sortK ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );

  return (
    <Layout title="Mentors" subtitle="Field team · Evidence tracking">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL MENTORS', value: mentors.length, sub:`${activeMentors} active · ${onLeave} on leave`, color:'#69A9C9' },
          { label:'SCHOOLS ASSIGNED', value: totalSchools, sub:'across all mentors', color:'#1eb457' },
          { label:'ACTIVE MENTORS', value: activeMentors, sub:'currently in field', color:'#F7941D' },
          { label:'ON LEAVE', value: onLeave, sub:'temporarily away', color:'#9b59b6' },
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
          <input
            style={{...styles.select, width:'200px'}}
            placeholder="🔍 Search mentor name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={styles.select} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
          <select style={styles.select} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search||filterStatus||filterCounty) && (
            <button style={styles.clearBtn} onClick={()=>{setSearch('');setFilterStatus('');setFilterCounty('');}}>✕ Clear</button>
          )}
        </div>
        <button style={styles.addBtn} onClick={openAdd}>+ Add Mentor</button>
      </div>

      {/* Table */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.sectionTitle}>Full mentor roster — RPF 2026</p>
          <p style={styles.sectionSub}>{filtered.length} of {mentors.length} mentors</p>
        </div>
        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={{background:'#f8f9fa'}}>
                <SortTh label="MENTOR" sortK="full_name" />
                <SortTh label="COUNTY" sortK="county" />
                <SortTh label="AREA" sortK="subcounty_area" />
                <th style={styles.th}>CONTACT</th>
                <SortTh label="SCHOOLS" sortK="schools_assigned" />
                <SortTh label="JOINED" sortK="join_date" />
                <SortTh label="STATUS" sortK="status" />
                <th style={styles.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mentor, i) => (
                <tr key={mentor.id} style={{background: i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                  <td style={styles.td}>
                    <div style={styles.mentorCell}>
                      <div style={{...styles.avatar, background: getColor(mentor.full_name)}}>
                        {getInitials(mentor.full_name)}
                      </div>
                      <div>
                        <p style={{margin:0, fontWeight:'600', color:'#1a2332'}}>{mentor.full_name}</p>
                        <p style={{margin:0, fontSize:'11px', color:'#888'}}>{mentor.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{mentor.county || '—'}</td>
                  <td style={styles.td}>{mentor.subcounty_area || '—'}</td>
                  <td style={styles.td}>{mentor.phone || '—'}</td>
                  <td style={styles.td}>
                    <span style={styles.schoolCount}>{mentor.schools_assigned}</span>
                  </td>
                  <td style={styles.td}>
                    {mentor.join_date ? new Date(mentor.join_date).toLocaleDateString('en-KE') : '—'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: mentor.status==='active'?'#e8f8ee': mentor.status==='on_leave'?'#fff3e0':'#fee',
                      color: mentor.status==='active'?'#1eb457': mentor.status==='on_leave'?'#F7941D':'#e74c3c',
                    }}>
                      ● {mentor.status==='on_leave'?'On Leave': mentor.status.charAt(0).toUpperCase()+mentor.status.slice(1)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.editBtn} onClick={()=>openEdit(mentor)}>✏️ Edit</button>
                    <button style={styles.viewBtn} onClick={()=>openDetail(mentor)}>👁️ View</button>
<button style={styles.editBtn} onClick={()=>openEdit(mentor)}>✏️ Edit</button>
<button style={styles.deleteBtn} onClick={()=>setDeleteConfirm(mentor)}>🗑️</button>
                    <button style={styles.deleteBtn} onClick={()=>setDeleteConfirm(mentor)}>🗑️</button>
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
            <h3 style={styles.modalTitle}>{editingMentor ? '✏️ Edit Mentor' : '+ Add Mentor'}</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input style={styles.input} value={form.full_name}
                  onChange={e=>setForm({...form,full_name:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input style={styles.input} value={form.phone}
                  onChange={e=>setForm({...form,phone:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>County</label>
                <select style={styles.input} value={form.county}
                  onChange={e=>setForm({...form,county:e.target.value})}>
                  <option value="">— Select County —</option>
                  {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Subcounty / Area</label>
                <input style={styles.input} value={form.subcounty_area}
                  onChange={e=>setForm({...form,subcounty_area:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Join Date</label>
                <input style={styles.input} type="date" value={form.join_date}
                  onChange={e=>setForm({...form,join_date:e.target.value})} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select style={styles.input} value={form.status}
                  onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setShowModal(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingMentor ? 'Save Changes' : 'Add Mentor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={{...styles.modal, maxWidth:'400px'}}>
            <h3 style={{color:'#e74c3c', margin:'0 0 12px'}}>⚠️ Delete Mentor</h3>
            <p style={{color:'#555', margin:'0 0 8px'}}>
              Are you sure you want to delete <strong>{deleteConfirm.full_name}</strong>?
            </p>
            <p style={{color:'#e74c3c', fontSize:'13px', margin:'0 0 20px'}}>
              ⚠️ This will NOT delete their assigned schools, but schools will lose their mentor assignment.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button style={{...styles.saveBtn, background:'#e74c3c'}} onClick={()=>handleDelete(deleteConfirm.id)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedMentor && (
  <div style={styles.overlay} onClick={()=>setSelectedMentor(null)}>
    <div style={{...styles.modal, maxWidth:'550px'}} onClick={e=>e.stopPropagation()}>
      
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px'}}>
        <div style={{...styles.avatar, width:'52px', height:'52px', fontSize:'18px', background: getColor(selectedMentor.full_name)}}>
          {getInitials(selectedMentor.full_name)}
        </div>
        <div>
          <h3 style={{margin:0, color:'#1a2332'}}>{selectedMentor.full_name}</h3>
          <p style={{margin:0, fontSize:'13px', color:'#888'}}>{selectedMentor.email} · {selectedMentor.phone}</p>
          <p style={{margin:0, fontSize:'13px', color:'#888'}}>{selectedMentor.county} · {selectedMentor.subcounty_area}</p>
        </div>
      </div>

      {loadingDetail ? <p style={{color:'#888'}}>Loading venues...</p> : mentorDetail && (
        <>
          {/* Summary */}
          <div style={{display:'flex', gap:'12px', marginBottom:'24px'}}>
            <div style={{flex:1, background:'#f0f4ff', borderRadius:'10px', padding:'12px', textAlign:'center'}}>
              <p style={{margin:0, fontSize:'24px', fontWeight:'700', color:'#3b5bdb'}}>{mentorDetail.schools.length}</p>
              <p style={{margin:0, fontSize:'11px', color:'#666', fontWeight:'600'}}>SCHOOLS</p>
            </div>
            <div style={{flex:1, background:'#fff3e0', borderRadius:'10px', padding:'12px', textAlign:'center'}}>
              <p style={{margin:0, fontSize:'24px', fontWeight:'700', color:'#F7941D'}}>{mentorDetail.community_centres.length}</p>
              <p style={{margin:0, fontSize:'11px', color:'#666', fontWeight:'600'}}>COMMUNITY CENTRES</p>
            </div>
            <div style={{flex:1, background:'#e8f8ee', borderRadius:'10px', padding:'12px', textAlign:'center'}}>
              <p style={{margin:0, fontSize:'24px', fontWeight:'700', color:'#1eb457'}}>{mentorDetail.schools.length + mentorDetail.community_centres.length}</p>
              <p style={{margin:0, fontSize:'11px', color:'#666', fontWeight:'600'}}>TOTAL VENUES</p>
            </div>
          </div>

          {/* Schools */}
          {mentorDetail.schools.length > 0 && (
            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'13px', fontWeight:'700', color:'#1a2332', margin:'0 0 10px 0'}}>
                🏫 Schools ({mentorDetail.schools.length})
              </p>
              {mentorDetail.schools.map(s => (
                <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:'8px', background:'#f8f9fa', marginBottom:'6px'}}>
                  <div>
                    <p style={{margin:0, fontSize:'13px', fontWeight:'500', color:'#1a2332'}}>{s.official_name}</p>
                    <p style={{margin:0, fontSize:'11px', color:'#888'}}>{s.county} · {s.subcounty_area}</p>
                  </div>
                  <span style={{
                    padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600',
                    background: s.status==='active'?'#eafaf1':'#fdedec',
                    color: s.status==='active'?'#1a8a4a':'#e74c3c'
                  }}>
                    {s.status==='active'?'Active':'Not started'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Community Centres */}
          {mentorDetail.community_centres.length > 0 && (
            <div style={{marginBottom:'20px'}}>
              <p style={{fontSize:'13px', fontWeight:'700', color:'#1a2332', margin:'0 0 10px 0'}}>
                🏢 Community Centres ({mentorDetail.community_centres.length})
              </p>
              {mentorDetail.community_centres.map(s => (
                <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:'8px', background:'#fff3e0', marginBottom:'6px'}}>
                  <div>
                    <p style={{margin:0, fontSize:'13px', fontWeight:'500', color:'#1a2332'}}>{s.official_name}</p>
                    <p style={{margin:0, fontSize:'11px', color:'#888'}}>{s.county} · {s.subcounty_area}</p>
                  </div>
                  <span style={{
                    padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600',
                    background: s.status==='active'?'#eafaf1':'#fdedec',
                    color: s.status==='active'?'#1a8a4a':'#e74c3c'
                  }}>
                    {s.status==='active'?'Active':'Not started'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {mentorDetail.schools.length === 0 && mentorDetail.community_centres.length === 0 && (
            <p style={{color:'#888', textAlign:'center', padding:'20px'}}>No venues assigned yet.</p>
          )}
        </>
      )}

      <div style={{display:'flex', justifyContent:'flex-end', marginTop:'16px'}}>
        <button style={styles.cancelBtn} onClick={()=>setSelectedMentor(null)}>Close</button>
      </div>
    </div>
  </div>
)}

    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 8px 0' },
  cardValue: { fontSize:'36px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'12px', margin:0, fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'10px', flexWrap:'wrap' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer' },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  section: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  sectionHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  mentorCell: { display:'flex', alignItems:'center', gap:'12px' },
  avatar: { width:'38px', height:'38px', borderRadius:'50%', color:'#fff', fontSize:'13px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  schoolCount: { padding:'3px 10px', borderRadius:'999px', background:'#f0f4ff', color:'#3b5bdb', fontSize:'12px', fontWeight:'600' },
  badge: { padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' },
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
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
};