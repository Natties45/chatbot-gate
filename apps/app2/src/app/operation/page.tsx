'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Plus, Send, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

type PageState = 'idle' | 'loading' | 'chat' | 'offline';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AttachedFile {
  name: string;
  content: string;
}

interface CaseRecord {
  id: string;
  caseId: string;
  preview: string | null;
  createdAt: string;
  sessionId?: string;
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
}

interface OpChatResponse {
  response: string;
  sessionId?: string;
  dbCaseId?: string;
  caseId?: string;
  error?: string;
}

interface OpMessageItem {
  id: string;
  role: string;
  content: string;
}

function OperationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbCaseId, setDbCaseId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<CaseRecord[]>([]);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const msgsEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadHistory() {
    try {
      const res = await fetch('/api/cases?status=in_progress&page=Operation');
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setHistory(data.cases || []);
    } catch (err) {
      console.error('History load error:', err);
    }
  }

  async function handleResume(c: CaseRecord) {
    setError('');
    setInput('');
    setAttachedFile(null);
    setState('loading');

    try {
      const res = await fetch(`/api/cases?id=${c.id}`);
      if (!res.ok) throw new Error('Failed to load case');
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setDbCaseId(data.id);
      
      const mappedMessages: ChatMsg[] = (data.messages || []).map((m: OpMessageItem) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      setMessages(mappedMessages);
      setState('chat');
    } catch {
      setError('Cannot connect to server');
      setState('offline');
    }
  }

  async function fetchCaseDetailsBySession(sId: string) {
    setState('loading');
    try {
      const res = await fetch(`/api/cases?status=in_progress&page=Operation`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      const current = data.cases?.find((c: CaseRecord) => c.sessionId === sId);
      if (current) {
        handleResume(current);
      } else {
        setState('idle');
      }
    } catch (err) {
      console.error(err);
      setState('idle');
    }
  }

  // Authenticate user & load history
  useEffect(() => {
    const initPage = async () => {
      try {
        const profileRes = await fetch('/api/auth/profile');
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }
        const profile: UserProfile = await profileRes.json();
        if (profile.role !== 'admin' && profile.role !== 'operation') {
          router.push('/login');
          return;
        }
        setUser(profile);
        
        // Load active history
        await loadHistory();
        setState('idle');
      } catch (err) {
        console.error(err);
        setState('offline');
        setError('Failed to authenticate');
      }
    };
    initPage();
  }, [router]);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Handle URL Session redirection if any
  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam && state === 'idle') {
      setSessionId(sessionParam);
      // Fetch details
      fetchCaseDetailsBySession(sessionParam);
    }
  }, [searchParams, state]);

  async function newCase() {
    setState('loading');
    setMessages([]);
    setAttachedFile(null);
    setError('');
    
    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setState('idle');
        return;
      }
      setSessionId(data.sessionId);
      setDbCaseId(data.dbCaseId);
      setState('chat');
    } catch {
      setError('Cannot connect to server');
      setState('offline');
    }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId || sending) return;
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
      const body: Record<string, unknown> = { action: 'message', message: finalMsg, sessionId };
      if (messages.length > 0) {
        body.history = messages.map((m) => ({ role: m.role, content: m.content }));
      }

      const res = await fetch('/api/chat/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((p) => [...p, { role: 'assistant', content: `Error: ${data.error}`, id: Date.now().toString() }]);
        return;
      }

      const aiMsg: ChatMsg = { role: 'assistant', content: data.response, id: (Date.now() + 1).toString() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Network error', id: Date.now().toString() }]);
    } finally {
      setSending(false);
    }
  }

  async function handleDraft() {
    if (!sessionId || sending) return;
    
    const userMsg: ChatMsg = { role: 'user', content: '[ร่างคำตอบ]', id: Date.now().toString() };
    setMessages((p) => [...p, userMsg]);
    setSending(true);
    
    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'message', 
          message: 'Based on the conversation above, generate a formal Thai summary report for the operation. Use structured format.', 
          sessionId 
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((p) => [...p, { role: 'assistant', content: `Error: ${data.error}`, id: Date.now().toString() }]);
      } else {
        const aiMsg: ChatMsg = { role: 'assistant', content: data.response, id: (Date.now() + 1).toString() };
        setMessages((prev) => [...prev, aiMsg]);
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
    
    setState('loading');
    try {
      await fetch('/api/chat/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId }),
      });
      
      setSessionId(null);
      setDbCaseId(null);
      setMessages([]);
      setAttachedFile(null);
      setState('idle');
      loadHistory();
    } catch {
      setError('Failed to close case');
      setState('offline');
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
      if (confirm('กลับหน้าหลัก? เคสปัจจุบันจะยังอยู่ในประวัติ')) {
        setSessionId(null);
        setDbCaseId(null);
        setMessages([]);
        setAttachedFile(null);
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

  if (state === 'loading') {
    return (
      <AppLayout title="Operation Chat">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
          <RefreshCw size={24} className="spinner" />
          <span>Processing request...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Operation Chat" headerAction={headerAction} onSidebarActiveClick={handleSidebarClick}>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />

      {state === 'offline' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
          <AlertTriangle size={48} style={{ color: 'var(--danger-color)' }} />
          <h2 style={{ fontSize: '20px', color: 'var(--danger-color)' }}>Connection Error</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'AI service unavailable'}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Check Groq key or Ollama fallback status, then retry.</p>
          <Button variant="secondary" onClick={newCase}><RefreshCw size={16} /> Retry</Button>
        </div>
      )}

      {state === 'idle' && (
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
                    <span className="historyPreview"><strong>[{c.caseId}]</strong> {c.preview || '(ไม่มีเนื้อหา)'}</span>
                    <div className="historyActions">
                      <Button variant="secondary" size="sm" onClick={() => handleResume(c)}>ทำต่อ</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>เริ่มต้นเคสใหม่</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', fontSize: '13px' }}>กด &quot;+ New Case&quot; มุมขวาบน เพื่อเริ่มแชท</p>
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
