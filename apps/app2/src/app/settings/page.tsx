'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Settings, GitBranch, Users, LogOut, ChevronDown, ChevronUp, AlertTriangle, Plus, Edit, Trash2, BookOpen, Rocket } from 'lucide-react';
import { apiUrl } from '@/lib/api';

type TabType = 'agents' | 'git' | 'kbauto' | 'deploy' | 'users';

interface UserRecord {
  id: string;
  username: string;
  role: string;
  status: string;
}

interface GitSyncStatus {
  repoUrl: string;
  branch: string;
  localPath: string;
  lastSyncAt: string;
  lastCommit: string;
  status: string;
  lastLog: string;
}

interface KbAutoStatus {
  enabled: boolean;
  scheduleTime: string;
  running: boolean;
  lastRunAt: string;
  lastResult: string;
  lastError: string;
  lastLog: string;
}

interface DeployStatus {
  currentVersion?: string;
  latestTag?: string;
  updateAvailable?: boolean;
  repoStatus?: string;
  deploys?: Array<{ tag: string; status: string; timestamp: string; duration?: number; error?: string }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('agents');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Agent Settings State
  const [providers, setProviders] = useState<Array<{ id: string; name: string; models: string[] }>>([]);
  const [nocModel, setNocModel] = useState('');
  const [opModel, setOpModel] = useState('');
  const [nocTemp, setNocTemp] = useState('0.2');
  const [nocTopP, setNocTopP] = useState('0.95');
  const [opTemp, setOpTemp] = useState('0.2');
  const [opTopP, setOpTopP] = useState('0.95');
  const [closerTemp, setCloserTemp] = useState('0.1');
  const [nocAdvancedOpen, setNocAdvancedOpen] = useState(false);
  const [opAdvancedOpen, setOpAdvancedOpen] = useState(false);
  const [closerAdvancedOpen, setCloserAdvancedOpen] = useState(false);

