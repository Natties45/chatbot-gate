'use client';

import { useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Button } from '../../../../components/ui/Button/Button';
import { Badge } from '../../../../components/ui/Badge/Badge';
import { RefreshCw, Database, CheckCircle, Terminal } from 'lucide-react';
import { mockSettings } from '../../../../lib/mock-db';

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>(['[2026-06-26 12:00:00] Initialized KB Sync. Repo: ' + mockSettings.KB_REPO_URL, '[2026-06-26 12:00:02] Synced 48 knowledge items successfully.']);
  const [lastSynced, setLastSynced] = useState('2026-06-26 12:00:02');

  const triggerSync = async () => {
    setSyncing(true);
    const newLogs = [...syncLogs, `[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] Starting sync with Git repository...`];
    setSyncLogs(newLogs);

    await new Promise(r => setTimeout(r, 2000));

    const finalLogs = [
      ...newLogs,
      `[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] Fetching main branch...`,
      `[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] Analyzing markdown KB items...`,
      `[${new Date().toISOString().replace('T', ' ').substring(0, 19)}] Sync complete. 52 items imported/updated.`,
    ];

    setSyncLogs(finalLogs);
    setLastSynced(new Date().toISOString().replace('T', ' ').substring(0, 19));
    setSyncing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Knowledge Base Sync</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Sync local agent databases with GitHub documentation repository</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Sync Controls */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database style={{ color: 'var(--primary-color)' }} size={24} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Sync Details</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Repository URL</span>
              <code style={{ backgroundColor: 'var(--bg-color)', padding: '6px', borderRadius: '4px', fontSize: '13px', display: 'block', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                {mockSettings.KB_REPO_URL}
              </code>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Last Successful Sync</span>
              <strong>{lastSynced}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Current Model</span>
              <Badge variant="info">{mockSettings.AI_MODEL}</Badge>
            </div>
          </div>

          <Button onClick={triggerSync} disabled={syncing} style={{ width: '100%' }}>
            {syncing ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <RefreshCw className="animate-spin" size={16} /> Syncing Repo...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <RefreshCw size={16} /> Sync Database Now
              </span>
            )}
          </Button>
        </Card>

        {/* Sync Output Terminal Logs */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Sync Output Console</h3>
          </div>

          <div 
            style={{ 
              backgroundColor: 'black', 
              color: '#10b981', 
              fontFamily: 'monospace', 
              padding: '16px', 
              borderRadius: '8px', 
              minHeight: '280px', 
              fontSize: '13px', 
              lineHeight: 1.6,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {syncLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
            {syncing && (
              <div style={{ color: 'var(--text-muted)' }}>_ (waiting for output...)</div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
