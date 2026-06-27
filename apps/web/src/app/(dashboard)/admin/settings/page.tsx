'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Button } from '../../../../components/ui/Button/Button';
import { Save, RefreshCw, Key } from 'lucide-react';

export default function AdminSettingsPage() {
  const [kbRepoUrl, setKbRepoUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [casePushEndpoint, setCasePushEndpoint] = useState('');
  const [apiConfigured, setApiConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  async function loadSettings() {
    const res = await fetch('/api/admin/settings');
    if (!res.ok) return;
    const data = await res.json();
    setKbRepoUrl(data.settings.KB_REPO_URL || '');
    setAiModel(data.settings.AI_MODEL || '');
    setCasePushEndpoint(data.settings.CASE_PUSH_ENDPOINT || '');
    setApiConfigured(Boolean(data.settings.OPENCODE_API_CONFIGURED));
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ KB_REPO_URL: kbRepoUrl, AI_MODEL: aiModel, CASE_PUSH_ENDPOINT: casePushEndpoint }),
    });
    setSuccessMsg('Settings updated successfully.');
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>System Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Configure integrations, knowledge repositories, and default AI model settings</p>
      </div>

      {successMsg && <div style={{ padding: '12px 16px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontSize: '14px' }}>{successMsg}</div>}

      <Card>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>Knowledge Base Repository URL</label>
          <input required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '14px' }} value={kbRepoUrl} onChange={e => setKbRepoUrl(e.target.value)} />

          <label style={{ fontSize: '14px', fontWeight: 600 }}>AI Model Target</label>
          <input required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '14px' }} value={aiModel} onChange={e => setAiModel(e.target.value)} />

          <label style={{ fontSize: '14px', fontWeight: 600 }}>Outbound API Integration Endpoint</label>
          <input style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '14px' }} value={casePushEndpoint} onChange={e => setCasePushEndpoint(e.target.value)} />

          <label style={{ fontSize: '14px', fontWeight: 600 }}>Opencode Provider API Key</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="password" disabled style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '14px' }} value={apiConfigured ? 'configured on server' : 'not configured'} />
            <Button type="button" variant="secondary"><Key size={16} /></Button>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '8px' }}>
            <Button type="submit" disabled={saving}>{saving ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw className="animate-spin" size={16} /> Saving...</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={16} /> Save Configurations</span>}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
