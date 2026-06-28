'use client';
import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { MessageSquare, Plus, Send, FileText } from 'lucide-react';

type PageState = 'idle' | 'loading' | 'chat' | 'offline';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export default function OperationPage() {
  const [state, setState] = useState<PageState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [sending, setSending] = useState(false);
  const msgsEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function newCase() {
    setState('loading');
    setMessages([]);
    setError('');
    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setState('idle'); return; }
      setSessionId(data.sessionId);
      setState('chat');
    } catch { setError('Cannot connect to server'); setState('offline'); }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg, id: Date.now().toString() }]);
    setSending(true);
    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', message: userMsg, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(p => [...p, { role: 'assistant', content: `Error: ${data.error}`, id: Date.now().toString() }]); setSending(false); return;
      }
      setMessages(p => [...p, { role: 'assistant', content: data.response, id: Date.now().toString() }]);
    } catch { setMessages(p => [...p, { role: 'assistant', content: 'Network error', id: Date.now().toString() }]); } finally { setSending(false); }
  }

  async function closeCase() {
    if (!sessionId) return;
    setClosing(true);
    try { await fetch('/api/chat/operation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', sessionId }) }); } catch {}
    setClosing(false); setSessionId(null); setMessages([]); setState('idle');
  }

  const content = (() => {
    if (state === 'offline') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--danger-color)' }}>Connection Error</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'opencode server not running'}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Run: opencode serve --hostname 0.0.0.0 --port 4096</p>
          <Button variant="secondary" onClick={newCase}>Retry</Button>
        </div>
      );
    }
    if (state === 'idle' || state === 'loading') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-muted)' }}>Operation Chat</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>สร้าง session ใหม่เพื่อวิเคราะห์ปัญหา Operation</p>
          <Button variant="primary" size="lg" onClick={newCase} disabled={state === 'loading'}>
            <Plus size={20} /> New Case
          </Button>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          {messages.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: m.role === 'user' ? 'var(--accent-color)' : 'var(--panel-bg)',
                color: m.role === 'user' ? 'white' : 'var(--text-color)',
                border: m.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6,
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                กำลังตอบ...
              </div>
            </div>
          )}
          <div ref={msgsEnd} />
        </div>
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="พิมพ์ข้อความ..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', resize: 'none',
                minHeight: '44px', maxHeight: '120px', fontFamily: 'inherit', fontSize: '14px',
              }}
            />
            <Button variant="primary" onClick={sendMessage} disabled={!input.trim() || sending}>
              <Send size={16} />
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={closeCase} disabled={closing}>
              <FileText size={14} /> Close Case
            </Button>
          </div>
        </div>
      </div>
    );
  })();

  return <AppLayout title="Operation Chat">{content}</AppLayout>;
}
