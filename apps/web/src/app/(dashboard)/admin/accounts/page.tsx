'use client';

import { useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { Button } from '../../../../components/ui/Button/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table/Table';
import { mockUsers as initialMockUsers } from '../../../../lib/mock-db';
import { User, Role } from '@chatbot-gate/shared';
import { UserPlus, Power, Trash2, Key } from 'lucide-react';

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<User[]>(initialMockUsers);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<Role>('NOC');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newUser: User = {
      id: (users.length + 1).toString(),
      username: newUsername.trim(),
      role: newRole,
      status: 'ACTIVE',
    };

    setUsers([...users, newUser]);
    setNewUsername('');
    setShowAddForm(false);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        };
      }
      return u;
    }));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>System Accounts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Manage authorization roles and authentication users</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus size={18} style={{ marginRight: '8px' }} />
          Add Account
        </Button>
      </div>

      {/* Add Account Modal / Form Card */}
      {showAddForm && (
        <Card style={{ maxWidth: '500px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Create New Account</h3>
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500 }}>Username</label>
              <input
                type="text"
                required
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                placeholder="Enter username"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500 }}>Role Assignment</label>
              <select
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                value={newRole}
                onChange={e => setNewRole(e.target.value as Role)}
              >
                <option value="NOC">NOC Analyst</option>
                <option value="OPERATION">Operation Engineer</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button type="submit">Create User</Button>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Accounts List Table */}
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
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell style={{ fontWeight: 600 }}>#{u.id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'ADMIN' ? 'danger' : u.role === 'NOC' ? 'default' : 'info'}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.status === 'ACTIVE' ? 'success' : 'default'}>
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => toggleUserStatus(u.id)}
                      title={u.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      <Power size={14} style={{ marginRight: u.status === 'ACTIVE' ? '0' : '4px' }} />
                      {u.status === 'ACTIVE' ? '' : 'Enable'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteUser(u.id)}
                      title="Delete User"
                      style={{ padding: '6px 10px', color: 'var(--danger-color)' }}
                    >
                      <Trash2 size={14} />
                    </Button>
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
