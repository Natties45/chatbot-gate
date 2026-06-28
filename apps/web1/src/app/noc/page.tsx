'use client';
import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout/AppLayout';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { Badge } from '@/components/ui/Badge/Badge';
import { MessageSquare, Plus, Send, FileText, ChevronRight, ChevronLeft, AlertTriangle, RefreshCw, Search } from 'lucide-react';

type WizardState = 'idle' | 'input' | 'analyzing' | 'analysis' | 'addInfo' | 'actionSelect' | 'drafting' | 'draft' | 'sendTemplate' | 'closing' | 'offline';

interface AnalysisData {
  category: string;
  confidence: string;
  summary: string;
  sources: string;
  response: string;
}

function parseAnalysis(text: string): AnalysisData {
  const extractField = (fieldName: string) => {
    const tableRegex = new RegExp(`\\|\\s*\\*\\*${fieldName}\\*\\*\\s*\\|\\s*(.*?)\\s*\\|`, 'i');
    let match = text.match(tableRegex);
    if (match) {
      return match[1].replace(/^\*\*|\*\*$/g, '').trim();
    }
    const bulletRegex = new RegExp(`-\\s*${fieldName}:\\s*(.+)`, 'i');
    match = text.match(bulletRegex);
    if (match) return match[1].trim();
    return '';
  };

  const category = extractField('Category');
  let confidence = extractField('Confidence');
  confidence = confidence.replace('%', '').trim();
  const summary = extractField('Summary');
  const sources = extractField('Sources');

  let response = '';
  const responseMatch = text.match(/###\s*.*ร่างตอบกลับ.*\n+([\s\S]*)$/i);
  if (responseMatch) {
    response = responseMatch[1].trim();
  } else {
    const oldResponseMatch = text.match(/- Response:\s*([\s\S]*$)/i);
    if (oldResponseMatch) {
      response = oldResponseMatch[1].trim();
    }
  }

  if (!category && !summary && !response) {
    return { category: '', confidence: '', summary: '', sources: '', response: text };
  }

  return { category, confidence, summary, sources, response };
}

function confidenceBadge(conf: string): 'success' | 'warning' | 'danger' | 'default' {
  const n = parseInt(conf);
  if (isNaN(n)) return 'default';
  if (n >= 70) return 'success';
  if (n >= 50) return 'warning';
  return 'danger';
}

export default function NocPage() {
  const [state, setState] = useState<WizardState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [customerMessage, setCustomerMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [draftResult, setDraftResult] = useState<string | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [error, setError] = useState('');
  const msgsEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [state, analysisResult, draftResult, emailTemplate]);

  async function apiCall(action: string, extra: Record<string, any> = {}) {
    const res = await fetch('/api/chat/noc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
  }

  async function createNewCase() {
    setError('');
    setState('input');
    setAnalysisResult(null);
    setDraftResult(null);
    setEmailTemplate(null);
    setAdditionalInfo('');
    setFeedbackText('');
    setCustomerMessage('');
    try {
      const data = await apiCall('init');
      setSessionId(data.sessionId);
    } catch (err: any) {
      setError(err.message || 'Cannot connect to server');
      setState('offline');
    }
  }

  async function handleAnalyze() {
    if (!customerMessage.trim() || !sessionId) return;
    setState('analyzing');
    try {
      const data = await apiCall('message', { promptType: 'analyze', message: customerMessage });
      setAnalysisResult(data.response);
      setState('analysis');
    } catch (err: any) {
      setError(err.message);
      setState('offline');
    }
  }

  async function handleReAnalyze() {
    if (!additionalInfo.trim() || !sessionId) return;
    setState('analyzing');
    try {
      const data = await apiCall('message', { promptType: 'feedback', message: customerMessage, additionalInfo });
      setAnalysisResult(data.response);
      setAdditionalInfo('');
      setState('analysis');
    } catch (err: any) {
      setError(err.message);
      setState('offline');
    }
  }

  async function handleDraft() {
    if (!sessionId) return;
    setState('drafting');
    try {
      const data = await apiCall('message', { promptType: 'draft', message: 'Draft response based on our analysis' });
      setDraftResult(data.response);
      setState('draft');
    } catch (err: any) {
      setError(err.message);
      setState('offline');
    }
  }

  async function handleEmailTemplate() {
    if (!sessionId) return;
    setState('sendTemplate');
    try {
      const data = await apiCall('message', { promptType: 'email', message: 'Generate NOC handoff template' });
      setEmailTemplate(data.response);
    } catch (err: any) {
      setError(err.message);
      setState('offline');
    }
  }

  async function handleClose() {
    if (!sessionId) return;
    setState('closing');
    try {
      await apiCall('close');
    } catch {}
    setSessionId(null);
    setAnalysisResult(null);
    setDraftResult(null);
    setEmailTemplate(null);
    setCustomerMessage('');
    setAdditionalInfo('');
    setFeedbackText('');
    setState('idle');
  }

  async function handleNewCaseInChat() {
    if (!confirm('เริ่มเคสใหม่? เคสปัจจุบันจะถูกปิด')) return;
    if (sessionId) {
      try { await fetch('/api/chat/noc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', sessionId }) }); } catch {}
    }
    setState('input');
    setSessionId(null);
    setAnalysisResult(null);
    setDraftResult(null);
    setEmailTemplate(null);
    setCustomerMessage('');
    setAdditionalInfo('');
    setFeedbackText('');
    setError('');
    try {
      const data = await apiCall('init');
      setSessionId(data.sessionId);
    } catch (err: any) {
      setError(err.message || 'Cannot connect to server');
      setState('offline');
    }
  }

  const headerAction = state !== 'idle' && state !== 'offline' ? (
    <Button variant="secondary" size="sm" onClick={handleNewCaseInChat}>
      <Plus size={16} /> New Case
    </Button>
  ) : undefined;

  const analysis = analysisResult ? parseAnalysis(analysisResult) : null;

  const containerStyle: React.CSSProperties = {
    maxWidth: '850px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  };

  function renderIdle() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px' }}>
        <MessageSquare size={48} style={{ color: 'var(--text-muted)' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-muted)' }}>NOC Chat</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>สร้าง session ใหม่เพื่อเริ่มวิเคราะห์ปัญหาจากลูกค้า</p>
        <Button variant="primary" size="lg" onClick={createNewCase}>
          <Plus size={20} /> New Case
        </Button>
      </div>
    );
  }

  function renderOffline() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger-color)' }} />
        <h2 style={{ fontSize: '20px', color: 'var(--danger-color)' }}>Connection Error</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'opencode server not running'}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Run: opencode serve --hostname 0.0.0.0 --port 4096</p>
        <Button variant="secondary" onClick={createNewCase}><RefreshCw size={16} /> Retry</Button>
      </div>
    );
  }

  function renderInput() {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} style={{ color: 'var(--accent-color)' }} />
            ข้อความจากลูกค้า
          </h3>
          <textarea
            value={customerMessage}
            onChange={e => setCustomerMessage(e.target.value)}
            placeholder="วางข้อความที่ลูกค้าแจ้งมาที่นี่..."
            style={{
              width: '100%', minHeight: '150px', padding: '16px', borderRadius: '8px',
              border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleAnalyze} disabled={!customerMessage.trim()}>
              <Search size={16} /> วิเคราะห์ปัญหา
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  function renderAnalyzing() {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '40px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>กำลังวิเคราะห์ปัญหา...</p>
        </div>
      </Card>
    );
  }

  function renderAnalysisView() {
    if (!analysis) return null;
    return (
      <div style={containerStyle}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <Badge variant="info">{analysis.category || 'N/A'}</Badge>
              <Badge variant={confidenceBadge(analysis.confidence)}>
                Confidence: {analysis.confidence || 'N/A'}
              </Badge>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Summary</h4>
              <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{analysis.summary || 'No summary'}</p>
            </div>
            {analysis.sources && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Sources</h4>
                <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--text-muted)' }}>{analysis.sources}</p>
              </div>
            )}
            {analysis.response && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Response Draft</h4>
                <div style={{
                  backgroundColor: 'var(--bg-color)', borderLeft: '4px solid var(--primary-color)',
                  padding: '16px', borderRadius: '8px', fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '13px',
                }}>
                  {analysis.response}
                </div>
              </div>
            )}
          </div>
        </Card>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => setState('addInfo')}>
            <AlertTriangle size={16} /> ส่งข้อมูลเพิ่มเติม
          </Button>
          <Button variant="primary" onClick={() => setState('actionSelect')}>
            ข้อมูลถูกต้อง <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  function renderAddInfo() {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--warning-color)' }}>
            เพิ่มข้อมูลสำหรับการวิเคราะห์ใหม่
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            กรุณาเพิ่มข้อมูลที่ NOC มีเพิ่มเติม เพื่อให้ระบบวิเคราะห์ใหม่
          </p>
          <textarea
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            placeholder="ใส่ข้อมูลเพิ่มเติมที่ NOC ทราบ..."
            style={{
              width: '100%', minHeight: '120px', padding: '16px', borderRadius: '8px',
              border: '1px solid var(--danger-color)', backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <Button variant="ghost" onClick={() => setState('analysis')}>
              <ChevronLeft size={16} /> ย้อนกลับ
            </Button>
            <Button variant="primary" onClick={handleReAnalyze} disabled={!additionalInfo.trim()}>
              <RefreshCw size={16} /> วิเคราะห์ใหม่
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  function renderActionSelect() {
    return (
      <div style={containerStyle}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>เลือกขั้นตอนต่อไป</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={handleDraft} style={{
                padding: '20px', borderRadius: '8px', border: '2px solid var(--border-color)',
                backgroundColor: 'var(--panel-bg)', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '8px', transition: 'border-color 0.2s',
              }} onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
                 onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                <span style={{ fontSize: '24px' }}>📝</span>
                <span style={{ fontWeight: 600 }}>ร่างคำตอบ</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ร่าง reply ถึงลูกค้าตาม style OLS</span>
              </button>
              <button onClick={handleEmailTemplate} style={{
                padding: '20px', borderRadius: '8px', border: '2px solid var(--border-color)',
                backgroundColor: 'var(--panel-bg)', cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: '8px', transition: 'border-color 0.2s',
              }} onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
                 onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                <span style={{ fontSize: '24px' }}>📧</span>
                <span style={{ fontWeight: 600 }}>ส่งเคส</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>NOC handoff template สำหรับ Email/Ticket</span>
              </button>
            </div>
          </div>
        </Card>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={() => setState('addInfo')}>
            <ChevronLeft size={16} /> เพิ่มข้อมูล
          </Button>
          <Button variant="danger" size="sm" onClick={handleClose}>
            <FileText size={14} /> Close Case
          </Button>
        </div>
      </div>
    );
  }

  function renderDrafting() {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '40px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>กำลังร่างคำตอบ...</p>
        </div>
      </Card>
    );
  }

  function renderDraft() {
    return (
      <div style={containerStyle}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: 'var(--accent-color)' }} />
              ร่างคำตอบ
            </h3>
            <div style={{
              backgroundColor: 'var(--bg-color)', borderLeft: '4px solid var(--accent-color)',
              padding: '20px', borderRadius: '8px', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '13px',
            }}>
              {draftResult || 'No draft'}
            </div>
          </div>
        </Card>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => { setFeedbackText(''); setState('addInfo'); }}>
            <ChevronLeft size={16} /> เพิ่มข้อมูล
          </Button>
          <Button variant="secondary" onClick={handleDraft}>
            <RefreshCw size={16} /> ขอร่างใหม่
          </Button>
          <Button variant="primary" onClick={handleClose}>
            <FileText size={16} /> ใช้ร่างนี้
          </Button>
        </div>
      </div>
    );
  }

  function renderSendTemplate() {
    return (
      <div style={containerStyle}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: 'var(--accent-color)' }} />
              NOC Handoff Template
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Template สำหรับส่งเคสต่อไปยัง Email หรือ Ticket System
            </p>
            <div style={{
              backgroundColor: 'var(--bg-color)', borderLeft: '4px solid var(--primary-color)',
              padding: '20px', borderRadius: '8px', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '13px',
            }}>
              {emailTemplate || 'Generating template...'}
            </div>
          </div>
        </Card>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => setState('actionSelect')}>
            <ChevronLeft size={16} /> ย้อนกลับ
          </Button>
          <Button variant="secondary" onClick={handleEmailTemplate}>
            <RefreshCw size={16} /> ขอร่างใหม่
          </Button>
          <Button variant="primary" onClick={handleClose}>
            <FileText size={16} /> ส่งและปิดเคส
          </Button>
        </div>
      </div>
    );
  }

  function renderClosing() {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '40px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-muted)' }}>กำลังปิดเคส...</p>
        </div>
      </Card>
    );
  }

  function renderMain() {
    switch (state) {
      case 'idle': return renderIdle();
      case 'offline': return renderOffline();
      case 'input': return renderInput();
      case 'analyzing': return renderAnalyzing();
      case 'analysis': return renderAnalysisView();
      case 'addInfo': return renderAddInfo();
      case 'actionSelect': return renderActionSelect();
      case 'drafting': return renderDrafting();
      case 'draft': return renderDraft();
      case 'sendTemplate': return renderSendTemplate();
      case 'closing': return renderClosing();
      default: return renderIdle();
    }
  }

  const showChat = state === 'input' || state === 'draft';

  return (
    <AppLayout title="NOC Chat" headerAction={headerAction}>
      <div style={containerStyle}>
        {showChat && customerMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: '12px 0 12px 12px',
                backgroundColor: 'var(--accent-color)', color: 'white',
                whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6,
              }}>
                {customerMessage}
              </div>
            </div>
          </div>
        )}
        {renderMain()}
        <div ref={msgsEnd} />
      </div>
    </AppLayout>
  );
}
