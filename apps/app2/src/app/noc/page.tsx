'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Plus, Send, Copy, AlertTriangle, RefreshCw } from 'lucide-react';

type PageState = 'idle' | 'chat' | 'offline' | 'loading';
type NocState = 1 | 2 | 3;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind: 'message' | 'draft';
}

interface CaseRecord {
  id: string;
  caseId: string;
  preview: string | null;
  createdAt: string;
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
}

interface NocChatResponse {
  response: string;
  sessionId?: string;
  dbCaseId?: string;
  caseId?: string;
  error?: string;
}

interface NocMessageItem {
  id: string;
  role: string;
  content: string;
  kind?: string;
}

export default function NocPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [nocState, setNocState] = useState<NocState>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbCaseId, setDbCaseId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<CaseRecord[]>([]);
  const msgsEnd = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  async function loadHistory() {
    try {
      const res = await fetch('/api/cases?status=in_progress&page=NOC');
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setHistory(data.cases || []);
    } catch (err) {
      console.error('History load error:', err);
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
        if (profile.role !== 'admin' && profile.role !== 'noc') {
          router.push('/login');
          return;
        }
        setUser(profile);
        
        // Load active history
        await loadHistory();
        setPageState('idle');
      } catch (err) {
        console.error(err);
        setPageState('offline');
        setError('Failed to authenticate');
      }
    };
    initPage();
  }, [router]);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function goHome() {
    setPageState('idle');
    setSessionId(null);
    setDbCaseId(null);
    setMessages([]);
    setNocState(1);
    setError('');
    setInput('');
    loadHistory();
  }

  function handleSidebarClick() {
    if (pageState === 'chat' && sessionId) {
      if (confirm('กลับหน้าหลัก? เคสปัจจุบันจะยังอยู่ในประวัติ')) {
        goHome();
      }
    }
  }

  async function apiCall(action: string, extra: Record<string, unknown> = {}): Promise<NocChatResponse> {
    const res = await fetch('/api/chat/noc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, ...extra }),
    });
    const data: NocChatResponse = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
  }

  async function createNewCase() {
    setError('');
    setPageState('loading');
    setMessages([]);
    setNocState(1);
    setInput('');
    try {
      const data = await apiCall('init');
      setSessionId(data.sessionId || null);
      setDbCaseId(data.dbCaseId || null);
      setPageState('chat');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cannot connect to AI service';
      setError(message);
      setPageState('offline');
    }
  }

  async function handleSend() {
    if (!input.trim() || !sessionId || sending) return;
    const msg = input.trim();
    setInput('');
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, kind: 'message' };
    setMessages((p) => [...p, userMsg]);

    const promptType = nocState === 1 ? 'analyze' : 'chat';
    setSending(true);
    try {
      const extra: Record<string, unknown> = { promptType, message: msg };
      
      // Pass recent history to the app2 AI brain for context
      if (messages.length > 0) {
        extra.history = messages.map((m) => ({ role: m.role, content: m.content }));
      }
      
      const data = await apiCall('message', extra);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        kind: 'message',
      };
      
      setMessages((prev) => [...prev, aiMsg]);

      if (promptType === 'analyze') {
        setNocState(2);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setPageState('offline');
    } finally {
      setSending(false);
    }
  }

  async function handleDraft() {
    if (nocState < 2 || !sessionId || sending) return;
    
    setSending(true);
    try {
      const data = await apiCall('message', { promptType: 'draft', message: 'Draft response based on our analysis' });
      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        kind: 'draft',
      };
      
      setMessages((p) => [...p, aiMsg]);
      setNocState(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setPageState('offline');
    } finally {
      setSending(false);
    }
  }

  function getLatestDraft(): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].kind === 'draft') return messages[i].content;
    }
    return '';
  }

  function handleCopy() {
    const draft = getLatestDraft();
    if (draft) {
      navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleUseDraft() {
    if (!confirm('ใช้ร่างนี้และปิดเคส?')) return;
    if (sessionId) {
      apiCall('close')
        .then(() => goHome())
        .catch((err) => {
          setError(err.message);
          setPageState('offline');
        });
    }
  }

  async function handleCloseCase() {
    if (!confirm('ต้องการปิดเคสนี้?')) return;
    if (sessionId) {
      setPageState('loading');
      try {
        await apiCall('close');
        goHome();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setPageState('offline');
      }
    }
  }

  async function handleResume(c: CaseRecord) {
    setError('');
    setInput('');
    setPageState('loading');
    
    try {
      // Fetch details and chat logs from DB
      const res = await fetch(`/api/cases?id=${c.id}`);
      if (!res.ok) throw new Error('Failed to load case details');
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setDbCaseId(data.id);
      
      const mappedMessages: ChatMessage[] = (data.messages || []).map((m: NocMessageItem) => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        kind: (m.kind === 'draft' ? 'draft' : 'message') as 'message' | 'draft'
      }));
      
      setMessages(mappedMessages);

      let newState: NocState = 1;
      if (mappedMessages.some((m) => m.kind === 'draft')) {
        newState = 3;
      } else if (mappedMessages.length >= 2) {
        newState = 2;
      }
      
      setNocState(newState);
      setPageState('chat');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cannot resume case';
      setError(message);
      setPageState('offline');
    }
  }

  const headerAction = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button variant="primary" size="sm" onClick={createNewCase} disabled={pageState === 'loading'}>
        <Plus size={16} /> New Case
      </Button>
      {pageState === 'chat' && (
        <Button variant="danger" size="sm" onClick={handleCloseCase}>
          ปิดเคส
        </Button>
      )}
    </div>
  );

  if (pageState === 'loading') {
    return (
      <AppLayout title="NOC Chat">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
          <RefreshCw size={24} className="spinner" />
          <span>Processing request...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="NOC Chat" headerAction={headerAction} onSidebarActiveClick={handleSidebarClick}>
      {pageState === 'offline' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
          <AlertTriangle size={48} style={{ color: 'var(--danger-color)' }} />
          <h2 style={{ fontSize: '20px', color: 'var(--danger-color)' }}>Connection Error</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'AI service unavailable'}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Check Groq key or Ollama fallback status, then retry.</p>
          <Button variant="secondary" onClick={createNewCase}><RefreshCw size={16} /> Retry</Button>
        </div>
      )}

      {pageState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {history.length > 0 && (
            <div className="historyPanel">
              <div className="historyHeader">
                <span>เคสที่ยังไม่ปิด</span>
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

      {pageState === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: '8px' }}>
          <div className="chatArea">
            {messages.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '14px' }}>
                พิมพ์ข้อความจากลูกค้าเพื่อเริ่มวิเคราะห์
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`messageBubble ${m.role === 'user' ? 'userBubble' : 'assistantBubble'}`}>
                {m.kind === 'draft' ? (
                  <div className="draftCard">{m.content}</div>
                ) : (
                  <span>{m.content}</span>
                )}
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
              {nocState < 3 ? (
                <Button variant="secondary" size="sm" onClick={handleDraft} disabled={nocState < 2 || sending}>
                  ร่างคำตอบ
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    <Copy size={14} /> {copied ? 'คัดลอกแล้ว' : 'Copy'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleUseDraft}>
                    ใช้ร่างนี้
                  </Button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="พิมพ์ข้อความ..."
              style={{
                flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--panel-bg)', color: 'var(--text-color)', resize: 'none',
                minHeight: '70px', maxHeight: '100px', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.4,
              }}
            />
            <Button variant="primary" onClick={handleSend} disabled={!input.trim() || sending}>
              <Send size={16} /> Send
            </Button>
          </div>
        </div>
      )}

      {copied && <div className="copyToast">คัดลอกไปยัง clipboard แล้ว</div>}
    </AppLayout>
  );
}
