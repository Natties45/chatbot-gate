'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogin = async (e?: React.FormEvent, customUsername?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const loginUsername = customUsername || username;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.role === 'ADMIN') router.push('/admin/dashboard');
        else if (data.role === 'NOC') router.push('/noc/chat');
        else if (data.role === 'OPERATION') router.push('/operation/chat');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, cursor: 'pointer', padding: '10px' }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </div>
      
      <Card className="w-full max-w-md p-8" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Chatbot Gate</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to continue</p>
        </div>

        {error && <div style={{ padding: '12px', backgroundColor: 'var(--danger-color)', color: 'white', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500 }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>

          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>Quick Login (MVP)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button variant="secondary" onClick={() => handleLogin(undefined, 'noc01')} disabled={loading}>Login as NOC</Button>
            <Button variant="secondary" onClick={() => handleLogin(undefined, 'ops01')} disabled={loading}>Login as Operation</Button>
            <Button variant="ghost" onClick={() => handleLogin(undefined, 'admin')} disabled={loading}>Login as Admin</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
