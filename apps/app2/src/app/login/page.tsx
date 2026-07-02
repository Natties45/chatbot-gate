'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push('/');
    } catch (err) {
      console.error(err);
      setError('An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="loginShellGrid" style={styles.grid}>
        <div style={styles.heroCard}>
          <div style={styles.brandRow}>
            <div style={styles.mark}>G2</div>
            <div>
              <h1 style={styles.title}>GATE 2</h1>
              <p style={styles.subtitle}>AI-powered NOC and Operation Support</p>
            </div>
          </div>
          <div>
            <div style={styles.eyebrow}>Operations Console</div>
            <h2 style={styles.heroTitle}>ศูนย์กลางรับเคส วิเคราะห์ ส่งต่อ และดูแลระบบ</h2>
            <p style={styles.heroText}>รวม NOC, Operation, case history, knowledge sync และ deploy controls ไว้ใน console เดียวตาม role ของผู้ใช้</p>
          </div>
          <div style={styles.statusStrip}>
            <span style={styles.statusPill}>Groq primary</span>
            <span style={styles.statusPill}>Ollama fallback</span>
            <span style={styles.statusPill}>MCP ready</span>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={styles.loginTitle}>เข้าสู่ระบบ</h2>
            <p style={styles.subtitle}>เมนูและหน้าแรกจะแสดงตามสิทธิ์ผู้ใช้</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at 18% 10%, rgba(74,222,128,0.16), transparent 26%), radial-gradient(circle at 78% 4%, rgba(96,165,250,0.13), transparent 24%), linear-gradient(135deg, #060a09 0%, #0a1110 44%, #101819 100%)',
    padding: '20px',
  },
  grid: {
    width: 'min(1120px, 100%)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) 400px',
    gap: '24px',
  },
  heroCard: {
    minHeight: '520px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    background: 'linear-gradient(180deg, rgba(17,32,27,0.92), rgba(11,19,17,0.92))',
    border: '1px solid rgba(160,199,177,0.14)',
    borderRadius: '28px',
    padding: '34px',
    boxShadow: '0 24px 70px rgba(0,0,0,0.42)',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  mark: { width: '42px', height: '42px', borderRadius: '14px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #4ade80, #0ea5e9)', color: '#06100d', fontWeight: 900, letterSpacing: '0.04em' },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: '4px',
    letterSpacing: '-0.025em',
  },
  loginTitle: { fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' },
  eyebrow: { color: '#4ade80', fontSize: '12px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' as const, marginBottom: '14px' },
  heroTitle: { color: '#e8f3ee', fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 1.05, letterSpacing: '-0.06em', marginBottom: '18px' },
  heroText: { color: '#8fa89d', fontSize: '16px', lineHeight: 1.75, maxWidth: '620px' },
  statusStrip: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  statusPill: { border: '1px solid rgba(160,199,177,0.14)', borderRadius: '12px', padding: '10px', color: '#8fa89d', fontSize: '11px', background: 'rgba(255,255,255,0.025)' },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    color: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '10px',
  },
};
