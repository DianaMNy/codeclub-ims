// src/pages/Schools.jsx
import { useEffect, useState } from 'react';
import { getSchools, getMentors } from '../api/index';
import axios from 'axios';
import Layout from '../components/Layout';

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
  club_id:'', official_name:'', type:'school', county:'Kiambu',
  subcounty_area:'', referral_source:'', club_leader_name:'',
  club_leader_phone:'', club_leader_email:'', safeguarding_sponsor:'',
  sponsor_phone:'', learner_count:0, status:'enrolled',
  guidelines_signed:false, notes:'', mentor_id:'',
  enrollment_date:'', cohort:'RPF 2026',
  hos_name:'', hos_phone:'', hos_email:''
};

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMentor, setFilterMentor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortKey, setSortKey] = useState('official_name');
  const [sortDir, setSortDir] = useState('asc');

  const [teachers, setTeachers] = useState([]);
const [hosList, setHosList] = useState([]);

  const fetchData = () => {
  setLoading(true);
  Promise.all([getSchools(), getMentors(), api.get('/teachers'), api.get('/hos')])
    .then(([s, m, t, h]) => {
      setSchools(s.data);
      setMentors(m.data);
      setTeachers(t.data);
      setHosList(h.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
};

  useEffect(() => { fetchData(); }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const openEnrol = () => {
    setEditingSchool(null);
    setForm(EMPTY_FORM);
     setFormErrors({});  // ← add this
    setShowModal(true);
  };

  const openEdit = (school) => {
    setEditingSchool(school);
    setFormErrors({});  // ← add this
    setForm({
      club_id: school.club_id || '',
      official_name: school.official_name || '',
      type: school.type || 'school',
      county: school.county || 'Kiambu',
      subcounty_area: school.subcounty_area || '',
      referral_source: school.referral_source || '',
      club_leader_name: school.club_leader_name || '',
      club_leader_phone: school.club_leader_phone || '',
      club_leader_email: school.club_leader_email || '',
      safeguarding_sponsor: school.safeguarding_sponsor || '',
      sponsor_phone: school.sponsor_phone || '',
      learner_count: school.learner_count || 0,
      status: school.status || 'enrolled',
      guidelines_signed: school.guidelines_signed || false,
      notes: school.notes || '',
      mentor_id: school.mentor_id || '',
      enrollment_date: school.enrollment_date ? school.enrollment_date.split('T')[0] : '',
      cohort: school.cohort || 'RPF 2026',
      hos_name: school.hos_name || '',
      hos_phone: school.hos_phone || '',
      hos_email: school.hos_email || '',
    });
    setShowModal(true);
  };

  const validateForm = () => {
  const errors = {};
  
  // Basic Info
  if (!form.official_name.trim()) errors.official_name = 'Required';
  if (!form.county) errors.county = 'Required';
  if (!form.type) errors.type = 'Required';
  if (!form.subcounty_area.trim()) errors.subcounty_area = 'Required';
  if (!form.status) errors.status = 'Required';
  if (!form.mentor_id) errors.mentor_id = 'Required';
  if (!form.enrollment_date) errors.enrollment_date = 'Required';
  if (!form.cohort.trim()) errors.cohort = 'Required';
  if (!form.referral_source) errors.referral_source = 'Required';
  if (!form.learner_count || form.learner_count < 1) errors.learner_count = 'Must be at least 1';

  // HOS — only required for schools, not community centres
  if (form.type === 'school') {
    if (!form.hos_name?.trim()) errors.hos_name = 'Required for schools';
    if (!form.hos_phone?.trim()) errors.hos_phone = 'Required';
  }

  return errors;
};

const [formErrors, setFormErrors] = useState({});


const handleSave = async () => {
  const errors = validateForm();
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors);
    return;
  }
  setFormErrors({});
  setSaving(true);
  try {
    if (editingSchool) {
      await api.put(`/schools/${editingSchool.id}`, form);
    } else {
      await api.post('/schools', form);
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
      await api.delete(`/schools/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filtered = schools
    .filter(s => {
      if (filterCounty && s.county !== filterCounty) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterMentor && s.mentor_name !== filterMentor) return false;
      if (filterType && s.type !== filterType) return false;
      if (search && !s.official_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] || '';
      const bv = b[sortKey] || '';
      return sortDir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1;
    });

  const schoolsOnly = schools.filter(s => s.type === 'school');
  const active = schools.filter(s => s.status === 'active').length;
  const notStarted = schools.filter(s => s.status === 'enrolled').length;
  const centres = schools.filter(s => s.type === 'community_centre').length;
  const totalLearners = schools.reduce((sum, s) => sum + (s.learner_count || 0), 0);
  const mentorNames = [...new Set(schools.map(s => s.mentor_name).filter(Boolean))].sort();

  const exportCSV = () => {
    const headers = ['Club ID','School Name','Type','County','Area','Mentor','Club Leader','HOS','Learners','Status','Enrolled','Cohort','Guidelines'];
    const rows = filtered.map(s => [
      s.club_id||'', s.official_name, s.type, s.county,
      s.subcounty_area||'', s.mentor_name||'', s.club_leader_name||'',
      s.hos_name||'', s.learner_count||0, s.status,
      s.enrollment_date ? s.enrollment_date.split('T')[0] : '',
      s.cohort||'', s.guidelines_signed ? 'Yes' : 'No',
    ]);
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download='schools_export.csv'; a.click();
  };

  const SortTh = ({ label, sortK }) => (
    <th style={{...styles.th, cursor:'pointer'}} onClick={() => handleSort(sortK)}>
      {label} {sortKey === sortK ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );
const Field = ({ label, fieldKey, type='text', children }) => (
  <div style={styles.formGroup}>
    <label style={styles.label}>
      {label} <span style={{color:'#e74c3c'}}>*</span>
    </label>
    {children || (
      <input
        type={type}
        style={{
          ...styles.input,
          border: formErrors[fieldKey] ? '1.5px solid #e74c3c' : '1.5px solid #e2e8f0'
        }}
        value={form[fieldKey]}
        onChange={e => {
          setForm({...form, [fieldKey]: type==='number' ? Number(e.target.value) : e.target.value});
          if (formErrors[fieldKey]) setFormErrors({...formErrors, [fieldKey]: null});
        }}
      />
    )}
    {formErrors[fieldKey] && (
      <span style={{color:'#e74c3c', fontSize:'11px'}}>{formErrors[fieldKey]}</span>
    )}
  </div>
);


  return (
    <Layout title="Schools & Community Centres" subtitle="Enrolled venues · Live records">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL ENROLLED', value: schoolsOnly.length, sub:'schools', color:'#69A9C9' },
          { label:'ACTIVE CLUBS', value: active, sub:'sessions running', color:'#1eb457' },
          { label:'NOT YET STARTED', value: notStarted, sub:'need activation', color:'#e74c3c' },
          { label:'COMMUNITY CENTRES', value: centres, sub:'3 counties', color:'#F7941D' },
          { label:'TOTAL LEARNERS', value: totalLearners.toLocaleString(), sub:'registered', color:'#9b59b6' },
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
          <input style={{...styles.select, width:'200px'}}
            placeholder="🔍 Search school name..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select style={styles.select} value={filterCounty} onChange={e=>setFilterCounty(e.target.value)}>
            <option value="">All Counties</option>
            {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="enrolled">Not Started</option>
          </select>
          <select style={styles.select} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="school">Schools Only</option>
            <option value="community_centre">Centres Only</option>
          </select>
          <select style={styles.select} value={filterMentor} onChange={e=>setFilterMentor(e.target.value)}>
            <option value="">All Mentors</option>
            {mentorNames.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          {(filterCounty||filterStatus||filterMentor||search||filterType) && (
            <button style={styles.clearBtn} onClick={()=>{
              setFilterCounty('');setFilterStatus('');setFilterMentor('');
              setSearch('');setFilterType('');
            }}>✕ Clear</button>
          )}
        </div>
        <div style={styles.actions}>
          <button style={styles.exportBtn} onClick={exportCSV}>↓ Export CSV</button>
          <button style={styles.enrolBtn} onClick={openEnrol}>+ Enrol School</button>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>All schools & community centres — RPF 2026</p>
          <p style={styles.tableSub}>{filtered.length} of {schools.length} records · {centres} community centres · live database</p>
        </div>
        {loading ? <p style={{color:'#888',padding:'20px'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <SortTh label="ID" sortK="club_id" />
                <SortTh label="SCHOOL / CENTRE" sortK="official_name" />
                <SortTh label="COUNTY" sortK="county" />
                <SortTh label="AREA" sortK="subcounty_area" />
                <SortTh label="MENTOR" sortK="mentor_name" />
                <SortTh label="CLUB LEADER" sortK="club_leader_name" />
                <SortTh label="HEAD OF SCHOOL" sortK="hos_name" />
                <SortTh label="LEARNERS" sortK="learner_count" />
                <SortTh label="ENROLLED" sortK="enrollment_date" />
                <th style={styles.th}>COHORT</th>
                <th style={styles.th}>GUIDELINES</th>
                <SortTh label="STATUS" sortK="status" />
                <th style={styles.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school, i) => (
                <tr key={school.id} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                  <td style={styles.td}><span style={styles.clubId}>{school.club_id||'—'}</span></td>
                  <td style={{...styles.td, fontWeight:'500', color:'#1a2332'}}>{school.official_name}</td>
                  <td style={styles.td}>
                    <span style={{...styles.countyBadge, background:(COUNTY_COLORS[school.county]||'#888')+'20', color:COUNTY_COLORS[school.county]||'#888'}}>
                      {school.county}
                    </span>
                  </td>
                  <td style={styles.td}>{school.subcounty_area||'—'}</td>
                  <td style={styles.td}>{school.mentor_name||'—'}</td>
                  <td style={styles.td}>{school.club_leader_name||'—'}</td>
                  <td style={styles.td}>{school.hos_name||'—'}</td>
                  <td style={styles.td}>{school.learner_count||0}</td>
                  <td style={styles.td}>{school.enrollment_date ? new Date(school.enrollment_date).toLocaleDateString('en-KE') : '—'}</td>
                  <td style={styles.td}><span style={styles.cohortBadge}>{school.cohort||'RPF 2026'}</span></td>
                  <td style={styles.td}>{school.guidelines_signed ? '✅' : '✗'}</td>
                  <td style={styles.td}>
                    <span style={{...styles.statusBadge, background:school.status==='active'?'#eafaf1':'#fdedec', color:school.status==='active'?'#1a8a4a':'#e74c3c'}}>
                      ● {school.status==='active'?'Active':'Not started'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.editBtn} onClick={()=>openEdit(school)}>✏️ Edit</button>
                    <button style={styles.deleteBtn} onClick={()=>setDeleteConfirm(school)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Enrol / Edit Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editingSchool ? '✏️ Edit School' : '+ Enrol School / Centre'}</h3>

            {/* Section: Basic Info */}
          {/* Section: Basic Info */}
<p style={styles.sectionLabel}>📋 Basic Information</p>
<div style={styles.formGrid}>
  <Field label="Club ID" fieldKey="club_id" />
  <Field label="Official Name" fieldKey="official_name" />
  <Field label="Subcounty / Area" fieldKey="subcounty_area" />
  <Field label="Learner Count" fieldKey="learner_count" type="number" />
  <Field label="Notes" fieldKey="notes" />
  <Field label="Type" fieldKey="type">
    <select style={{
      ...styles.input,
      border: formErrors.type ? '1.5px solid #e74c3c' : '1.5px solid #e2e8f0'
    }} value={form.type} onChange={e=>{setForm({...form,type:e.target.value}); setFormErrors({...formErrors,type:null});}}>
      <option value="">— Select —</option>
      <option value="school">School</option>
      <option value="community_centre">Community Centre</option>
    </select>
    {formErrors.type && <span style={{color:'#e74c3c',fontSize:'11px'}}>{formErrors.type}</span>}
  </Field>
  <Field label="County" fieldKey="county">
    <select style={{
      ...styles.input,
      border: formErrors.county ? '1.5px solid #e74c3c' : '1.5px solid #e2e8f0'
    }} value={form.county} onChange={e=>{setForm({...form,county:e.target.value}); setFormErrors({...formErrors,county:null});}}>
      <option value="">— Select —</option>
      {KENYA_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
    {formErrors.county && <span style={{color:'#e74c3c',fontSize:'11px'}}>{formErrors.county}</span>}
  </Field>
  <Field label="Status" fieldKey="status">
    <select style={{
      ...styles.input,
      border: formErrors.status ? '1.5px solid #e74c3c' : '1.5px solid #e2e8f0'
    }} value={form.status} onChange={e=>{setForm({...form,status:e.target.value}); setFormErrors({...formErrors,status:null});}}>
      <option value="">— Select —</option>
      <option value="enrolled">Not Started</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    {formErrors.status && <span style={{color:'#e74c3c',fontSize:'11px'}}>{formErrors.status}</span>}
  </Field>
  <Field label="Referral Source" fieldKey="referral_source">
    <select style={{
      ...styles.input,
      border: formErrors.referral_source ? '1.5px solid #e74c3c' : '1.5px solid #e2e8f0'
    }} value={form.referral_source} onChange={e=>{setForm({...form,referral_source:e.target.value}); setFormErrors({...formErrors,referral_source:null});}}>
      <option value="">— Select —</option>
      <option value="ministry">Ministry</option>
      <option value="self">Self</option>
      <option value="other">Other</option>
    </select>
    {formErrors.referral_source && <span style={{color:'#e74c3c',fontSize:'11px'}}>{formErrors.referral_source}</span>}
  </Field>
  <Field label="Mentor" fieldKey="mentor_id">
    <select style={{
      ...styles.input,
      border: formErrors.mentor_id ? '1.5px solid #e74c3c' : '1.5px solid #e2e8f0'
    }} value={form.mentor_id} onChange={e=>{setForm({...form,mentor_id:e.target.value}); setFormErrors({...formErrors,mentor_id:null});}}>
      <option value="">— Select Mentor —</option>
      {mentors.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}
    </select>
    {formErrors.mentor_id && <span style={{color:'#e74c3c',fontSize:'11px'}}>{formErrors.mentor_id}</span>}
  </Field>
  <Field label="Enrollment Date" fieldKey="enrollment_date" type="date" />
  <Field label="Cohort" fieldKey="cohort" />
  <div style={styles.formGroup}>
    <label style={styles.label}>
      <input type="checkbox" checked={form.guidelines_signed}
        onChange={e=>setForm({...form,guidelines_signed:e.target.checked})} />
      {' '}Guidelines Signed
    </label>
  </div>
</div>

{/* HOS Section */}
<p style={styles.sectionLabel}>🏫 Head of School (Safeguarding Sponsor)</p>
<div style={styles.formGrid}>
  <Field label="HOS Name" fieldKey="hos_name" />
  <Field label="HOS Phone" fieldKey="hos_phone" />
  <Field label="HOS Email" fieldKey="hos_email" />
  <Field label="Safeguarding Sponsor Name" fieldKey="safeguarding_sponsor" />
  <Field label="Sponsor Phone" fieldKey="sponsor_phone" />
</div>
          
{/* Section: Club Leader */}
<p style={styles.sectionLabel}>⭐ Club Leader</p>
<div style={{...styles.formGrid, marginBottom:'24px'}}>
  {editingSchool ? (
    <>
      <div style={styles.formGroup}>
        <label style={styles.label}>Club Leader Name</label>
        <select style={styles.input} value={form.club_leader_name}
          onChange={e => {
            const teacher = teachers.find(t => t.full_name === e.target.value);
            setForm({...form,
              club_leader_name: e.target.value,
              club_leader_phone: teacher?.phone || form.club_leader_phone,
              club_leader_email: teacher?.email || form.club_leader_email,
            });
          }}>
          <option value="">— Select Club Leader —</option>
          {teachers.filter(t => t.role === 'club_leader').map(t => (
            <option key={t.id} value={t.full_name}>
              {t.full_name} — {t.school_name||'unassigned'}
            </option>
          ))}
        </select>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Club Leader Phone</label>
        <input style={styles.input} value={form.club_leader_phone}
          onChange={e=>setForm({...form,club_leader_phone:e.target.value})} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Club Leader Email</label>
        <input style={styles.input} value={form.club_leader_email}
          onChange={e=>setForm({...form,club_leader_email:e.target.value})} />
      </div>
    </>
  ) : (
    <div style={{gridColumn:'1/-1', background:'#f0f4ff', borderRadius:'10px', padding:'14px'}}>
      <p style={{margin:0, fontSize:'13px', color:'#3b5bdb'}}>
        ℹ️ <strong>After enrolling this school</strong>, go to the <strong>Teachers tab</strong> and add a Club Leader — they will be automatically linked to this school.
      </p>
    </div>
  )}
</div>

{/* Section: Head of School */}
<p style={styles.sectionLabel}>🏫 Head of School (Safeguarding Sponsor)</p>
<div style={styles.formGrid}>
  <div style={{...styles.formGroup, gridColumn:'1/-1'}}>
    <label style={styles.label}>Select Head of School</label>
    <select style={styles.input} value={form.hos_name}
      onChange={e => {
        const hos = hosList.find(h => h.full_name === e.target.value);
        setForm({...form,
          hos_name: e.target.value,
          hos_phone: hos?.phone || form.hos_phone,
          hos_email: hos?.email || form.hos_email,
          safeguarding_sponsor: e.target.value,
        });
      }}>
      <option value="">— Select HOS —</option>
      {hosList.map(h => (
        <option key={h.id} value={h.full_name}>{h.full_name} — {h.school_name||'unassigned'}</option>
      ))}
    </select>
  </div>
  <div style={styles.formGroup}>
    <label style={styles.label}>HOS Phone</label>
    <input style={styles.input} value={form.hos_phone}
      onChange={e=>setForm({...form,hos_phone:e.target.value})} />
  </div>
  <div style={styles.formGroup}>
    <label style={styles.label}>HOS Email</label>
    <input style={styles.input} value={form.hos_email}
      onChange={e=>setForm({...form,hos_email:e.target.value})} />
  </div>
  <div style={styles.formGroup}>
    <label style={styles.label}>Sponsor Phone</label>
    <input style={styles.input} value={form.sponsor_phone}
      onChange={e=>setForm({...form,sponsor_phone:e.target.value})} />
  </div>
</div>

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={()=>setShowModal(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingSchool ? 'Save Changes' : 'Enrol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={{...styles.modal, maxWidth:'400px'}}>
            <h3 style={{color:'#e74c3c', margin:'0 0 12px'}}>⚠️ Delete School</h3>
            <p style={{color:'#555', margin:'0 0 20px'}}>
              Are you sure you want to delete <strong>{deleteConfirm.official_name}</strong>? This cannot be undone.
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
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'16px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 8px 0' },
  cardValue: { fontSize:'36px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px 0' },
  cardSub: { fontSize:'12px', margin:0, fontWeight:'500' },
  filterBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'10px', flexWrap:'wrap' },
  select: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer' },
  actions: { display:'flex', gap:'10px' },
  exportBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  enrolBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#F7941D', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  tableCard: { background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' },
  tableHeader: { padding:'20px 24px', borderBottom:'1px solid #f0f0f0' },
  tableTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  tableSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8f9fa' },
  th: { padding:'10px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0', whiteSpace:'nowrap' },
  td: { padding:'12px 16px', fontSize:'13px', color:'#4a5568' },
  clubId: { fontFamily:'monospace', fontSize:'12px', color:'#8a96a3', fontWeight:'600' },
  countyBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  cohortBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', background:'#f0f4ff', color:'#3b5bdb' },
  statusBadge: { padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' },
  clearBtn: { padding:'8px 14px', borderRadius:'8px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#e74c3c' },
  editBtn: { padding:'4px 10px', borderRadius:'6px', border:'1.5px solid #69A9C9', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#69A9C9', marginRight:'6px' },
  deleteBtn: { padding:'4px 8px', borderRadius:'6px', border:'1.5px solid #e74c3c', background:'#fff', fontSize:'12px', cursor:'pointer', color:'#e74c3c' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'#fff', borderRadius:'16px', padding:'32px', width:'90%', maxWidth:'700px', maxHeight:'85vh', overflowY:'auto' },
  modalTitle: { fontSize:'18px', fontWeight:'700', color:'#1a2332', margin:'0 0 24px 0' },
  sectionLabel: { fontSize:'13px', fontWeight:'700', color:'#1a2332', margin:'0 0 12px 0', paddingBottom:'6px', borderBottom:'2px solid #f0f0f0' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px' },
  formGroup: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  input: { padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', outline:'none' },
  modalActions: { display:'flex', justifyContent:'flex-end', gap:'12px' },
  cancelBtn: { padding:'10px 20px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#F7941D', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
};