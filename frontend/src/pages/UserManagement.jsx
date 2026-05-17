// src/pages/UserManagement.jsx
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

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES = [
  { value:'admin',                  label:'👑 Admin',                  color:'#e74c3c', bg:'#fdedec' },
  { value:'programme_coordinator',  label:'📋 Programme Coordinator',  color:'#9b59b6', bg:'#f5eef8' },
  { value:'mentor',                 label:'👤 Mentor',                  color:'#1eb457', bg:'#eafaf1' },
  { value:'teacher',                label:'🎓 Club Leader / Teacher',   color:'#69A9C9', bg:'#e8f4fd' },
  { value:'county_official',        label:'🏛️ Sub-County Director',    color:'#F7941D', bg:'#fdecd5' },
];

const getRoleStyle = (role) => ROLES.find(r => r.value === role) || { label: role, color:'#888', bg:'#f0f0f0' };

// ── Permissions matrix ────────────────────────────────────────────────────────
const PAGES = [
  { key:'dashboard',          label:'📊 Dashboard' },
  { key:'schools',            label:'🏫 Schools & Centres' },
  { key:'mentors',            label:'👤 Mentors' },
  { key:'teachers',           label:'🎓 Teachers' },
  { key:'ecosystem',          label:'🌱 Ecosystem Building' },
  { key:'safeguarding',       label:'🛡️ Safeguarding' },
  { key:'starclub',           label:'⭐ Star Club Board' },
  { key:'pathways',           label:'🗺️ Pathways & Training' },
  { key:'me',                 label:'📍 M & E' },
  { key:'flags',              label:'🚩 Flags & Alerts' },
  { key:'reports',            label:'📈 Reports' },
  { key:'command',            label:'⚡ Command Centre' },
  { key:'livemap',            label:'🗺️ Live Map' },
  { key:'donor',              label:'💼 Donor View' },
  { key:'users',              label:'👥 User Management' },
];

const PERMISSIONS = {
  admin:                 { dashboard:'full', schools:'full', mentors:'full', teachers:'full', ecosystem:'full', safeguarding:'full', starclub:'full', pathways:'full', me:'full', flags:'full', reports:'full', command:'full', livemap:'full', donor:'full', users:'full' },
  programme_coordinator: { dashboard:'full', schools:'full', mentors:'full', teachers:'full', ecosystem:'full', safeguarding:'full', starclub:'full', pathways:'full', me:'full', flags:'full', reports:'full', command:'full', livemap:'full', donor:'full', users:'none' },
  mentor:                { dashboard:'view', schools:'view', mentors:'view', teachers:'view', ecosystem:'view', safeguarding:'view', starclub:'full', pathways:'full', me:'full', flags:'full', reports:'view', command:'none', livemap:'view', donor:'none', users:'none' },
  teacher:               { dashboard:'view', schools:'view', mentors:'view', teachers:'view', ecosystem:'view', safeguarding:'view', starclub:'full', pathways:'full', me:'full', flags:'view', reports:'view', command:'none', livemap:'view', donor:'none', users:'none' },
  county_official:       { dashboard:'view', schools:'view', mentors:'view', teachers:'view', ecosystem:'view', safeguarding:'view', starclub:'view', pathways:'view', me:'view', flags:'view', reports:'view', command:'none', livemap:'view', donor:'none', users:'none' },
};

const PERM_STYLE = {
  full: { label:'✅ Full CRUD', color:'#1a8a4a', bg:'#eafaf1' },
  view: { label:'👁️ View only', color:'#2980b9', bg:'#e8f4fd' },
  none: { label:'🚫 No access', color:'#8a96a3', bg:'#f8f9fa' },
};

const AVATAR_COLORS = ['#1eb457','#F7941D','#69A9C9','#9b59b6','#e74c3c','#1abc9c'];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'??'; }
function getColor(name) { let s=0; for(let c of (name||'')) s+=c.charCodeAt(0); return AVATAR_COLORS[s%AVATAR_COLORS.length]; }

const EMPTY_FORM = { full_name:'', email:'', password:'', role:'mentor', linked_id:'' };

