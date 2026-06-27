'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Button } from '../../../../components/ui/Button/Button';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { RefreshCw, Database, Terminal } from 'lucide-react';

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [lastSynced, setLastSynced] = useState('Not synced in this session');
  const [repoUrl, setRepoUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiConfigured, setApiConfigured] = useState(false);

  async function loadStatus() {
    const res = await fetch('/api/admin/sync');
    if (!res.ok) return;
    const data = await res.json();
    setRepoUrl(data.repoUrl);
    setModel(data.model);
    setApiConfigured(Boolean(data.apiConfigured));
    setSyncLogs(data.logs || []);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    const res = await fetch('/api/admin/sync', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setSyncLogs(data.logs || []);
      setLastSynced(data.lastSynced || new Date().toISOString());
    }
    setSyncing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Knowledge Base Sync</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Sync local agent databases with the mounted documentation repository</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database style={{ color: 'var(--primary-color)' }} size={24} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Sync Details</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <code style={{ backgroundColor: 'var(--bg-color)', padding: '6px', borderRadius: '4px', fontSize: '13px', display: 'block', overflowX: 'auto', border: '1px solid var(--border-color)' }}>{repoUrl}</code>
            <strong>{lastSynced}</strong>
            <Badge variant="info">{model || 'No model configured'}</Badge>
            <Badge variant={apiConfigured ? 'success' : 'warning'}>{apiConfigured ? 'AI key configured' : 'AI key missing'}</Badge>
          </div>
          <Button onClick={triggerSync} disabled={syncing} style={{ width: '100%' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <RefreshCw className={syncing ? 'animate-spin' : ''} size={16} /> {syncing ? 'Syncing Repo...' : 'Sync Database Now'}
            </span>
          </Button>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Sync Output Console</h3>
          </div>
          <div style={{ backgroundColor: 'black', color: '#10b981', fontFamily: 'monospace', padding: '16px', borderRadius: '8px', minHeight: '280px', fontSize: '13px', lineHeight: 1.6, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {syncLogs.map((log, idx) => <div key={idx}>{log}</div>)}
            {syncing && <div style={{ color: 'var(--text-muted)' }}>_ waiting for output...</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