  // Git Sync State
  const [gitStatus, setGitStatus] = useState<GitSyncStatus | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitConfirmInput, setGitConfirmInput] = useState('');
  const [gitRepoUrlInput, setGitRepoUrlInput] = useState('');
  const [gitBranchInput, setGitBranchInput] = useState('');
  const [showRepoChangeModal, setShowRepoChangeModal] = useState(false);

  // KB Auto State
  const [kbAutoStatus, setKbAutoStatus] = useState<KbAutoStatus | null>(null);
  const [kbAutoEnabled, setKbAutoEnabled] = useState(false);
  const [kbAutoSchedule, setKbAutoSchedule] = useState('23:59');
  const [kbAutoLoading, setKbAutoLoading] = useState(false);

  // Deploy State
  const [deployStatus, setDeployStatus] = useState<DeployStatus | null>(null);
  const [deployTarget, setDeployTarget] = useState('v2.4.0');
  const [deployLog, setDeployLog] = useState('No deploy logs available.');
  const [deployLoading, setDeployLoading] = useState(false);

  // User Management State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState('noc');
  const [statusInput, setStatusInput] = useState('active');

  // Fetch all configurations
  async function fetchSettingsAndConfig() {
    try {
      const res = await fetch(apiUrl('/api/settings'));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) router.push('/login');
        throw new Error('Failed to load settings');
      }
      const data = await res.json();
      setProviders(data.providers || []);
      
      const s = data.settings || {};
      setNocModel(s['noc.model'] || '');
      setOpModel(s['operation.model'] || '');
      setNocTemp(s['noc-agent.temperature'] || '0.2');
      setNocTopP(s['noc-agent.top_p'] || '0.95');
      setOpTemp(s['operation-agent.temperature'] || '0.2');
      setOpTopP(s['operation-agent.top_p'] || '0.95');
      setCloserTemp(s['noc-closer.temperature'] || '0.1');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading settings';
      setError(message);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch(apiUrl('/api/users'));
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchGitStatus() {
    try {
      const res = await fetch(apiUrl('/api/admin/git-sync/status'));
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
        setGitRepoUrlInput(data.repoUrl);
        setGitBranchInput(data.branch);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchKbAutoStatus() {
    try {
      const res = await fetch(apiUrl('/api/admin/kb-auto/status'));
      if (res.ok) {
        const data = await res.json();
        setKbAutoStatus(data);
        setKbAutoEnabled(Boolean(data.enabled));
        setKbAutoSchedule(data.scheduleTime || '23:59');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchDeployStatus() {
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch(apiUrl('/api/admin/deploy'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        }),
        fetch(apiUrl('/api/admin/deploy'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'history' }),
        }),
      ]);

      const status = statusRes.ok ? await statusRes.json() : {};
      const history = historyRes.ok ? await historyRes.json() : {};
      setDeployStatus({ ...status, ...history });
      if (status.latestTag) setDeployTarget(status.latestTag);
    } catch (err) {
      console.error(err);
      setDeployLog('Deploy agent is unavailable. Start deploy-agent in Docker before using deploy actions.');
    }
  }

  useEffect(() => {
    fetchSettingsAndConfig();
    fetchUsers();
    fetchGitStatus();
    fetchKbAutoStatus();
    fetchDeployStatus();
  }, []);

  // Save Agent Settings
  const handleSaveAgentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'noc.model': nocModel,
          'operation.model': opModel,
          'noc-agent.temperature': nocTemp,
          'noc-agent.top_p': nocTopP,
          'operation-agent.temperature': opTemp,
          'operation-agent.top_p': opTopP,
          'noc-closer.temperature': closerTemp,
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');
      setSuccess('Settings saved successfully!');
      fetchSettingsAndConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Git Actions Trigger
  const handleGitAction = async (action: string, confirmCode?: string) => {
    setError('');
    setSuccess('');
    setGitLoading(true);

    try {
      const payload: Record<string, string> = { action };
      if (confirmCode) payload.confirm = confirmCode;
      
      if (action === 'change_repo') {
        payload.repoUrl = gitRepoUrlInput;
        payload.branch = gitBranchInput;
      }

      const res = await fetch(apiUrl('/api/admin/git-sync/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Git operation failed');
      
      setGitStatus(data);
      setGitConfirmInput('');
      setShowRepoChangeModal(false);
      setSuccess(`Git sync action "${action}" completed successfully!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Git sync failed';
      setError(message);
    } finally {
      setGitLoading(false);
    }
  };

  // User management operations
  const handleKbAutoAction = async (action: 'save_settings' | 'generate') => {
    setError('');
    setSuccess('');
    setKbAutoLoading(true);

    try {
      const res = await fetch(apiUrl('/api/admin/kb-auto/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          enabled: kbAutoEnabled,
          scheduleTime: kbAutoSchedule,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'KB auto action failed');
      setSuccess(action === 'save_settings' ? 'KB auto settings saved.' : `KB generated: ${data.cases || 0} cases`);
      await fetchKbAutoStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'KB auto action failed';
      setError(message);
    } finally {
      setKbAutoLoading(false);
    }
  };

  const handleDeployAction = async (action: 'status' | 'history' | 'deploy') => {
    setError('');
    setSuccess('');
    setDeployLoading(true);

    try {
      if (action === 'deploy' && !confirm(`Deploy app2 to ${deployTarget}? This will build and restart app2 on the server.`)) {
        return;
      }

      const res = await fetch(apiUrl('/api/admin/deploy'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tag: deployTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy action failed');

      setDeployLog(data.log || JSON.stringify(data, null, 2));
      setSuccess(action === 'deploy' ? `Deploy completed for ${deployTarget}` : 'Deploy status refreshed.');
      await fetchDeployStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Deploy action failed';
      setError(message);
      setDeployLog(message);
    } finally {
      setDeployLoading(false);
    }
  };

  // User management operations
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordInput !== confirmPasswordInput) {
      setError('Passwords do not match');
      return;
    }

    try {
      let res;
      if (editingUser) {
        // Edit User
        res = await fetch(apiUrl(`/api/users?id=${editingUser.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: roleInput,
            status: statusInput,
            password: passwordInput,
          }),
        });
      } else {
        // Create User
        res = await fetch(apiUrl('/api/users'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameInput,
            password: passwordInput,
            role: roleInput,
            status: statusInput,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user');

      setSuccess(editingUser ? 'User updated successfully!' : 'User created successfully!');
      setUserModalOpen(false);
      fetchUsers();
      
      // Reset inputs
      setUsernameInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setEditingUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  };

  const handleOpenEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setUsernameInput(user.username);
    setRoleInput(user.role);
    setStatusInput(user.status);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete or disable this user?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(apiUrl(`/api/users?id=${id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      
      setSuccess(data.message || 'User deleted successfully');
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  // Compile list of app2 model ids from configured providers
  const allModels: string[] = [];
  providers.forEach((prov) => {
    if (prov.models && Array.isArray(prov.models)) {
      prov.models.forEach((m: string | { id: string }) => {
        const modelId = typeof m === 'string' ? m : m.id;
        if (modelId) allModels.push(modelId);
      });
    }
  });

  return (
    <AppLayout title="Settings" headerAction={
      <Button variant="danger" size="sm" onClick={handleLogout}>
        <LogOut size={16} /> Logout
      </Button>
    }>
      <div style={styles.container}>
        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('agents')}
            style={activeTab === 'agents' ? styles.activeTabButton : styles.tabButton}
          >
            <Settings size={18} />
            <span>Agent Configuration</span>
          </button>
          <button
            onClick={() => setActiveTab('git')}
            style={activeTab === 'git' ? styles.activeTabButton : styles.tabButton}
          >
            <GitBranch size={18} />
            <span>Git Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('kbauto')}
            style={activeTab === 'kbauto' ? styles.activeTabButton : styles.tabButton}
          >
            <BookOpen size={18} />
            <span>KB Auto-Generate</span>
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            style={activeTab === 'deploy' ? styles.activeTabButton : styles.tabButton}
          >
            <Rocket size={18} />
            <span>Deploy</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={activeTab === 'users' ? styles.activeTabButton : styles.tabButton}
          >
            <Users size={18} />
            <span>User Management</span>
          </button>
        </div>

        {/* Content Area */}
        <div style={styles.contentCard}>
          {error && <div style={styles.errorBanner}><AlertTriangle size={18} /><span>{error}</span></div>}
          {success && <div style={styles.successBanner}><span>{success}</span></div>}

          {/* TAB 1: Agent Configuration */}
          {activeTab === 'agents' && (
            <form onSubmit={handleSaveAgentSettings} style={styles.form}>
              <h2 style={styles.sectionTitle}>Agent Configuration</h2>
              
              {/* NOC Agent */}
              <div style={styles.settingBox}>
                <h3 style={styles.boxTitle}>NOC Agent</h3>
                <div style={styles.inputRow}>
                  <label style={styles.label}>NOC Model</label>
                  <select
                    value={nocModel}
                    onChange={(e) => setNocModel(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Default model</option>
                    {allModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div
                  style={styles.advancedToggle}
                  onClick={() => setNocAdvancedOpen(!nocAdvancedOpen)}
                >
                  <span>Advanced Controls</span>
                  {nocAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {nocAdvancedOpen && (
                  <div style={styles.advancedBox}>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Temperature</label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={nocTemp}
                        onChange={(e) => setNocTemp(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Top P</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={nocTopP}
                        onChange={(e) => setNocTopP(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Operation Agent */}
              <div style={styles.settingBox}>
                <h3 style={styles.boxTitle}>Operation Agent</h3>
                <div style={styles.inputRow}>
                  <label style={styles.label}>Operation Model</label>
                  <select
                    value={opModel}
                    onChange={(e) => setOpModel(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Default model</option>
                    {allModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div
                  style={styles.advancedToggle}
                  onClick={() => setOpAdvancedOpen(!opAdvancedOpen)}
                >
                  <span>Advanced Controls</span>
                  {opAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {opAdvancedOpen && (
                  <div style={styles.advancedBox}>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Temperature</label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={opTemp}
                        onChange={(e) => setOpTemp(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Top P</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={opTopP}
                        onChange={(e) => setOpTopP(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* NOC Closer Agent */}
              <div style={styles.settingBox}>
                <h3 style={styles.boxTitle}>NOC Case Closer Agent</h3>
                <div
                  style={styles.advancedToggle}
                  onClick={() => setCloserAdvancedOpen(!closerAdvancedOpen)}
                >
                  <span>Advanced Controls</span>
                  {closerAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {closerAdvancedOpen && (
                  <div style={styles.advancedBox}>
                    <div style={styles.inputRow}>
                      <label style={styles.label}>Temperature</label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={closerTemp}
                        onChange={(e) => setCloserTemp(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" variant="primary" disabled={loading} style={styles.saveBtn}>
                {loading ? 'Saving Settings...' : 'Save Settings'}
              </Button>
            </form>
          )}

          {/* TAB 2: Git Sync */}
          {activeTab === 'git' && gitStatus && (
            <div style={styles.gitContainer}>
              <h2 style={styles.sectionTitle}>Git Repository Sync</h2>
              <div style={styles.gitGrid}>
                <div style={styles.gitMeta}>
                  <div style={styles.gitMetaItem}><strong>Repo URL:</strong> <span>{gitStatus.repoUrl}</span></div>
                  <div style={styles.gitMetaItem}><strong>Branch:</strong> <span>{gitStatus.branch}</span></div>
                  <div style={styles.gitMetaItem}><strong>Local Path:</strong> <span>{gitStatus.localPath}</span></div>
                  <div style={styles.gitMetaItem}><strong>Last Sync:</strong> <span>{gitStatus.lastSyncAt ? new Date(gitStatus.lastSyncAt).toLocaleString('th-TH') : 'Never'}</span></div>
                  <div style={styles.gitMetaItem}><strong>Last Commit:</strong> <code>{gitStatus.lastCommit}</code></div>
                  <div style={styles.gitMetaItem}>
                    <strong>Status:</strong> 
                    <span style={{ 
                      padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                      backgroundColor: gitStatus.status === 'synced' ? 'rgba(22, 163, 74, 0.2)' : gitStatus.status === 'dirty' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: gitStatus.status === 'synced' ? '#4ade80' : gitStatus.status === 'dirty' ? '#facc15' : '#f87171'
                    }}>
                      {gitStatus.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={styles.gitActions}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Allowed Sync Operations</h4>
                  <div style={styles.gitBtnGroup}>
                    <Button variant="secondary" onClick={() => handleGitAction('check_status')} disabled={gitLoading}>
                      Check status
                    </Button>
                    <Button variant="primary" onClick={() => handleGitAction('pull_latest')} disabled={gitLoading || gitStatus.status === 'dirty'}>
                      Pull Latest (Fast-forward)
                    </Button>
                  </div>

                  <div style={styles.destructiveBox}>
                    <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#f87171', marginBottom: '10px' }}>Destructive Sync Operations</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Requires typing confirmation to execute force reset or re-clone commands.
                    </p>
                    <input
                      type="text"
                      placeholder="Type RESET or RECLONE to confirm"
                      value={gitConfirmInput}
                      onChange={(e) => setGitConfirmInput(e.target.value)}
                      style={styles.inputConfirm}
                      disabled={gitLoading}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <Button variant="danger" onClick={() => handleGitAction('force_reset_pull', 'RESET')} disabled={gitLoading || gitConfirmInput !== 'RESET'}>
                        Force Reset & Pull
                      </Button>
                      <Button variant="danger" onClick={() => handleGitAction('reclone', 'RECLONE')} disabled={gitLoading || gitConfirmInput !== 'RECLONE'}>
                        Re-clone Repo
                      </Button>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <Button variant="secondary" onClick={() => setShowRepoChangeModal(true)} disabled={gitLoading}>
                      Change Repository / Branch
                    </Button>
                  </div>
                </div>
              </div>

              {/* Git Logs */}
              <div style={styles.logBox}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Latest Sync Output logs</span>
                  {gitLoading && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="spinner" /> Syncing...</span>}
                </h4>
                <pre style={styles.logText}>
                  {gitStatus.lastLog || 'No sync logs available.'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: KB Auto-Generate */}
          {activeTab === 'kbauto' && (
            <div style={styles.gitContainer}>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <h2 style={styles.sectionTitle}>KB Auto-Generate</h2>
                  <p style={styles.sectionHelp}>สร้าง YAML summary จาก closed cases และ push เฉพาะ auto-generated/</p>
                </div>
                <Button variant="primary" disabled={kbAutoLoading} onClick={() => handleKbAutoAction('generate')}>
                  {kbAutoLoading ? 'Generating...' : 'Generate & Push Now'}
                </Button>
              </div>
              <div style={styles.gitGrid}>
                <div style={styles.settingBox}>
                  <h3 style={styles.boxTitle}>Schedule</h3>
                  <div style={styles.infoRow}><span>Daily generation</span><label><input type="checkbox" checked={kbAutoEnabled} onChange={(e) => setKbAutoEnabled(e.target.checked)} /> Enabled</label></div>
                  <div style={styles.infoRow}><span>Run time</span><input type="time" value={kbAutoSchedule} onChange={(e) => setKbAutoSchedule(e.target.value)} style={styles.input} /></div>
                  <div style={styles.infoRow}><span>Duplicate protection</span><strong>DB lock</strong></div>
                  <Button variant="secondary" size="sm" onClick={() => handleKbAutoAction('save_settings')} disabled={kbAutoLoading}>Save Schedule</Button>
                </div>
                <div style={styles.settingBox}>
                  <h3 style={styles.boxTitle}>Status</h3>
                  <div style={styles.infoRow}><span>Current status</span><strong>{kbAutoStatus?.running ? 'Running' : 'Idle'}</strong></div>
                  <div style={styles.infoRow}><span>Last run</span><strong>{kbAutoStatus?.lastRunAt ? new Date(kbAutoStatus.lastRunAt).toLocaleString('th-TH') : 'Never'}</strong></div>
                  <div style={styles.infoRow}><span>Last error</span><strong>{kbAutoStatus?.lastError || '-'}</strong></div>
                  <div style={styles.infoRow}><span>Output folder</span><code>auto-generated/YYYY-MM-DD/</code></div>
                  <div style={styles.infoRow}><span>Push scope</span><strong>auto-generated/ only</strong></div>
                </div>
              </div>
              <div style={styles.logBox}>
                <pre style={styles.logText}>{kbAutoStatus?.lastLog || 'No KB auto logs available.'}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: Deploy */}
          {activeTab === 'deploy' && (
            <div style={styles.gitContainer}>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <h2 style={styles.sectionTitle}>Deploy</h2>
                  <p style={styles.sectionHelp}>one-click app2 deploy ผ่าน deploy-agent sidecar หลัง verify code ครบ</p>
                </div>
                <Button variant="secondary" disabled={deployLoading} onClick={() => handleDeployAction('status')}>
                  {deployLoading ? 'Checking...' : 'Check for Updates'}
                </Button>
              </div>
              <div style={styles.gitGrid}>
                <div style={styles.settingBox}>
                  <h3 style={styles.boxTitle}>Version</h3>
                  <div style={styles.infoRow}><span>Current version</span><strong>{deployStatus?.currentVersion || '2.0.1'}</strong></div>
                  <div style={styles.infoRow}><span>Latest available</span><strong>{deployStatus?.latestTag || 'Unavailable'}</strong></div>
                  <div style={styles.infoRow}><span>Deploy target</span><input value={deployTarget} onChange={(e) => setDeployTarget(e.target.value)} style={styles.input} /></div>
                  <Button variant="primary" disabled={deployLoading || !deployTarget} onClick={() => handleDeployAction('deploy')} style={{ marginTop: '12px' }}>
                    {deployLoading ? 'Deploying...' : `Deploy ${deployTarget}`}
                  </Button>
                </div>
                <div style={styles.settingBox}>
                  <h3 style={styles.boxTitle}>Health and Prompt Volume</h3>
                  <div style={styles.infoRow}><span>Health endpoint</span><strong>/app2/api/health</strong></div>
                  <div style={styles.infoRow}><span>Prompt volume</span><strong>Configured rw</strong></div>
                  <div style={styles.infoRow}><span>Rollback</span><strong>Health-check guarded</strong></div>
                  <div style={styles.infoRow}><span>Agent status</span><strong>{deployStatus?.repoStatus || 'Unknown'}</strong></div>
                </div>
              </div>
              <div style={styles.settingBox}>
                <h3 style={styles.boxTitle}>Deploy History</h3>
                {(deployStatus?.deploys || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No deploy history available.</p>
                ) : (
                  (deployStatus?.deploys || []).map((item) => (
                    <div key={`${item.tag}-${item.timestamp}`} style={styles.infoRow}>
                      <span>{new Date(item.timestamp).toLocaleString('th-TH')}</span>
                      <strong>{item.tag} - {item.status}</strong>
                    </div>
                  ))
                )}
              </div>
              <div style={styles.logBox}>
                <pre style={styles.logText}>{deployLog}</pre>
              </div>
            </div>
          )}

          {/* TAB 5: User Management */}
          {activeTab === 'users' && (
            <div style={styles.usersContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={styles.sectionTitle}>User Accounts</h2>
                <Button variant="primary" size="sm" onClick={() => {
                  setEditingUser(null);
                  setUsernameInput('');
                  setPasswordInput('');
                  setConfirmPasswordInput('');
                  setRoleInput('noc');
                  setStatusInput('active');
                  setUserModalOpen(true);
                }}>
                  <Plus size={16} /> Add User
                </Button>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>User</th>
                    <th style={styles.tableHeader}>Role</th>
                    <th style={styles.tableHeader}>Status</th>
                    <th style={styles.tableHeader}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={styles.tableRow}>
                      <td style={styles.tableCell}><strong>{u.username}</strong></td>
                      <td style={styles.tableCell}>
                        <span style={styles.roleBadge}>{u.role.toUpperCase()}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          color: u.status === 'active' ? '#4ade80' : '#f87171',
                          fontWeight: 'bold', fontSize: '12px'
                        }}>
                          {u.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleOpenEditUser(u)} style={styles.actionIconButton} title="Edit User">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)} style={styles.actionIconButtonDanger} title="Delete User">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add/Edit User */}
      {userModalOpen && (
        <div className="confirmOverlay">
          <div className="confirmDialog" style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              {editingUser ? 'Edit User details' : 'Add New User account'}
            </h3>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Username</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={styles.modalInput}
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Password {editingUser && <span style={{ color: 'var(--text-muted)' }}>(Leave blank to keep current)</span>}</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={styles.modalInput}
                  required={!editingUser}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  style={styles.modalInput}
                  required={!editingUser}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Role</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  style={styles.modalSelect}
                >
                  <option value="noc">NOC Support</option>
                  <option value="operation">Operation Engineer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  style={styles.modalSelect}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="secondary" onClick={() => setUserModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Change Repo URL/Branch */}
      {showRepoChangeModal && (
        <div className="confirmOverlay">
          <div className="confirmDialog" style={{ width: '100%', maxWidth: '450px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              Change Git Repository
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Git Repository URL</label>
                <input
                  type="text"
                  value={gitRepoUrlInput}
                  onChange={(e) => setGitRepoUrlInput(e.target.value)}
                  style={styles.modalInput}
                  placeholder="https://github.com/org/repo.git"
                  disabled={gitLoading}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.modalLabel}>Branch</label>
                <input
                  type="text"
                  value={gitBranchInput}
                  onChange={(e) => setGitBranchInput(e.target.value)}
                  style={styles.modalInput}
                  placeholder="main"
                  disabled={gitLoading}
                />
              </div>

              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '6px', fontSize: '11px', color: '#facc15' }}>
                Changing repo will test clone URL in a temp path first, then completely clean `/root/openstack-support` and perform a fresh clone.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="secondary" onClick={() => setShowRepoChangeModal(false)} disabled={gitLoading}>Cancel</Button>
                <Button variant="primary" onClick={() => handleGitAction('change_repo')} disabled={gitLoading || !gitRepoUrlInput || !gitBranchInput}>
                  {gitLoading ? 'Validating...' : 'Validate & Switch'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    gap: '24px',
    height: '100%',
    minHeight: '0',
  },
  tabs: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
  },
  activeTabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--bg-color)',
    border: 'none',
    color: 'var(--accent-color)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left' as const,
    boxShadow: 'inset 0 0 0 1px var(--border-color)',
  },
  contentCard: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '24px',
    overflowY: 'auto' as const,
    maxHeight: 'calc(100vh - 120px)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '20px',
    color: 'var(--text-color)',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  sectionHelp: {
    color: 'var(--text-muted)',
    fontSize: '12px',
    marginTop: '-12px',
    lineHeight: 1.5,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--danger-color)',
    color: 'var(--danger-color)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  successBanner: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    border: '1px solid var(--accent-color)',
    color: 'var(--accent-color)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  settingBox: {
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
  },
  boxTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '14px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    gap: '20px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-color)',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--panel-bg)',
    color: 'var(--text-color)',
    minWidth: '220px',
    fontSize: '13px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--panel-bg)',
    color: 'var(--text-color)',
    width: '100px',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  advancedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    marginTop: '6px',
    userSelect: 'none' as const,
  },
  advancedBox: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-color)',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '13px',
  },
  saveBtn: {
    alignSelf: 'flex-start',
    padding: '10px 20px',
  },
  gitContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  gitGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  gitMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '13px',
  },
  gitMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  },
  gitActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  gitBtnGroup: {
    display: 'flex',
    gap: '8px',
  },
  destructiveBox: {
    border: '1px dashed rgba(239, 68, 68, 0.4)',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
    marginTop: '8px',
  },
  inputConfirm: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '12px',
  },
  logBox: {
    marginTop: '12px',
  },
  logText: {
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    padding: '14px',
    borderRadius: '8px',
    maxHeight: '220px',
    overflowY: 'auto' as const,
    whiteSpace: 'pre-wrap' as const,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  usersContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  tableHeaderRow: {
    borderBottom: '2px solid var(--border-color)',
  },
  tableHeader: {
    textAlign: 'left' as const,
    padding: '12px 8px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
  },
  tableRow: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color 0.15s',
  },
  tableCell: {
    padding: '12px 8px',
    verticalAlign: 'middle',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--border-color)',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  actionIconButton: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.15s',
  },
  actionIconButtonDanger: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--danger-color)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.15s',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  modalLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  modalInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '14px',
    outline: 'none',
  },
  modalSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '14px',
  },
};
