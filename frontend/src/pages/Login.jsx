// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/index';
import { useAuth } from '../context/AuthContext';

const CODE_LINES = [
  { tokens: [{ text: 'function ', color: '#f472b6' }, { text: 'empower', color: '#fb923c' }, { text: '(learner) {', color: '#e2e8f0' }] },
  { tokens: [{ text: '  const ', color: '#f472b6' }, { text: 'skills', color: '#e2e8f0' }, { text: ' = [', color: '#e2e8f0' }, { text: '"logic"', color: '#fde68a' }, { text: ', ', color: '#e2e8f0' }, { text: '"creativity"', color: '#fde68a' }, { text: ', ', color: '#e2e8f0' }, { text: '"impact"', color: '#fde68a' }, { text: '];', color: '#e2e8f0' }] },
  { tokens: [{ text: '  return ', color: '#f472b6' }, { text: 'learner', color: '#e2e8f0' }, { text: '.innovate(skills);', color: '#e2e8f0' }] },
  { tokens: [{ text: '}', color: '#e2e8f0' }] },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      loginUser(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Segoe UI', sans-serif; }
        .login-input:focus { border-color: #00658d !important; box-shadow: 0 0 0 3px rgba(0,101,141,0.12) !important; outline: none; }
        .login-btn:hover:not(:disabled) { background: #00506f !important; }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .eye-btn:hover { color: #00658d; }
        .forgot-link:hover { color: #00658d !important; text-decoration: underline; }
        @media (max-width: 768px) { .hero-panel { display: none !important; } .form-panel { width: 100% !important; } }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

        {/* ── LEFT: Hero Panel ── */}
        <div
          className="hero-panel"
          style={{
            width: '50%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#0b1c30',
          }}
        >
          {/* Background image */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHzIwtYOXTFDRjhZ3jIGejPPunddtzgay98WVu9OplMQX06mgyZ9Jmw3qFRiGnQEa_sYIybaw4fWzg-QcPy0MyrshgAAmysUN3FQXU3HtUcFaEB9oyc-mQFSd5lN3qUSK2lerkhnqus1SH_Lv85L6-MAF34xYFBZH9UlHMz5vGG4jbDx0RnEdibN9vVQgPGIMjjnyCwcks3vomlMJrTkPOm5xkFuItDjMv08eD48eqE437c4GRaZNFcpoPpR-Lqxbc-ps"
            alt=""
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: 0.75,
            }}
          />
          {/* Tinted overlay with blur */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,101,141,0.20)', backdropFilter: 'blur(6px)' }} />

          {/* Content */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            height: '100%', padding: '56px 52px',
          }}>
            {/* Logo row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '56px' }}>
              <img src="/images/codeclub.png" alt="Code Club" style={{ height: '40px', objectFit: 'contain' }} />
              <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.25)' }} />
              <img src="/images/empserve.jpg" alt="EmpServe" style={{ height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: '52px', fontWeight: '800', lineHeight: 1.1, color: '#fff', marginBottom: '20px', letterSpacing: '-1px' }}>
              Shape the future,<br />
              <span style={{ color: '#fd9924' }}>line by line.</span>
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: '420px', marginBottom: '40px' }}>
              Empowering the next generation of innovators through coding across Kenya.
            </p>

            {/* Code snippet card */}
            <div style={{
              background: 'rgba(0,101,141,0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '420px',
              border: '1px solid rgba(255,255,255,0.20)',
            }}>
              {/* Terminal dots */}
              <div style={{ display: 'flex', gap: '7px', marginBottom: '16px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
              </div>
              {/* Syntax-highlighted code */}
              <pre style={{ fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace", fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {CODE_LINES.map((line, li) => (
                  <div key={li}>
                    {line.tokens.map((tok, ti) => (
                      <span key={ti} style={{ color: tok.color }}>{tok.text}</span>
                    ))}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Login Form ── */}
        <div
          className="form-panel"
          style={{
            width: '50%',
            backgroundColor: '#f8f9ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 32px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '420px' }}>

            {/* Heading */}
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0d1b2a', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '36px' }}>
              Login to continue your coding journey.
            </p>

            {/* Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '36px 32px',
              boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Email field */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M2 7l10 7 10-7" />
                      </svg>
                    </span>
                    <input
                      className="login-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#111827',
                        background: '#f9fafb',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Password
                    </label>
                    <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none', transition: 'color 0.2s' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      className="login-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 44px 12px 40px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#111827',
                        background: '#f9fafb',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9ca3af', padding: '0', transition: 'color 0.2s',
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: '8px', padding: '10px 14px',
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span style={{ fontSize: '13px', color: '#b91c1c' }}>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="login-btn"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#00658d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    transition: 'background 0.2s',
                    marginTop: '4px',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>

              </form>
            </div>

            {/* Footer branding */}
            <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
              EmpServe Kenya × Raspberry Pi Foundation
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
