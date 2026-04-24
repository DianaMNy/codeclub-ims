// src/components/Layout.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getMenuItems = (role) => {
  const overview = [
    { label: 'Dashboard', path: '/dashboard', icon: '▦' },
    { label: 'Schools & Centres', path: '/schools', icon: '🏫' },
    { label: 'Mentors', path: '/mentors', icon: '👤' },
  ];

  const tracking = [
    { label: 'Teachers', path: '/teachers', icon: '🎓' },
    { label: 'Ecosystem Building', path: '/ecosystem', icon: '🌱' },
    { label: 'Safeguarding', path: '/safeguarding', icon: '🛡️' },
    { label: 'Star Club Board', path: '/starclub', icon: '⭐' },
    { label: 'Pathways & Training', path: '/pathways', icon: '🗺️' },
    { label: 'M & E', path: '/mande', icon: '📊' },
  ];

  const insights = [
    { label: 'Flags & Alerts', path: '/flags', icon: '🚩' },
    { label: 'Reports', path: '/reports', icon: '📋' },
    { label: 'Command Centre', path: '/command', icon: '🎯' },
    { label: 'Live Map', path: '/map', icon: '🗺️' },
    { label: 'Donor View', path: '/donor', icon: '👁️' },
    ...(role === 'admin' ? [{ label: 'User Management', path: '/users', icon: '👥' }] : []),
  ];

  if (role === 'admin' || role === 'programme_coordinator') {
    return [
      { section: 'OVERVIEW', items: overview },
      { section: 'TRACKING', items: tracking },
      { section: 'INSIGHTS', items: insights },
    ];
  }

  if (role === 'mentor') {
    return [
      { section: 'OVERVIEW', items: overview },
      { section: 'TRACKING', items: [
        { label: 'Teachers', path: '/teachers', icon: '🎓' },
        { label: 'Pathways & Training', path: '/pathways', icon: '🗺️' },
        { label: 'M & E', path: '/mande', icon: '📊' },
        { label: 'Star Club Board', path: '/starclub', icon: '⭐' },
        { label: 'Flags & Alerts', path: '/flags', icon: '🚩' },
      ]},
      { section: 'MAP', items: [
        { label: 'Live Map', path: '/map', icon: '🗺️' },
      ]},
    ];
  }

  if (role === 'teacher') {
    return [
      { section: 'OVERVIEW', items: [
        { label: 'Dashboard', path: '/dashboard', icon: '▦' },
        { label: 'Schools & Centres', path: '/schools', icon: '🏫' },
        { label: 'Teachers', path: '/teachers', icon: '🎓' },
      ]},
      { section: 'MY WORK', items: [
        { label: 'M & E', path: '/mande', icon: '📊' },
      ]},
    ];
  }

  return [{ section: 'OVERVIEW', items: overview }];
};

export default function Layout({ children, title, subtitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useAuth();
  const menuItems = getMenuItems(user?.role);

  const handleLogout = () => { logoutUser(); navigate('/login'); };

  return (
    <div style={styles.shell}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.sidebarLogo}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <img src="/images/empserve.jpg" alt="E" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'8px'}} />
            </div>
            <div>
              <div style={styles.logoName}>EmpServe</div>
              <div style={styles.logoSub}>Code Club M&E</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={styles.sidebarNav}>
          {menuItems.map(group => (
            <div key={group.section}>
              <p style={styles.navSection}>{group.section}</p>
              {group.items.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button key={item.path} onClick={() => navigate(item.path)} style={{
                    ...styles.navItem,
                    background: active ? 'rgba(105,169,201,0.15)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    borderLeft: active ? '3px solid #69A9C9' : '3px solid transparent',
                  }}>
                    <span style={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={styles.sidebarFooter}>
          <p style={styles.sfRole}>Logged in as</p>
          <p style={styles.sfName}>{user?.full_name}</p>
          <p style={styles.sfOrg}>EmpServe Kenya</p>
          <button onClick={handleLogout} style={styles.signOutBtn}>Sign out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>{title}</h1>
            {subtitle && <p style={styles.pageSub}>{subtitle}</p>}
          </div>
          <div style={styles.topbarRight}>
            <img src="/images/codeclub.png" alt="Code Club" style={{height:'32px',objectFit:'contain'}} />
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  shell: { display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI', sans-serif" },
  sidebar: {
    width:'240px', minWidth:'240px', background:'#1a2332',
    display:'flex', flexDirection:'column',
    position:'fixed', top:0, left:0, bottom:0, zIndex:100, overflowY:'auto',
  },
  sidebarLogo: {
    padding:'20px 18px',
    borderBottom:'1px solid rgba(255,255,255,0.07)',
  },
  logoRow: { display:'flex', alignItems:'center', gap:'10px' },
  logoIcon: { width:'36px', height:'36px', borderRadius:'8px', overflow:'hidden', flexShrink:0, background:'#F7941D' },
  logoName: { fontSize:'15px', fontWeight:'800', color:'#fff', lineHeight:1.1 },
  logoSub: { fontSize:'10px', color:'#69A9C9', letterSpacing:'0.05em' },
  sidebarNav: { flex:1, padding:'14px 0', overflowY:'auto' },
  navSection: {
    padding:'10px 18px 4px', fontSize:'10px', fontWeight:'600',
    color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em',
    textTransform:'uppercase', margin:0,
  },
  navItem: {
    display:'flex', alignItems:'center', gap:'10px',
    width:'100%', padding:'9px 18px',
    border:'none', cursor:'pointer', fontSize:'13px',
    textAlign:'left', transition:'all 0.15s',
  },
  navIcon: { fontSize:'14px', width:'18px', textAlign:'center' },
  sidebarFooter: {
    padding:'14px 18px',
    borderTop:'1px solid rgba(255,255,255,0.07)',
  },
  sfRole: { fontSize:'10px', color:'rgba(255,255,255,0.35)', margin:'0 0 2px 0' },
  sfName: { fontSize:'13px', fontWeight:'500', color:'#fff', margin:'0 0 2px 0' },
  sfOrg: { fontSize:'10px', color:'#69A9C9', margin:'0 0 12px 0' },
  signOutBtn: {
    background:'rgba(255,255,255,0.08)', border:'none',
    color:'rgba(255,255,255,0.6)', borderRadius:'6px',
    padding:'7px 12px', cursor:'pointer', fontSize:'12px', width:'100%',
  },
main: {
    marginLeft:'240px', flex:1,
    display:'flex', flexDirection:'column',
    minHeight:'100vh', background:'#f5f7fa',
    maxWidth:'calc(100vw - 240px)',
  },
  topbar: {
    background:'#fff', borderBottom:'1px solid #e2e8f0',
    padding:'0 28px', height:'58px',
    display:'flex', alignItems:'center', justifyContent:'space-between',
    position:'sticky', top:0, zIndex:90,
    boxShadow:'0 1px 0 #e2e8f0',
  },
  pageTitle: { fontSize:'17px', fontWeight:'800', color:'#1a2332', margin:0 },
  pageSub: { fontSize:'11px', color:'#8a96a3', margin:'2px 0 0 0' },
  topbarRight: { display:'flex', alignItems:'center', gap:'12px' },
  content: { padding:'20px', flex:1, overflowX:'hidden' },
};
