'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Plus, Send, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl } from '@/lib/api';

type PageState = 'idle' | 'loading' | 'chat' | 'offline';
type OperationPhase = 'clarify' | 'research' | 'diagnose';

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

interface OpMessageItem {
  id: string;
  role: string;
  content: string;
}

interface ResearchProgress {
  step: number;
  total: number;
  label: string;
  status: string;
}

function OperationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<OperationPhase>('clarify');
  const [progress, setProgress] = useState<ResearchProgress>({ step: 0, total: 3, label: 'Idle', status: 'idle' });
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
      const res = await fetch(apiUrl('/api/cases?status=in_progress&page=Operation'));
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
      const res = await fetch(apiUrl(`/api/cases?id=${c.id}`));
      if (!res.ok) throw new Error('Failed to load case');
      
      const data = await res.json();
      setSessionId(data.sessionId);
      
      const mappedMessages: ChatMsg[] = (data.messages || []).map((m: OpMessageItem) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      setMessages(mappedMessages);
      setPhase(mappedMessages.length > 1 ? 'diagnose' : 'clarify');
      setState('chat');
    } catch {
      setError('Cannot connect to server');
      setState('offline');
    }
  }

  async function fetchCaseDetailsBySession(sId: string) {
    setState('loading');
    try {
      const res = await fetch(apiUrl(`/api/cases?status=in_progress&page=Operation`));
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
        const profileRes = await fetch(apiUrl('/api/auth/profile'));
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }
        const profile: UserProfile = await profileRes.json();
        if (profile.role !== 'admin' && profile.role !== 'operation') {
          router.push('/login');
          return;
        }
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
    setPhase('clarify');
    setProgress({ step: 0, total: 3, label: 'Idle', status: 'idle' });
    setError('');
    
    try {
      const res = await fetch(apiUrl('/api/chat/operation'), {
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
      const body: Record<string, unknown> = {
        action: 'message',
        message: finalMsg,
        sessionId,
        promptType: phase === 'clarify' ? 'clarify' : 'message',
      };
      if (messages.length > 0) {
        body.history = messages.map((m) => ({ role: m.role, content: m.content }));
      }

      const res = await fetch(apiUrl('/api/chat/operation'), {
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
      const res = await fetch(apiUrl('/api/chat/operation'), {
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

  async function pollProgress(activeSessionId: string) {
    try {
      const res = await fetch(apiUrl(`/api/chat/operation/progress?sessionId=${activeSessionId}`));
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch {
      // Progress polling is best-effort and must not break the chat flow.
    }
  }

  async function runOperationPrompt(promptType: 'research' | 'diagnose', message: string) {
    if (!sessionId || sending) return;

    setSending(true);
    if (promptType === 'research') {
      setPhase('research');
      setProgress({ step: 1, total: 3, label: 'กำลังเริ่ม research...', status: 'running' });
    }

    const poller = promptType === 'research'
      ? window.setInterval(() => pollProgress(sessionId), 1000)
      : null;

    try {
      const res = await fetch(apiUrl('/api/chat/operation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          promptType,
          message,
          sessionId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation request failed');

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response, id: Date.now().toString() }]);
      setPhase('diagnose');
      if (promptType === 'research') {
        setProgress({ step: 3, total: 3, label: 'Research complete', status: 'done' });
      }
    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'Operation request failed';
      setMessages((p) => [...p, { role: 'assistant', content: `Error: ${messageText}`, id: Date.now().toString() }]);
      setProgress({ step: progress.step, total: 3, label: messageText, status: 'error' });
    } finally {
      if (poller) window.clearInterval(poller);
      setSending(false);
    }
  }

  async function closeCase() {
    if (!sessionId) return;
    if (!confirm('ต้องการปิดเคสนี้?')) return;
    
    setState('loading');
    try {
      await fetch(apiUrl('/api/chat/operation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId }),
      });
      
      setSessionId(null);
      setMessages([]);
      setAttachedFile(null);
      setPhase('clarify');
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
        setMessages([]);
        setAttachedFile(null);
        setPhase('clarify');
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
                <span>{m.content}</span>
                {m.role === 'assistant' && phase === 'clarify' && extractOptions(m.content).length > 0 && (
                  <div className="optionGrid">
                    {extractOptions(m.content).map((option) => (
                      <button key={option} type="button" className="optionButton" onClick={() => setInput(option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {phase === 'research' && (
              <div className="researchProgressCard">
                <div className="researchProgressTop"><strong>Research Progress</strong><span>{progress.step}/{progress.total}</span></div>
                <div className="researchProgressBar"><div className="researchProgressFill" style={{ width: `${Math.max(10, (progress.step / progress.total) * 100)}%` }} /></div>
                <p>{progress.label}</p>
              </div>
            )}
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
              {phase === 'clarify' && (
                <Button variant="primary" size="sm" onClick={() => runOperationPrompt('research', 'Start sequential research using the current Operation case context.')} disabled={messages.length === 0 || sending}>
                  เริ่ม Research
                </Button>
              )}
              {phase === 'diagnose' && (
                <Button variant="primary" size="sm" onClick={() => runOperationPrompt('diagnose', 'Create structured diagnosis from this Operation case context.')} disabled={sending}>
                  สรุป Diagnosis
                </Button>
              )}
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

function extractOptions(content: string): string[] {
  const options: string[] = [];
  const optionRegex = /^\[(\d+)\]\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = optionRegex.exec(content)) !== null) {
    options.push(`[${match[1]}] ${match[2]}`);
  }
  return options;
}

export default function OperationPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading...</div>}>
      <OperationContent />
    </Suspense>
  );
}