export default function UserManagement() {
  const isMobile = useIsMobile();
  const [users, setUsers]           = useState([]);
  const [mentors, setMentors]       = useState([]);
  const [teachers, setTeachers]     = useState([]);
  const [ecosystem, setEcosystem]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('users');

  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const [resetId, setResetId]       = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const refreshUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/mentors'),
      api.get('/teachers'),
      api.get('/ecosystem'),
    ]).then(([u, m, t, e]) => {
      setUsers(u.data);
      setMentors(m.data);
      setTeachers(t.data);
      setEcosystem(e.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Dropdown options per role
  const getLinkedOptions = (role) => {
    if (role === 'mentor') return mentors.map(m => ({ id: m.id, label: `${m.full_name} — ${m.subcounty_area||'—'}` }));
    if (role === 'teacher') return teachers.map(t => ({ id: t.id, label: `${t.full_name} — ${t.school_name||'—'}` }));
    if (role === 'county_official') return ecosystem.filter(e => e.role === 'sub_county_director' || e.role?.includes('Director')).map(e => ({ id: e.id, label: `${e.full_name} — ${e.county||'—'}` }));
    return [];
  };

  const openAdd = () => {
    setEditingId(null); setForm(EMPTY_FORM); setError(''); setShowForm(true);
    window.scrollTo({ top: 0, behavior:'smooth' });
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setForm({ full_name:user.full_name, email:user.email, password:'', role:user.role, linked_id:user.mentor_id||'' });
    setError(''); setShowForm(true);
    window.scrollTo({ top: 0, behavior:'smooth' });
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.full_name || !form.email || !form.role) return setError('Full name, email and role are required');
    if (!editingId && (!form.password || form.password.length < 6)) return setError('Password must be at least 6 characters');
    setSaving(true);
    try {
      const payload = { full_name:form.full_name, email:form.email, role:form.role, mentor_id:form.linked_id||null };
      if (!editingId) payload.password = form.password;
      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      await refreshUsers();
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
      setSuccess(editingId ? 'User updated successfully!' : 'User created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      await refreshUsers();
      setSuccess('User deleted.'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete user'); }
  };

  const handleToggle = async (id) => {
    try { await api.patch(`/users/${id}/toggle`); await refreshUsers(); }
    catch { alert('Failed to toggle user'); }
  };

  const handleResetPassword = async (id) => {
    if (!newPassword || newPassword.length < 6) return alert('Password must be at least 6 characters');
    try {
      await api.patch(`/users/${id}/reset-password`, { password: newPassword });
      setResetId(null); setNewPassword('');
      setSuccess('Password reset successfully!'); setTimeout(() => setSuccess(''), 3000);
    } catch { alert('Failed to reset password'); }
  };

  // Stats
  const activeCount = users.filter(u => u.is_active).length;
  const roleCounts = ROLES.reduce((acc, r) => { acc[r.value] = users.filter(u => u.role === r.value).length; return acc; }, {});

  const linkedOptions = getLinkedOptions(form.role);
  const needsLink = ['mentor','teacher','county_official'].includes(form.role);

  return (
    <Layout title="User Management" subtitle="Accounts · Roles · Permissions · Admin only">

      {/* Tabs */}
      <div style={styles.tabs}>
        {['users','permissions'].map(tab => (
          <button key={tab} style={{...styles.tab, borderBottom:activeTab===tab?'2px solid #1eb457':'2px solid transparent', color:activeTab===tab?'#1eb457':'#888', fontWeight:activeTab===tab?'600':'400'}}
            onClick={() => setActiveTab(tab)}>
            {tab === 'users' ? '👥 System Users' : '🔐 Permissions Matrix'}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <>
          {/* Stat Cards */}
          <div style={styles.cards}>
            <div style={{...styles.card, borderTop:'4px solid #69A9C9'}}>
              <p style={styles.cardLabel}>TOTAL USERS</p>
              <p style={{...styles.cardValue, color:'#69A9C9'}}>{users.length}</p>
            </div>
            <div style={{...styles.card, borderTop:'4px solid #1eb457'}}>
              <p style={styles.cardLabel}>ACTIVE</p>
              <p style={{...styles.cardValue, color:'#1eb457'}}>{activeCount}</p>
            </div>
            {ROLES.map(r => (
              <div key={r.value} style={{...styles.card, borderTop:`4px solid ${r.color}`}}>
                <p style={styles.cardLabel}>{r.label.replace(/[^\w\s]/g,'').trim().toUpperCase()}</p>
                <p style={{...styles.cardValue, color:r.color}}>{roleCounts[r.value]||0}</p>
              </div>
            ))}
          </div>

          {success && <div style={styles.successBanner}>✅ {success}</div>}
          {error && !showForm && <div style={styles.errorBanner}>❌ {error}</div>}

          <div style={styles.section}>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionTitle}>All System Users</p>
                <p style={styles.sectionSub}>{users.length} accounts · admin managed</p>
              </div>
              <button style={styles.addBtn} onClick={showForm ? () => { setShowForm(false); setEditingId(null); } : openAdd}>
                {showForm ? '✕ Cancel' : '+ Add User'}
              </button>
            </div>

            {/* Form */}
            {showForm && (
              <div style={styles.formBox}>
                <p style={styles.formTitle}>{editingId ? '✏️ Edit User Account' : '➕ Create New User Account'}</p>
                <div style={styles.formGrid}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Full Name *</label>
                    <input style={styles.formInput} placeholder="e.g. Sophie Anne Masitesa"
                      value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.label}>Email Address *</label>
                    <input type="email" style={styles.formInput} placeholder="email@empserve.org"
                      value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
                  </div>
                  {!editingId && (
                    <div style={styles.formField}>
                      <label style={styles.label}>Password * (min 6 characters)</label>
                      <input type="password" style={styles.formInput} placeholder="••••••••"
                        value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
                    </div>
                  )}
                  <div style={styles.formField}>
                    <label style={styles.label}>Role *</label>
                    <select style={styles.formSelect} value={form.role}
                      onChange={e => setForm({...form, role:e.target.value, linked_id:''})}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  {/* Linked person dropdown — context-aware */}
                  {needsLink && linkedOptions.length > 0 && (
                    <div style={styles.formField}>
                      <label style={styles.label}>
                        {form.role === 'mentor' ? '🔗 Link to Mentor Profile' :
                         form.role === 'teacher' ? '🔗 Link to Club Leader / Teacher' :
                         '🔗 Link to Sub-County Director'}
                      </label>
                      <select style={styles.formSelect} value={form.linked_id}
                        onChange={e => setForm({...form, linked_id:e.target.value})}>
                        <option value="">Select person...</option>
                        {linkedOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Role permissions preview */}
                <div style={{marginTop:'16px', padding:'12px 16px', background:'#f0f7ff', borderRadius:'8px', border:'1px solid #d0e8ff'}}>
                  <p style={{margin:'0 0 8px', fontSize:'12px', fontWeight:'700', color:'#2980b9'}}>
                    🔐 Access level for {ROLES.find(r=>r.value===form.role)?.label}:
                  </p>
                  <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                    {PAGES.map(page => {
                      const perm = PERMISSIONS[form.role]?.[page.key] || 'none';
                      const ps = PERM_STYLE[perm];
                      return (
                        <span key={page.key} style={{padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:'600', background:ps.bg, color:ps.color}}>
                          {page.label.replace(/[^\w\s&]/g,'').trim()} {perm === 'full' ? '✅' : perm === 'view' ? '👁️' : '🚫'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {error && <p style={{color:'#e74c3c', fontSize:'13px', margin:'12px 0 0'}}>{error}</p>}

                <div style={styles.formActions}>
                  <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Saving...' : editingId ? '💾 Update User' : '✅ Create Account'}
                  </button>
                  <button style={styles.cancelBtn} onClick={() => { setShowForm(false); setEditingId(null); setError(''); }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Users List */}
            {loading ? <p style={{color:'#888', padding:'20px'}}>Loading users...</p> : (
              <div style={styles.userList}>
                {users.map(user => {
                  const rs = getRoleStyle(user.role);
                  const isResetting = resetId === user.id;
                  return (
                    <div key={user.id} style={{...styles.userRow, opacity:user.is_active?1:0.65}}>
                      <div style={styles.userLeft}>
                        <div style={{...styles.avatar, background:user.is_active?getColor(user.full_name):'#ccc'}}>
                          {getInitials(user.full_name)}
                        </div>
                        <div>
                          <p style={styles.userName}>{user.full_name}</p>
                          <p style={styles.userEmail}>{user.email}</p>
                          {user.mentor_name && <p style={styles.userMeta}>🔗 {user.mentor_name}</p>}
                        </div>
                      </div>

                      <div style={styles.userMid}>
                        <span style={{...styles.roleBadge, background:rs.bg, color:rs.color}}>{rs.label}</span>
                        <span style={{...styles.statusBadge, background:user.is_active?'#eafaf1':'#fdedec', color:user.is_active?'#1a8a4a':'#e74c3c'}}>
                          {user.is_active ? '● Active' : '● Inactive'}
                        </span>
                        <p style={styles.joinDate}>
                          Joined {new Date(user.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                        </p>
                      </div>

                      <div style={styles.userActions}>
                        <button style={{...styles.actionBtn, background:'#e8f4fd', color:'#2980b9'}}
                          onClick={() => openEdit(user)}>✏️ Edit</button>
                        <button style={{...styles.actionBtn, background:'#f5eef8', color:'#8e44ad'}}
                          onClick={() => setResetId(isResetting ? null : user.id)}>
                          {isResetting ? '✕' : '🔑 Reset PW'}
                        </button>
                        <button style={{...styles.actionBtn, background:user.is_active?'#fdedec':'#eafaf1', color:user.is_active?'#e74c3c':'#1a8a4a'}}
                          onClick={() => handleToggle(user.id)}>
                          {user.is_active ? '🔒 Deactivate' : '✅ Activate'}
                        </button>
                        <button style={{...styles.actionBtn, background:'#fdedec', color:'#e74c3c'}}
                          onClick={() => handleDelete(user.id, user.full_name)}>🗑 Delete</button>
                      </div>

                      {isResetting && (
                        <div style={styles.resetBox}>
                          <input type="password" style={styles.resetInput}
                            placeholder="New password (min 6 chars)..."
                            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                          <button style={styles.resetBtn} onClick={() => handleResetPassword(user.id)}>
                            ✅ Set Password
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PERMISSIONS MATRIX TAB ────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>🔐 Role Permissions Matrix</p>
          <p style={styles.sectionSub}>What each role can do across all pages — RPF 2026</p>

          <div style={{marginTop:'20px', overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', minWidth:'900px'}}>
              <thead>
                <tr style={{background:'#f8f9fa'}}>
                  <th style={{...styles.mth, textAlign:'left', width:'180px'}}>Page</th>
                  {ROLES.map(r => (
                    <th key={r.value} style={{...styles.mth, textAlign:'center'}}>
                      <div style={{padding:'6px 8px', borderRadius:'8px', background:r.bg, color:r.color, fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap'}}>
                        {r.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAGES.map((page, i) => (
                  <tr key={page.key} style={{background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0'}}>
                    <td style={{...styles.mtd, fontWeight:'500', color:'#1a2332'}}>{page.label}</td>
                    {ROLES.map(r => {
                      const perm = PERMISSIONS[r.value]?.[page.key] || 'none';
                      const ps = PERM_STYLE[perm];
                      return (
                        <td key={r.value} style={{...styles.mtd, textAlign:'center'}}>
                          <span style={{padding:'4px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', background:ps.bg, color:ps.color, whiteSpace:'nowrap'}}>
                            {ps.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{display:'flex', gap:'16px', marginTop:'20px', flexWrap:'wrap'}}>
            {Object.entries(PERM_STYLE).map(([key, ps]) => (
              <div key={key} style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <span style={{padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', background:ps.bg, color:ps.color}}>{ps.label}</span>
                <span style={{fontSize:'12px', color:'#555'}}>
                  {key === 'full' ? '— Can view, create, edit and delete' : key === 'view' ? '— Read only, no changes' : '— Page hidden from sidebar'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  tabs: { display:'flex', marginBottom:'20px', borderBottom:'1px solid #e2e8f0' },
  tab: { padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:'14px', transition:'all 0.15s' },
  cards: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'12px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'9px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px' },
  cardValue: { fontSize:'28px', fontWeight:'700', margin:0 },
  successBanner: { background:'#eafaf1', border:'1px solid #a9dfbf', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px', color:'#1a8a4a', fontSize:'14px', fontWeight:'500' },
  errorBanner: { background:'#fdedec', border:'1px solid #f5b7b1', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px', color:'#e74c3c', fontSize:'14px', fontWeight:'500' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  formBox: { background:'#f8f9fa', borderRadius:'10px', padding:'20px', marginBottom:'20px', border:'1px solid #e2e8f0' },
  formTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formInput: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  formActions: { display:'flex', gap:'12px', marginTop:'20px' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
  userList: { display:'flex', flexDirection:'column', gap:'12px' },
  userRow: { display:'flex', alignItems:'center', gap:'16px', padding:'16px', background:'#f8f9fa', borderRadius:'10px', border:'1px solid #f0f0f0', flexWrap:'wrap' },
  userLeft: { display:'flex', alignItems:'center', gap:'12px', flex:1, minWidth:'200px' },
  avatar: { width:'44px', height:'44px', borderRadius:'50%', color:'#fff', fontSize:'15px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  userName: { fontSize:'14px', fontWeight:'600', color:'#1a2332', margin:'0 0 2px' },
  userEmail: { fontSize:'12px', color:'#8a96a3', margin:'0 0 2px' },
  userMeta: { fontSize:'11px', color:'#69A9C9', margin:0 },
  userMid: { display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' },
  roleBadge: { padding:'4px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' },
  statusBadge: { padding:'4px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600' },
  joinDate: { fontSize:'11px', color:'#8a96a3', margin:0 },
  userActions: { display:'flex', gap:'8px', flexWrap:'wrap' },
  actionBtn: { padding:'7px 14px', borderRadius:'7px', border:'none', fontSize:'12px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' },
  resetBox: { width:'100%', display:'flex', gap:'10px', marginTop:'4px', alignItems:'center' },
  resetInput: { flex:1, padding:'8px 12px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', outline:'none' },
  resetBtn: { padding:'8px 16px', borderRadius:'8px', border:'none', background:'#8e44ad', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  mth: { padding:'10px 12px', fontSize:'11px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', borderBottom:'2px solid #f0f0f0' },
  mtd: { padding:'10px 12px', fontSize:'12px', color:'#4a5568' },
};