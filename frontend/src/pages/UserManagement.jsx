// src/pages/UserManagement.jsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const ROLE_STYLES = {
  'admin': { label: '👑 Admin', color: '#e74c3c', bg: '#fdedec' },
  'programme_coordinator': { label: '📋 Programme Coordinator', color: '#9b59b6', bg: '#f5eef8' },
  'mentor': { label: '👤 Mentor', color: '#1eb457', bg: '#eafaf1' },
  'teacher': { label: '🎓 Teacher', color: '#69A9C9', bg: '#e8f4fd' },
};

const AVATAR_COLORS = ['#1eb457','#F7941D','#69A9C9','#9b59b6','#e74c3c','#1abc9c'];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'??'; }
function getColor(name) { let s=0; for(let c of (name||'')) s+=c.charCodeAt(0); return AVATAR_COLORS[s%AVATAR_COLORS.length]; }

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    role: 'mentor', mentor_id: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/mentors')])
      .then(([u, m]) => { setUsers(u.data); setMentors(m.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const refreshUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const handleCreate = async () => {
    setError(''); setSuccess('');
    if (!form.full_name || !form.email || !form.password || !form.role) {
      return setError('All fields are required');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await api.post('/users', form);
      await refreshUsers();
      setShowForm(false);
      setForm({ full_name:'', email:'', password:'', role:'mentor', mentor_id:'' });
      setSuccess('User created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/users/${id}/toggle`);
      await refreshUsers();
    } catch (err) { alert('Failed to toggle user'); }
  };

  const handleResetPassword = async (id) => {
    if (!newPassword || newPassword.length < 6) return alert('Password must be at least 6 characters');
    try {
      await api.patch(`/users/${id}/reset-password`, { password: newPassword });
      setResetId(null);
      setNewPassword('');
      setSuccess('Password reset successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert('Failed to reset password'); }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const coordCount = users.filter(u => u.role === 'programme_coordinator').length;
  const mentorCount = users.filter(u => u.role === 'mentor').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const activeCount = users.filter(u => u.is_active).length;

  return (
    <Layout title="User Management" subtitle="Accounts · Roles · Permissions · Admin only">

      {/* Stat Cards */}
      <div style={styles.cards}>
        {[
          { label:'TOTAL USERS', value: users.length, color:'#69A9C9' },
          { label:'ACTIVE', value: activeCount, color:'#1eb457' },
          { label:'ADMINS', value: adminCount, color:'#e74c3c' },
          { label:'COORDINATORS', value: coordCount, color:'#9b59b6' },
          { label:'MENTORS', value: mentorCount, color:'#1eb457' },
          { label:'TEACHERS', value: teacherCount, color:'#F7941D' },
        ].map(card => (
          <div key={card.label} style={{...styles.card, borderTop:`4px solid ${card.color}`}}>
            <p style={styles.cardLabel}>{card.label}</p>
            <p style={{...styles.cardValue, color: card.color}}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Success/Error */}
      {success && <div style={styles.successBanner}>✅ {success}</div>}
      {error && <div style={styles.errorBanner}>❌ {error}</div>}

      {/* Users Table */}
      <div style={styles.section}>
        <div style={styles.sectionHead}>
          <div>
            <p style={styles.sectionTitle}>All System Users</p>
            <p style={styles.sectionSub}>{users.length} accounts · admin managed</p>
          </div>
          <button style={styles.addBtn} onClick={() => { setShowForm(!showForm); setError(''); }}>
            {showForm ? '✕ Cancel' : '+ Add User'}
          </button>
        </div>

        {/* Create User Form */}
        {showForm && (
          <div style={styles.formBox}>
            <p style={styles.formTitle}>➕ Create New User Account</p>
            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label style={styles.label}>Full Name *</label>
                <input style={styles.formInput} placeholder="e.g. Sophie Anne Masitesa"
                  value={form.full_name}
                  onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Email Address *</label>
                <input type="email" style={styles.formInput} placeholder="email@empserve.org"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Password * (min 6 characters)</label>
                <input type="password" style={styles.formInput} placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Role *</label>
                <select style={styles.formSelect} value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="admin">👑 Admin</option>
                  <option value="programme_coordinator">📋 Programme Coordinator</option>
                  <option value="mentor">👤 Mentor</option>
                  <option value="teacher">🎓 Teacher</option>
                </select>
              </div>
              {form.role === 'mentor' && (
                <div style={styles.formField}>
                  <label style={styles.label}>Link to Mentor Profile</label>
                  <select style={styles.formSelect} value={form.mentor_id}
                    onChange={e => setForm({...form, mentor_id: e.target.value})}>
                    <option value="">Select mentor...</option>
                    {mentors.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name} — {m.subcounty_area||'—'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.formActions}>
              <button style={styles.saveBtn} onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : '✅ Create Account'}
              </button>
              <button style={styles.cancelBtn} onClick={() => { setShowForm(false); setError(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Users List */}
        {loading ? <p style={{color:'#888', padding:'20px'}}>Loading users...</p> : (
          <div style={styles.userList}>
            {users.map(user => {
              const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.mentor;
              const isResetting = resetId === user.id;
              return (
                <div key={user.id} style={{
                  ...styles.userRow,
                  opacity: user.is_active ? 1 : 0.6,
                }}>
                  <div style={styles.userLeft}>
                    <div style={{
                      ...styles.avatar,
                      background: user.is_active ? getColor(user.full_name) : '#ccc'
                    }}>
                      {getInitials(user.full_name)}
                    </div>
                    <div>
                      <p style={styles.userName}>{user.full_name}</p>
                      <p style={styles.userEmail}>{user.email}</p>
                      {user.mentor_name && (
                        <p style={styles.userMeta}>Linked to: {user.mentor_name}</p>
                      )}
                    </div>
                  </div>

                  <div style={styles.userMid}>
                    <span style={{...styles.roleBadge, background: roleStyle.bg, color: roleStyle.color}}>
                      {roleStyle.label}
                    </span>
                    <span style={{...styles.statusBadge,
                      background: user.is_active ? '#eafaf1' : '#fdedec',
                      color: user.is_active ? '#1a8a4a' : '#e74c3c'}}>
                      {user.is_active ? '● Active' : '● Inactive'}
                    </span>
                    <p style={styles.joinDate}>
                      Joined {new Date(user.created_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                    </p>
                  </div>

                  <div style={styles.userActions}>
                    <button style={{...styles.actionBtn, background:'#f5eef8', color:'#8e44ad'}}
                      onClick={() => setResetId(isResetting ? null : user.id)}>
                      {isResetting ? '✕' : '🔑 Reset PW'}
                    </button>
                    <button style={{
                      ...styles.actionBtn,
                      background: user.is_active ? '#fdedec' : '#eafaf1',
                      color: user.is_active ? '#e74c3c' : '#1a8a4a'}}
                      onClick={() => handleToggle(user.id)}>
                      {user.is_active ? '🔒 Deactivate' : '✅ Activate'}
                    </button>
                  </div>

                  {/* Password reset inline */}
                  {isResetting && (
                    <div style={styles.resetBox}>
                      <input type="password" style={styles.resetInput}
                        placeholder="New password (min 6 chars)..."
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} />
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
    </Layout>
  );
}

const styles = {
  cards: { display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'20px' },
  card: { background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:'10px', fontWeight:'700', color:'#8a96a3', letterSpacing:'0.5px', margin:'0 0 6px 0' },
  cardValue: { fontSize:'28px', fontWeight:'700', margin:0 },
  successBanner: { background:'#eafaf1', border:'1px solid #a9dfbf', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px', color:'#1a8a4a', fontSize:'14px', fontWeight:'500' },
  errorBanner: { background:'#fdedec', border:'1px solid #f5b7b1', borderRadius:'8px', padding:'12px 16px', marginBottom:'16px', color:'#e74c3c', fontSize:'14px', fontWeight:'500' },
  section: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionHead: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 4px 0' },
  sectionSub: { fontSize:'12px', color:'#8a96a3', margin:0 },
  addBtn: { padding:'8px 18px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  formBox: { background:'#f8f9fa', borderRadius:'10px', padding:'20px', marginBottom:'20px', border:'1px solid #e2e8f0' },
  formTitle: { fontSize:'15px', fontWeight:'600', color:'#1a2332', margin:'0 0 16px 0' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'16px' },
  formField: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { fontSize:'12px', fontWeight:'600', color:'#555' },
  formInput: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', outline:'none' },
  formSelect: { padding:'10px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontSize:'13px', color:'#333', background:'#fff', cursor:'pointer', outline:'none' },
  errorText: { color:'#e74c3c', fontSize:'13px', margin:'12px 0 0 0' },
  formActions: { display:'flex', gap:'12px', marginTop:'20px' },
  saveBtn: { padding:'10px 24px', borderRadius:'8px', border:'none', background:'#1eb457', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  cancelBtn: { padding:'10px 24px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#555', fontSize:'14px', cursor:'pointer' },
  userList: { display:'flex', flexDirection:'column', gap:'12px' },
  userRow: { display:'flex', alignItems:'center', gap:'16px', padding:'16px', background:'#f8f9fa', borderRadius:'10px', border:'1px solid #f0f0f0', flexWrap:'wrap' },
  userLeft: { display:'flex', alignItems:'center', gap:'12px', flex:1, minWidth:'200px' },
  avatar: { width:'44px', height:'44px', borderRadius:'50%', color:'#fff', fontSize:'15px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  userName: { fontSize:'14px', fontWeight:'600', color:'#1a2332', margin:'0 0 2px 0' },
  userEmail: { fontSize:'12px', color:'#8a96a3', margin:'0 0 2px 0' },
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
};
