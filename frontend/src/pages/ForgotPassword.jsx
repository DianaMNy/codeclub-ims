// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL + '/api' });

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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

        <h1 style={styles.title}>Reset your password</h1>
        <p style={styles.subtitle}>
          Enter your email and we'll send you a reset link
        </p>

        {success ? (
          <div style={styles.successBox}>
            <p style={styles.successIcon}>✅</p>
            <p style={styles.successText}>
              Check your email! A reset link has been sent to <strong>{email}</strong>.
            </p>
            <p style={styles.successNote}>
              Didn't receive it? Check your spam folder or{' '}
              <button style={styles.retryBtn} onClick={() => { setSuccess(false); setEmail(''); }}>
                try again
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.input}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link to="/login" style={styles.backLink}>← Back to Login</Link>
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
  logo: {
    height: '52px',
    objectFit: 'contain',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '32px',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  field: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#444',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e74c3c',
    fontSize: '13px',
    margin: '0',
    textAlign: 'left',
  },
  button: {
    background: '#1eb457',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  successBox: {
    background: '#eafaf1',
    border: '1px solid #a9dfbf',
    borderRadius: '10px',
    padding: '24px',
    marginBottom: '24px',
  },
  successIcon: {
    fontSize: '32px',
    margin: '0 0 12px',
  },
  successText: {
    fontSize: '14px',
    color: '#1a8a4a',
    margin: '0 0 10px',
    lineHeight: '1.5',
  },
  successNote: {
    fontSize: '12px',
    color: '#888',
    margin: 0,
  },
  retryBtn: {
    background: 'none',
    border: 'none',
    color: '#1eb457',
    cursor: 'pointer',
    fontWeight: '600',
    padding: 0,
    fontSize: '12px',
    textDecoration: 'underline',
  },
  backLink: {
    display: 'block',
    fontSize: '13px',
    color: '#888',
    textDecoration: 'none',
    marginTop: '8px',
  },
};
