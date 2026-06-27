'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Button } from '../../../../components/ui/Button/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table/Table';
import { Role, User } from '@chatbot-gate/shared';
import { UserPlus, Power, Trash2, RefreshCw, KeyRound } from 'lucide-react';

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<Role>('NOC');
  const [newPassword, setNewPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await fetch('/api/admin/accounts');
    if (!res.ok) {
      setError('Unable to load accounts');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername.trim(), role: newRole, password: newPassword || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Unable to create account. Username may already exist.');
      return;
    }

    setNewUsername('');
    setNewPassword('');
    setShowAddForm(false);
    await loadUsers();
  };

  const toggleUserStatus = async (user: User) => {
    const res = await fetch('/api/admin/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Unable to update account status.');
      return;
    }
    await loadUsers();
  };

  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/admin/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Unable to delete account.');
      return;
    }
    await loadUsers();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    const res = await fetch('/api/admin/accounts/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetUser.id, password: resetPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Unable to reset password.');
      return;
    }
    setSuccess(`Password reset for ${resetUser.username}.`);
    setResetUser(null);
    setResetPassword('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>System Accounts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Manage authorization roles and authentication users</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={loadUsers}><RefreshCw size={18} /></Button>
          <Button onClick={() => setShowAddForm(!showAddForm)}><UserPlus size={18} style={{ marginRight: '8px' }} />Add Account</Button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', fontSize: '14px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success-color, #10b981)', fontSize: '14px' }}>{success}</div>}

      {showAddForm && (
        <Card style={{ maxWidth: '500px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create New Account</h3>
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            <input type="password" style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} placeholder="Temporary password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <select style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} value={newRole} onChange={e => setNewRole(e.target.value as Role)}>
              <option value="NOC">NOC Analyst</option>
              <option value="OPERATION">Operation Engineer</option>
              <option value="ADMIN">System Administrator</option>
            </select>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit">Create User</Button>
              <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {resetUser && (
        <Card style={{ maxWidth: '500px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Reset Password: {resetUser.username}</h3>
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="password"
              required
              minLength={8}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              placeholder="New password, at least 8 characters"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit">Reset Password</Button>
              <Button type="button" variant="secondary" onClick={() => { setResetUser(null); setResetPassword(''); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Loading accounts...</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell style={{ fontWeight: 600 }}>#{u.id.slice(0, 8)}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell><Badge variant={u.role === 'ADMIN' ? 'danger' : u.role === 'NOC' ? 'default' : 'info'}>{u.role}</Badge></TableCell>
                <TableCell><Badge variant={u.status === 'ACTIVE' ? 'success' : 'default'}>{u.status}</Badge></TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" size="sm" onClick={() => toggleUserStatus(u)} title={u.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}><Power size={14} /></Button>
                    <Button variant="secondary" size="sm" onClick={() => { setResetUser(u); setResetPassword(''); setError(''); setSuccess(''); }} title="Reset Password"><KeyRound size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteUser(u.id)} title="Delete User" style={{ color: 'var(--danger-color)' }}><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
