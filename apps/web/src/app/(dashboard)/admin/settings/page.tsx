'use client';

import { useState } from 'react';
import { Card } from '../../../../components/ui/Card/Card';
import { Button } from '../../../../components/ui/Button/Button';
import { Settings, Save, RefreshCw, Key } from 'lucide-react';
import { mockSettings } from '../../../../lib/mock-db';

export default function AdminSettingsPage() {
  const [kbRepoUrl, setKbRepoUrl] = useState(mockSettings.KB_REPO_URL);
  const [aiModel, setAiModel] = useState(mockSettings.AI_MODEL);
  const [casePushEndpoint, setCasePushEndpoint] = useState(mockSettings.CASE_PUSH_ENDPOINT);
  const [apiKey, setApiKey] = useState('••••••••••••••••••••••••••••••••');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    // Simulate saving settings
    await new Promise(r => setTimeout(r, 1000));
    
    // Update local variables
    mockSettings.KB_REPO_URL = kbRepoUrl;
    mockSettings.AI_MODEL = aiModel;
    mockSettings.CASE_PUSH_ENDPOINT = casePushEndpoint;

    setSuccessMsg('Settings updated successfully!');
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
      
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>System Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>Configure integrations, knowledge repositories, and default AI model settings</p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', fontSize: '14px' }}>
          {successMsg}
        </div>
      )}

      <Card>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Knowledge Base Repository URL</label>
            <input
              type="text"
              required
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '14px' }}
              value={kbRepoUrl}
              onChange={e => setKbRepoUrl(e.target.value)}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>The repository containing your markdown guides, playbooks and script KBs.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>AI Model Target</label>
            <select
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '14px' }}
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Recommended)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>The model used for classifying, analyzing and resolving ticket content.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Outbound API Integration Endpoint</label>
            <input
              type="url"
              required
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '14px' }}
              value={casePushEndpoint}
              onChange={e => setCasePushEndpoint(e.target.value)}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Where incident resolution payloads are posted when closed.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Gemini Provider API Key</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                disabled
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '14px' }}
                value={apiKey}
              />
              <Button type="button" variant="secondary" onClick={() => alert('API Key Rotation is disabled for MVP')}>
                <Key size={16} />
              </Button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Secures your connection to the cloud intelligence API services.</span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '8px' }}>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw className="animate-spin" size={16} /> Saving...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} /> Save Configurations
                </span>
              )}
            </Button>
          </div>

        </form>
      </Card>

    </div>
  );
}
