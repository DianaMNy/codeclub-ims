// src/components/Chatbot.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const SUGGESTIONS = [
  "How many coding clubs are in Kiambu? 🏫",
  "How many learners are registered? 👩‍💻",
  "Which county has the most active clubs? 📊",
  "What pathways do we teach? 📚",
  "How many devices are in the programme? 💻",
  "What is the Coolest Projects showcase? 🚀",
  "How many open flags are there? 🚩",
  "What is the safeguarding module? 🛡️",
];

export default function Chatbot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    { role:'assistant', content:"Habari! 👋 I'm **Cody**, your Code Club Kenya assistant! I can answer questions about the programme, schools, learners, mentors, and live data from the system. What would you like to know? 🚀" }
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
    }
  }, [open, messages]);

  const sendMessage = async (userMsg) => {
    if (!userMsg.trim() || loading) return;
    const newMessages = [...messages, { role:'user', content:userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Call our Railway backend — it has the API key and live DB data
      const res = await api.post('/cody/chat', {
        messages: newMessages.map(m => ({ role:m.role, content:m.content })),
      });
      const reply = res.data.reply || "Sorry, I couldn't get a response. Try again! 🔄";
      setMessages(prev => [...prev, { role:'assistant', content:reply }]);
      if (!open) setUnread(u => u + 1);
    } catch(err) {
      const errMsg = err.response?.data?.error || "Oops! 😅 I'm having trouble connecting. Please try again!";
      setMessages(prev => [...prev, { role:'assistant', content:errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const renderText = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((p, i) => i%2===1 ? <strong key={i}>{p}</strong> : p);
  };

  return (
    <>
      {/* Floating bubble */}
      <div style={S.bubble} onClick={() => setOpen(o => !o)}>
        <span style={{fontSize:'24px'}}>{open ? '✕' : '🤖'}</span>
        {!open && unread > 0 && <div style={S.unreadBadge}>{unread}</div>}
        {!open && <div style={S.tooltip}>Ask Cody anything! 💬</div>}
      </div>

      {/* Chat window */}
      {open && (
        <div style={S.window}>
          {/* Header */}
          <div style={S.header}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={S.avatar}>🤖</div>
              <div>
                <p style={{margin:0, fontWeight:'700', fontSize:'14px', color:'#fff'}}>Cody</p>
                <p style={{margin:0, fontSize:'11px', color:'rgba(255,255,255,0.7)'}}>
                  🟢 Live RPF 2026 data connected
                </p>
              </div>
            </div>
            <button style={S.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div style={S.messages}>
            {messages.map((msg, i) => (
              <div key={i} style={{...S.msgRow, justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                {msg.role==='assistant' && <div style={S.botAvatar}>🤖</div>}
                <div style={{
                  ...S.msgBubble,
                  background: msg.role==='user' ? '#1eb457' : '#fff',
                  color: msg.role==='user' ? '#fff' : '#1a2332',
                  borderRadius: msg.role==='user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  boxShadow: msg.role==='assistant' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}>
                  {renderText(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{...S.msgRow, justifyContent:'flex-start'}}>
                <div style={S.botAvatar}>🤖</div>
                <div style={{...S.msgBubble, background:'#fff', color:'#888', fontStyle:'italic'}}>
                  ⏳ Cody is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Suggestions — show only at start */}
          {messages.length <= 2 && (
            <div style={S.suggestions}>
              {SUGGESTIONS.slice(0,4).map((s,i) => (
                <button key={i} style={S.suggBtn} onClick={() => sendMessage(s)}>{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={S.inputRow}>
            <textarea style={S.input} placeholder="Ask Cody anything..."
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} rows={1} disabled={loading}/>
            <button style={{...S.sendBtn, opacity:!input.trim()||loading?0.5:1}}
              onClick={() => sendMessage(input)} disabled={!input.trim()||loading}>
              ➤
            </button>
          </div>
          <p style={{textAlign:'center', fontSize:'10px', color:'#8a96a3', margin:'4px 0 8px'}}>
            Powered by Claude AI · Live RPF 2026 data
          </p>
        </div>
      )}
    </>
  );
}

const S = {
  bubble: { position:'fixed', bottom:'24px', right:'24px', width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#1eb457,#159a48)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 4px 20px rgba(30,180,87,0.4)', zIndex:9999, transition:'all 0.2s' },
  tooltip: { position:'absolute', bottom:'64px', right:0, background:'#1a2332', color:'#fff', padding:'6px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' },
  unreadBadge: { position:'absolute', top:'-4px', right:'-4px', width:'18px', height:'18px', borderRadius:'50%', background:'#e74c3c', color:'#fff', fontSize:'11px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center' },
  window: { position:'fixed', bottom:'90px', right:'24px', width:'380px', height:'560px', background:'#f8f9fa', borderRadius:'16px', boxShadow:'0 8px 40px rgba(0,0,0,0.15)', zIndex:9998, display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #e2e8f0' },
  header: { background:'linear-gradient(135deg,#1a2332,#2c3e50)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  avatar: { width:'36px', height:'36px', borderRadius:'50%', background:'rgba(30,180,87,0.3)', border:'2px solid #1eb457', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' },
  closeBtn: { background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontSize:'16px', cursor:'pointer' },
  messages: { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' },
  msgRow: { display:'flex', alignItems:'flex-end', gap:'8px' },
  botAvatar: { width:'28px', height:'28px', borderRadius:'50%', background:'#1eb457', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 },
  msgBubble: { maxWidth:'80%', padding:'10px 14px', fontSize:'13px', lineHeight:1.5 },
  suggestions: { padding:'8px 12px', display:'flex', flexDirection:'column', gap:'6px' },
  suggBtn: { background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:'8px', padding:'8px 12px', fontSize:'12px', cursor:'pointer', color:'#1a2332', textAlign:'left' },
  inputRow: { display:'flex', gap:'8px', padding:'8px 12px', background:'#fff', borderTop:'1px solid #f0f0f0' },
  input: { flex:1, border:'1.5px solid #e2e8f0', borderRadius:'10px', padding:'8px 12px', fontSize:'13px', resize:'none', outline:'none', fontFamily:'inherit' },
  sendBtn: { padding:'8px 14px', borderRadius:'10px', border:'none', background:'#1eb457', color:'#fff', fontSize:'16px', cursor:'pointer' },
};