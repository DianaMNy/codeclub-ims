// src/pages/Chat.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useIsMobile } from '../hooks/useIsMobile';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const SUBCOUNTIES = {
  'Kiambu':   ['Githurai','Kahawa West','Wendani','Ruiru','Thika','Juja','Ngoigwa','Kiandutu','Kiambu Town','Limuru','Kikuyu','Tigoni','Mugutha'],
  'Kajiado':  ['Ngong','Kitengela','Rongai','Kiserian','Kajiado Town','Isinya','Loitokitok','Namanga','Overall'],
  "Murang'a": ["Murang'a East",'Kahuro','Kangema','Kigumo','Maragua','Mathioya'],
};
const COUNTY_COLORS = { 'Kiambu':'#69A9C9', 'Kajiado':'#F7941D', "Murang'a":'#1eb457' };
const ROLE_COLORS   = { admin:'#e74c3c', programme_coordinator:'#9b59b6', mentor:'#1eb457', teacher:'#69A9C9', county_official:'#F7941D' };
const ROLE_LABELS   = { admin:'Admin', programme_coordinator:'Coordinator', mentor:'Mentor', teacher:'Club Leader', county_official:'County Official' };

// Consistent subtle per-sender name color — hash sender_id to a small muted
// palette so multi-person rooms stay scannable (distinct from ROLE_COLORS,
// which stays on the role badge).
const NAME_COLORS = ['#5b6b8c','#7d5ba6','#2e8b7a','#b8663f','#4a7fa7','#8a5c8a','#5a8f5a','#a06a3c'];
function senderNameColor(id) {
  if (!id) return NAME_COLORS[0];
  let hash = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

function toRoomKey(county, subcounty) {
  return `${county}_${subcounty}`.replace(/[^a-zA-Z0-9_']/g, '_');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
}

export default function Chat() {
  const isMobile = useIsMobile();
  const [view, setView]               = useState('lobby'); // 'lobby' | 'room'
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [roomKey, setRoomKey]         = useState('');
  const [messages, setMessages]       = useState([]);
  const [rooms, setRooms]             = useState([]);
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [lastPoll, setLastPoll]       = useState(null);
  const [unread, setUnread]           = useState({});
  const [attachment, setAttachment]   = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [notification, setNotification] = useState('');
  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);
  const fileRef    = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Load rooms on mount
  useEffect(() => {
    api.get('/chat/rooms').then(r => {
      setRooms(r.data.rooms || []);
    }).catch(() => {});
  }, []);

  // Scroll to bottom
  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  useEffect(() => { scrollBottom(); }, [messages]);

  // Load room messages
  const loadRoom = useCallback(async (key) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/${encodeURIComponent(key)}`);
      setMessages(res.data);
      setLastPoll(new Date().toISOString());
      // mark room as read
      setUnread(u => ({ ...u, [key]: 0 }));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (view !== 'room' || !roomKey) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/chat/${encodeURIComponent(roomKey)}?since=${encodeURIComponent(lastPoll||'')}`);
        if (res.data.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m=>m.id));
            const newMsgs = res.data.filter(m=>!ids.has(m.id));
            if (newMsgs.length > 0) {
              showNotification(`${newMsgs[newMsgs.length-1].sender_name}: ${newMsgs[newMsgs.length-1].message.slice(0,40)}`);
            }
            return [...prev, ...newMsgs];
          });
          setLastPoll(new Date().toISOString());
        }
      } catch(e) {}
    }, 10000);
    return () => clearInterval(pollRef.current);
  }, [view, roomKey, lastPoll]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const enterRoom = (county, sub) => {
    const key = toRoomKey(county, sub);
    setSelectedCounty(county);
    setSelectedSub(sub);
    setRoomKey(key);
    setMessages([]);
    setView('room');
    loadRoom(key);
  };

  const handleSend = async () => {
    if (!text.trim() && !attachment) return;
    setSending(true);
    try {
      const payload = {
        message: text.trim(),
        county: selectedCounty,
        subcounty: selectedSub,
        attachment_url:  attachment?.url  || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      };
      const res = await api.post(`/chat/${encodeURIComponent(roomKey)}`, payload);
      setMessages(prev => [...prev, res.data]);
      setText('');
      setAttachment(null);
      setLastPoll(new Date().toISOString());
      // Update room list
      api.get('/chat/rooms').then(r => setRooms(r.data.rooms||[])).catch(()=>{});
    } catch(e) { alert(e.response?.data?.error || 'Failed to send'); }
    finally { setSending(false); }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    // Convert to base64 for simple storage (no external upload service needed)
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        url: reader.result, // base64 data URL
        name: file.name,
        type: file.type,
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.delete(`/chat/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch(e) { alert('Failed to delete'); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Room count badge ────────────────────────────────────────────────────────
  const getRoomActivity = (county, sub) => {
    const key = toRoomKey(county, sub);
    return rooms.find(r => r.room_key === key);
  };

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (view === 'lobby') return (
    <Layout title="Community Chat" subtitle="Peer learning · Sub-county chat rooms · RPF 2026">

      {notification && (
        <div style={S.notif}>💬 {notification}</div>
      )}

      {/* Active rooms */}
      {rooms.length > 0 && (
        <div style={S.whiteCard}>
          <p style={S.cardTitle}>🔥 Active Chat Rooms</p>
          <p style={S.cardSub}>{rooms.length} rooms with activity</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px', marginTop:'16px'}}>
            {rooms.slice(0,6).map(room => (
              <div key={room.room_key} style={{...S.activeRoom, borderLeft:`4px solid ${COUNTY_COLORS[room.county]||'#888'}`}}
                onClick={() => enterRoom(room.county, room.subcounty)}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <p style={{margin:'0 0 2px', fontWeight:'700', fontSize:'14px', color:'#1a2332'}}>{room.subcounty}</p>
                    <p style={{margin:'0 0 6px', fontSize:'12px', color:COUNTY_COLORS[room.county]||'#888'}}>{room.county}</p>
                  </div>
                  <span style={{...S.badge, background:'#eafaf1', color:'#1a8a4a'}}>{room.message_count} msgs</span>
                </div>
                <p style={{margin:'0 0 2px', fontSize:'13px', color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  <b>{room.last_sender}:</b> {room.last_message}
                </p>
                <p style={{margin:0, fontSize:'11px', color:'#8a96a3'}}>{timeAgo(room.last_message_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* County/Sub-county grid */}
      {Object.entries(SUBCOUNTIES).map(([county, subs]) => (
        <div key={county} style={S.whiteCard}>
          <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
            <div style={{width:'4px', height:'24px', background:COUNTY_COLORS[county], borderRadius:'2px'}}/>
            <p style={{margin:0, fontSize:'16px', fontWeight:'700', color:'#1a2332'}}>{county}</p>
            <span style={{fontSize:'12px', color:'#8a96a3'}}>{subs.length} sub-counties</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'10px'}}>
            {subs.map(sub => {
              const activity = getRoomActivity(county, sub);
              return (
                <button key={sub} style={{...S.subBtn, borderColor:COUNTY_COLORS[county]}}
                  onClick={() => enterRoom(county, sub)}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span style={{fontWeight:'600', fontSize:'13px', color:'#1a2332'}}>{sub}</span>
                    {activity && (
                      <span style={{...S.badge, background:COUNTY_COLORS[county]+'20', color:COUNTY_COLORS[county], fontSize:'10px'}}>
                        {activity.message_count}
                      </span>
                    )}
                  </div>
                  {activity ? (
                    <p style={{margin:'4px 0 0', fontSize:'11px', color:'#8a96a3', textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%'}}>
                      {timeAgo(activity.last_message_at)}
                    </p>
                  ) : (
                    <p style={{margin:'4px 0 0', fontSize:'11px', color:'#c0c0c0', textAlign:'left'}}>No messages yet</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Layout>
  );

  // ── CHAT ROOM ──────────────────────────────────────────────────────────────
  return (
    <Layout title={selectedSub} subtitle={`${selectedCounty} · Community Chat · RPF 2026`}>

      {notification && <div style={S.notif}>💬 {notification}</div>}

      {/* Header */}
      <div style={S.roomHeader}>
        <button style={S.backBtn} onClick={() => { setView('lobby'); clearInterval(pollRef.current); }}>
          ← Back to rooms
        </button>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'#1eb457', boxShadow:'0 0 6px #1eb457'}}/>
          <div>
            <p style={{margin:0, fontWeight:'700', fontSize:'16px', color:'#1a2332'}}>{selectedSub}</p>
            <p style={{margin:0, fontSize:'12px', color:COUNTY_COLORS[selectedCounty]}}>{selectedCounty} · {messages.length} messages</p>
          </div>
        </div>
        <span style={{fontSize:'12px', color:'#8a96a3'}}>🔄 Auto-refreshes every 10s</span>
      </div>

      {/* Messages */}
      <div style={S.messagesBox}>
        {loading ? (
          <p style={{textAlign:'center', color:'#888', padding:'40px'}}>Loading messages...</p>
        ) : messages.length === 0 ? (
          <div style={{textAlign:'center', padding:'60px 20px'}}>
            <p style={{fontSize:'40px', margin:'0 0 12px'}}>💬</p>
            <p style={{fontSize:'16px', fontWeight:'600', color:'#1a2332', margin:'0 0 6px'}}>Start the conversation!</p>
            <p style={{fontSize:'13px', color:'#8a96a3', margin:0}}>Be the first to post in {selectedSub}</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user.id;
              const showAvatar = i === 0 || messages[i-1]?.sender_id !== msg.sender_id;
              const roleColor = ROLE_COLORS[msg.sender_role] || '#888';
              return (
                <div key={msg.id} style={{...S.msgRow, justifyContent:isMe?'flex-end':'flex-start', marginTop:showAvatar?'16px':'4px'}}>
                  {!isMe && showAvatar && (
                    <div style={{...S.avatar, background:roleColor, flexShrink:0}}>
                      {(msg.sender_name||'?').split(' ').map(n=>n[0]).slice(0,2).join('')}
                    </div>
                  )}
                  {!isMe && !showAvatar && <div style={{width:'36px', flexShrink:0}}/>}
                  <div style={{maxWidth:'70%'}}>
                    {showAvatar && !isMe && (
                      <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
                        <span style={{fontSize:'13px', fontWeight:'700', color:senderNameColor(msg.sender_id)}}>{msg.sender_name || 'Unknown'}</span>
                        <span style={{...S.badge, background:roleColor+'20', color:roleColor, fontSize:'10px'}}>
                          {ROLE_LABELS[msg.sender_role]||msg.sender_role}
                        </span>
                        <span style={{fontSize:'11px', color:'#8a96a3'}}>{timeAgo(msg.created_at)}</span>
                      </div>
                    )}
                    <div style={{...S.bubble, background:isMe?'#1eb457':'#fff', color:isMe?'#fff':'#1a2332', borderRadius:isMe?'16px 4px 16px 16px':'4px 16px 16px 16px'}}>
                      {msg.message && <p style={{margin:0, fontSize:'14px', lineHeight:1.5, whiteSpace:'pre-wrap'}}>{msg.message}</p>}
                      {msg.attachment_url && (
                        <div style={{marginTop:msg.message?'8px':'0'}}>
                          {msg.attachment_type?.startsWith('image/') ? (
                            <img src={msg.attachment_url} alt={msg.attachment_name}
                              style={{maxWidth:'100%', maxHeight:'200px', borderRadius:'8px', display:'block'}}/>
                          ) : (
                            <a href={msg.attachment_url} download={msg.attachment_name}
                              style={{display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:isMe?'rgba(255,255,255,0.2)':'#f0f0f0', borderRadius:'8px', textDecoration:'none', color:isMe?'#fff':'#1a2332'}}>
                              <span style={{fontSize:'20px'}}>📎</span>
                              <span style={{fontSize:'12px', fontWeight:'600'}}>{msg.attachment_name}</span>
                            </a>
                          )}
                        </div>
                      )}
                      {isMe && (
                        <p style={{margin:'4px 0 0', fontSize:'10px', color:'rgba(255,255,255,0.7)', textAlign:'right'}}>{timeAgo(msg.created_at)}</p>
                      )}
                    </div>
                    {(isMe || user.role === 'admin') && (
                      <button style={S.deleteMsg} onClick={() => handleDelete(msg.id)}>🗑️</button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </>
        )}
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div style={S.attachPreview}>
          {attachment.type?.startsWith('image/') ? (
            <img src={attachment.url} alt={attachment.name} style={{height:'60px', borderRadius:'6px'}}/>
          ) : (
            <span style={{fontSize:'13px'}}>📎 {attachment.name}</span>
          )}
          <button style={S.removeAttach} onClick={() => setAttachment(null)}>✕</button>
        </div>
      )}

      {/* Input box */}
      <div style={S.inputBox}>
        <input type="file" ref={fileRef} style={{display:'none'}} onChange={handleFile}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"/>
        <button style={S.attachBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '⏳' : '📎'}
        </button>
        <textarea style={S.textInput} placeholder={`Message ${selectedSub}...`}
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown} rows={1}/>
        <button style={{...S.sendBtn, opacity:(!text.trim()&&!attachment)||sending?0.6:1}}
          onClick={handleSend} disabled={(!text.trim()&&!attachment)||sending}>
          {sending ? '⏳' : '➤'}
        </button>
      </div>
      <p style={{textAlign:'center', fontSize:'11px', color:'#8a96a3', margin:'8px 0 0'}}>
        Press Enter to send · Shift+Enter for new line
      </p>
    </Layout>
  );
}

const S = {
  whiteCard: { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },
  cardTitle: { fontSize:'16px', fontWeight:'700', color:'#1a2332', margin:'0 0 4px' },
  cardSub:   { fontSize:'12px', color:'#8a96a3', margin:0 },
  activeRoom: { background:'#f8f9fa', borderRadius:'10px', padding:'14px 16px', cursor:'pointer', transition:'all 0.15s' },
  subBtn: { background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:'10px', padding:'12px 14px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', alignItems:'flex-start', transition:'all 0.15s' },
  badge: { padding:'2px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' },
  notif: { position:'fixed', top:'20px', right:'20px', background:'#1a2332', color:'#fff', padding:'12px 20px', borderRadius:'10px', fontSize:'13px', fontWeight:'600', zIndex:9999, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', maxWidth:'320px' },
  roomHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:'12px', padding:'16px 20px', marginBottom:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', flexWrap:'wrap', gap:'12px' },
  backBtn: { padding:'8px 16px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'13px', cursor:'pointer', color:'#555', fontWeight:'500' },
  messagesBox: { background:'#fff', borderRadius:'12px', padding:'20px', minHeight:'300px', maxHeight:'calc(100vh - 300px)', overflowY:'auto', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'12px' },
  msgRow: { display:'flex', alignItems:'flex-end', gap:'8px' },
  avatar: { width:'36px', height:'36px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#fff' },
  bubble: { padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  deleteMsg: { background:'none', border:'none', cursor:'pointer', fontSize:'12px', opacity:0.4, display:'block', marginTop:'2px' },
  attachPreview: { background:'#f8f9fa', borderRadius:'10px', padding:'10px 16px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px', border:'1.5px solid #e2e8f0' },
  removeAttach: { background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#e74c3c', marginLeft:'auto' },
  inputBox: { display:'flex', alignItems:'flex-end', gap:'10px', background:'#fff', borderRadius:'12px', padding:'12px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  attachBtn: { padding:'10px', borderRadius:'10px', border:'1.5px solid #e2e8f0', background:'#f8f9fa', fontSize:'18px', cursor:'pointer', flexShrink:0 },
  textInput: { flex:1, border:'none', outline:'none', fontSize:'14px', color:'#333', resize:'none', background:'transparent', fontFamily:'inherit', lineHeight:1.5, padding:'4px 0' },
  sendBtn: { padding:'10px 18px', borderRadius:'10px', border:'none', background:'#1eb457', color:'#fff', fontSize:'18px', cursor:'pointer', flexShrink:0 },
};