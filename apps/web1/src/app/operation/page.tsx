'use client';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Plus, Send, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { caseStore, messageStore, extractPreview, type CaseRecord } from '@/lib/case-store';

type PageState = 'idle' | 'loading' | 'chat' | 'offline';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface AttachedFile {
  name: string;
  content: string;
}

function OperationContent() {
  const [state, setState] = useState<PageState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<CaseRecord[]>([]);
  const [draftMode, setDraftMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [hasRestoredHistory, setHasRestoredHistory] = useState(false);
  const msgsEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const loadHistory = useCallback(() => {
    setHistory(caseStore.getAll('operation'));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam && state === 'idle') {
      setSessionId(sessionParam);
      setState('chat');
    }
  }, [searchParams, state]);

  async function newCase() {
    setState('loading');
    setMessages([]);
    setDraftMode(false);
    setAttachedFile(null);
    setHasRestoredHistory(false);
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
      caseStore.add({
        id: data.sessionId,
        type: 'operation',
        preview: '(new case)',
        createdAt: new Date().toISOString(),
        status: 'active',
      });
    } catch {
      setError('Cannot connect to server');
      setState('offline');
    }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId) return;
    const userMsg = input.trim();
    setInput('');
    setAttachedFile(null);

    const finalMsg = attachedFile
      ? `[แนบแล้ว: ${attachedFile.name}]\n${attachedFile.content}\n\n${userMsg}`
      : userMsg;

    const newMsg: ChatMsg = { role: 'user', content: userMsg, id: Date.now().toString() };
    setMessages((p) => [...p, newMsg]);
    setSending(true);
    try {
      const body: Record<string, any> = { action: 'message', message: finalMsg, sessionId };
      if (hasRestoredHistory && messages.length > 0) {
        body.history = messages.map((m) => ({ role: m.role, content: m.content }));
        setHasRestoredHistory(false);
      }
      const res = await fetch('/api/chat/operation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((p) => [...p, { role: 'assistant', content: `Error: ${data.error}`, id: Date.now().toString() }]);
        setSending(false);
        return;
      }
      const aiMsg: ChatMsg = { role: 'assistant', content: data.response, id: Date.now().toString() };
      const newMessages = [...messages, newMsg, aiMsg];
      setMessages(newMessages);

      if (messages.length === 0) {
        caseStore.update(sessionId, { preview: extractPreview(userMsg) });
      }

      messageStore.save(sessionId, newMessages);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Network error', id: Date.now().toString() }]);
    } finally {
      setSending(false);
    }
  }

  async function handleDraft() {
    if (!sessionId || sending) return;
    setDraftMode(true);
    const userMsg: ChatMsg = { role: 'user', content: '[ร่างคำตอบ]', id: Date.now().toString() };
    setMessages((p) => [...p, userMsg]);
    setSending(true);
    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', message: 'Based on the conversation above, generate a formal Thai summary report for the operation. Use structured format.', sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((p) => [...p, { role: 'assistant', content: `Error: ${data.error}`, id: Date.now().toString() }]);
      } else {
        const aiMsg: ChatMsg = { role: 'assistant', content: data.response, id: Date.now().toString() };
        const newMessages = [...messages, userMsg, aiMsg];
        setMessages(newMessages);
        messageStore.save(sessionId, newMessages);
      }
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Network error', id: Date.now().toString() }]);
    } finally {
      setSending(false);
    }
  }

  async function closeCase() {
    if (!sessionId) return;
    if (!confirm('ต้องการปิดเคสนี้?')) return;
    try {
      await fetch('/api/chat/operation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId }),
      });
    } catch {}
    caseStore.remove(sessionId);
    messageStore.remove(sessionId);
    setSessionId(null);
    setMessages([]);
    setDraftMode(false);
    setAttachedFile(null);
    setHasRestoredHistory(false);
    setState('idle');
    loadHistory();
  }

  async function handleResume(c: CaseRecord) {
    setError('');
    setInput('');
    setAttachedFile(null);
    const savedMessages = messageStore.load(c.id);
    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSessionId(data.sessionId);
      setMessages(savedMessages as ChatMsg[]);
      setHasRestoredHistory(savedMessages.length > 0);
      setDraftMode(false);
      setState('chat');
    } catch {
      setError('Cannot connect to server');
      setState('offline');
    }
  }

  function handleSoftDelete(c: CaseRecord) {
    if (confirm('ลบเคสนี้ออกจากประวัติ?')) {
      caseStore.softDelete(c.id);
      messageStore.remove(c.id);
      loadHistory();
    }
  }

  function handleAttachFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedFile({ name: file.name, content: ev.target?.result as string });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSidebarClick() {
    if (state === 'chat' && sessionId) {
      messageStore.save(sessionId, messages);
      if (confirm('กลับหน้าหลัก? เคสปัจจุบันจะยังอยู่ในประวัติ')) {
        setSessionId(null);
        setMessages([]);
        setDraftMode(false);
        setAttachedFile(null);
        setHasRestoredHistory(false);
        setState('idle');
        loadHistory();
      }
    }
  }

  const headerAction = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button variant="primary" size="sm" onClick={newCase} disabled={state === 'loading'}>
        <Plus size={16} /> New Case
      </Button>
      {state === 'chat' && (
        <Button variant="danger" size="sm" onClick={closeCase}>
          ปิดเคส
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout title="Operation Chat" headerAction={headerAction} onSidebarActiveClick={handleSidebarClick}>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />

      {state === 'offline' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
          <AlertTriangle size={48} style={{ color: 'var(--danger-color)' }} />
          <h2 style={{ fontSize: '20px', color: 'var(--danger-color)' }}>Connection Error</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'opencode server not running'}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Run: opencode serve --hostname 0.0.0.0 --port 4096</p>
          <Button variant="secondary" onClick={newCase}><RefreshCw size={16} /> Retry</Button>
        </div>
      )}

      {(state === 'idle' || state === 'loading') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {history.length > 0 && (
            <div className="historyPanel">
              <div className="historyHeader">
                <span>Operation Cases</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{history.length} รายการ</span>
              </div>
              <div className="historyTable">
                {history.map((c) => (
                  <div key={c.id} className="historyRow">
                    <span className="historyDate">{new Date(c.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })} {new Date(c.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="historyPreview">{c.preview}</span>
                    <div className="historyActions">
                      <Button variant="secondary" size="sm" onClick={() => handleResume(c)}>ทำต่อ</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSoftDelete(c)} style={{ color: 'var(--danger-color)' }}>ลบ</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>เริ่มต้นเคสใหม่</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', fontSize: '13px' }}>กด "+ New Case" มุมขวาบน เพื่อเริ่มแชท</p>
          </div>
        </div>
      )}

      {state === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: '8px' }}>
          <div className="chatArea">
            {messages.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '14px' }}>
                พิมพ์ข้อความเพื่อเริ่มต้น
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`messageBubble ${m.role === 'user' ? 'userBubble' : 'assistantBubble'}`}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="messageBubble assistantBubble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" />
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>กำลังตอบ...</span>
              </div>
            )}
            <div ref={msgsEnd} />
          </div>

          <div className="quickActionBar">
            <div className="quickActionsLeft">
              <Button variant="secondary" size="sm" onClick={handleDraft} disabled={sending}>
                ร่างคำตอบ
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
            <Button variant="secondary" size="sm" onClick={handleAttachFile} title="แนบไฟล์" style={{ padding: '12px 14px' }}>
              <FileText size={16} />
            </Button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {attachedFile && (
                <div className="fileAttachChip">
                  <span className="fileAttachChipName"> {attachedFile.name}</span>
                  <span className="fileAttachChipRemove" onClick={() => setAttachedFile(null)}>✕</span>
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="พิมพ์ข้อความ operation..."
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--panel-bg)', color: 'var(--text-color)', resize: 'none',
                  minHeight: '70px', maxHeight: '100px', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.4,
                }}
              />
            </div>
            <Button variant="primary" onClick={sendMessage} disabled={!input.trim() || sending}>
              <Send size={16} /> Send
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function OperationPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading...</div>}>
      <OperationContent />
    </Suspense>
  );
}
