// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });

function getStrength(pw) {
  if (pw.length < 6) return { label: 'Too short', color: '#e74c3c', width: '20%' };
  if (pw.length < 8) return { label: 'Weak', color: '#e74c3c', width: '30%' };
  const hasUpper  = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (score === 0) return { label: 'Weak',   color: '#e74c3c', width: '35%' };
  if (score === 1) return { label: 'Medium', color: '#a0720a', width: '60%' };
  return { label: 'Strong', color: '#1a8a4a', width: '100%' };
}

export default function ResetPassword() {
  const [searchParams]      = useSearchParams();
  const navigate            = useNavigate();
  const token               = searchParams.get('token');

  const [tokenState, setTokenState]   = useState('checking'); // checking | valid | invalid
  const [tokenEmail, setTokenEmail]   = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!token) { setTokenState('invalid'); return; }
    api.get(`/auth/reset-password/${token}`)
      .then(res => { setTokenState('valid'); setTokenEmail(res.data.email); })
      .catch(() => setTokenState('invalid'));
  }, [token]);

  const strength = getStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirmPw) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logos */}
        <div style={styles.logos}>
          <img src="/images/empserve.jpg" alt="EmpServe" style={styles.logo} />
          <img src="/images/codeclub.png" alt="Code Club" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Set new password</h1>

        {/* Checking token */}
        {tokenState === 'checking' && (
          <p style={styles.subtitle}>Verifying your reset link...</p>
        )}

        {/* Invalid token */}
        {tokenState === 'invalid' && (
          <div style={styles.errorBox}>
            <p style={styles.errorIcon}>⛔</p>
            <p style={styles.errorText}>
              This reset link is <strong>invalid or has expired</strong>.
              Reset links are only valid for 1 hour.
            </p>
            <Link to="/forgot-password" style={styles.button}>
              Request a new link
            </Link>
          </div>
        )}

        {/* Valid token — show form */}
        {tokenState === 'valid' && !success && (
          <>
            <p style={styles.subtitle}>
              Resetting password for <strong>{tokenEmail}</strong>
            </p>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Min. 8 characters"
                  required
                  autoFocus
                />
                {newPassword.length > 0 && (
                  <div style={styles.strengthWrap}>
                    <div style={styles.strengthTrack}>
                      <div style={{...styles.strengthBar, width: strength.width, background: strength.color}} />
                    </div>
                    <span style={{...styles.strengthLabel, color: strength.color}}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  style={{
                    ...styles.input,
                    borderColor: confirmPw && confirmPw !== newPassword ? '#e74c3c' : '#e0e0e0',
                  }}
                  placeholder="••••••••"
                  required
                />
                {confirmPw && confirmPw !== newPassword && (
                  <p style={styles.matchError}>Passwords do not match</p>
                )}
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button
                type="submit"
                style={{...styles.button, opacity: loading ? 0.7 : 1}}
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* Success */}
        {success && (
          <div style={styles.successBox}>
            <p style={styles.successIcon}>✅</p>
            <p style={styles.successText}>
              <strong>Password reset successfully!</strong>
            </p>
            <p style={styles.successNote}>Redirecting to login...</p>
          </div>
        )}

        {tokenState !== 'invalid' && !success && (
          <Link to="/login" style={styles.backLink}>← Back to Login</Link>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1eb457 0%, #69A9C9 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    textAlign: 'center',
  },
  logos: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  logo: { height: '52px', objectFit: 'contain' },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '28px',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444' },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  strengthWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '6px',
  },
  strengthTrack: {
    flex: 1,
    height: '4px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s, background 0.3s',
  },
  strengthLabel: { fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  matchError: { fontSize: '12px', color: '#e74c3c', margin: '2px 0 0' },
  error: { color: '#e74c3c', fontSize: '13px', margin: '0' },
  button: {
    display: 'block',
    background: '#1eb457',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    marginTop: '4px',
  },
  errorBox: {
    background: '#fdedec',
    border: '1px solid #f5b7b1',
    borderRadius: '10px',
    padding: '28px 24px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  errorIcon: { fontSize: '32px', margin: 0 },
  errorText: {
    fontSize: '14px',
    color: '#c0392b',
    margin: 0,
    lineHeight: '1.6',
    textAlign: 'center',
  },
  successBox: {
    background: '#eafaf1',
    border: '1px solid #a9dfbf',
    borderRadius: '10px',
    padding: '32px 24px',
    marginBottom: '24px',
  },
  successIcon: { fontSize: '36px', margin: '0 0 12px' },
  successText: { fontSize: '15px', color: '#1a8a4a', margin: '0 0 8px' },
  successNote: { fontSize: '13px', color: '#888', margin: 0 },
  backLink: {
    display: 'block',
    fontSize: '13px',
    color: '#888',
    textDecoration: 'none',
    marginTop: '8px',
  },
};
