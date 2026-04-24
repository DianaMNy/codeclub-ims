// src/pages/Mentors.jsx
import { useEffect, useState } from 'react';
import { getMentors } from '../api/index';
import Layout from '../components/Layout';

const AVATAR_COLORS = [
  '#1eb457','#F7941D','#69A9C9','#9b59b6',
  '#e74c3c','#1abc9c','#f39c12','#2980b9',
];

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

  useEffect(() => {
    getMentors()
      .then(res => setMentors(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const activeMentors = mentors.filter(m => m.status === 'active').length;
  const onLeave = mentors.filter(m => m.status === 'on_leave').length;
  const totalSchools = mentors.reduce((sum, m) => sum + parseInt(m.schools_assigned || 0), 0);

  return (
    <Layout title="Mentors" subtitle="Field team · Evidence tracking">

      {/* Stat Cards */}
      <div style={styles.cards}>
        <div style={{...styles.card, borderTop: '4px solid #69A9C9'}}>
          <p style={styles.cardLabel}>TOTAL MENTORS</p>
          <p style={styles.cardValue}>{mentors.length}</p>
          <p style={styles.cardSub}>{activeMentors} active · {onLeave} on leave</p>
        </div>
        <div style={{...styles.card, borderTop: '4px solid #1eb457'}}>
          <p style={styles.cardLabel}>SCHOOLS ASSIGNED</p>
          <p style={styles.cardValue}>{totalSchools}</p>
          <p style={styles.cardSub}>across all mentors</p>
        </div>
        <div style={{...styles.card, borderTop: '4px solid #F7941D'}}>
          <p style={styles.cardLabel}>ACTIVE MENTORS</p>
          <p style={styles.cardValue}>{activeMentors}</p>
          <p style={styles.cardSub}>currently in field</p>
        </div>
      </div>

      {/* Mentors Table */}
      <div style={styles.section}>
        <p style={styles.sectionTitle}>Full mentor roster — RPF 2026</p>
        {loading ? <p style={{color:'#888'}}>Loading...</p> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>MENTOR</th>
                <th style={styles.th}>SUB-COUNTY / AREA</th>
                <th style={styles.th}>SCHOOLS ASSIGNED</th>
                <th style={styles.th}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {mentors.map((mentor, i) => (
                <tr key={mentor.id} style={{background: i % 2 === 0 ? '#fff' : '#fafafa'}}>
                  <td style={styles.td}>
                    <div style={styles.mentorCell}>
                      <div style={{...styles.avatar, background: getColor(mentor.full_name)}}>
                        {getInitials(mentor.full_name)}
                      </div>
                      <span style={styles.mentorName}>{mentor.full_name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{mentor.subcounty_area || '—'}</td>
                  <td style={styles.td}>{mentor.schools_assigned}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: mentor.status === 'active' ? '#e8f8ee' :
                                  mentor.status === 'on_leave' ? '#fff3e0' : '#fee',
                      color: mentor.status === 'active' ? '#1eb457' :
                             mentor.status === 'on_leave' ? '#F7941D' : '#e74c3c',
                    }}>
                      ● {mentor.status === 'on_leave' ? 'On leave' :
                         mentor.status.charAt(0).toUpperCase() + mentor.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize: '11px', fontWeight: '700', color: '#888', letterSpacing: '0.5px', margin: '0 0 8px 0' },
  cardValue: { fontSize: '40px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px 0' },
  cardSub: { fontSize: '12px', color: '#888', margin: 0 },
  section: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#555', margin: '0 0 20px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888', letterSpacing: '0.5px', borderBottom: '2px solid #f0f0f0' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#333', borderBottom: '1px solid #f5f5f5' },
  mentorCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', color: '#fff', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mentorName: { fontWeight: '500' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
};
