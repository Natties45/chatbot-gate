'use client';

import { useState } from 'react';
import { Button } from '../../../../components/ui/Button/Button';
import { Card } from '../../../../components/ui/Card/Card';
import { MessageSquare, RefreshCw, CheckCircle2, AlertTriangle, ChevronRight, Copy, Check } from 'lucide-react';

export default function NocChatPage() {
  // Wizard states: 1 = Input, 2 = AI Understanding, 3 = Choose Response, 4 = Final Response, 6 = Escalation
  const [step, setStep] = useState(1);
  const [problem, setProblem] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<'ticket' | 'email' | null>(null);
  const [showMismatch, setShowMismatch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAnalyze = async (isFeedback = false) => {
    if (!isFeedback && !problem.trim()) return;
    if (isFeedback && !feedback.trim()) return;

    setLoading(true);
    if (!isFeedback) setStep(2); // Move to step 2 visually for loading skeletons
    setShowMismatch(false);
    setErrorMessage('');

    try {
      const res = await fetch('/api/chat/noc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: problem,
          feedback: isFeedback ? feedback : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'AI service is not available right now.');
        setStep(1);
        return;
      }
      setAiAnalysis(data);

      if (data.isEscalated) {
        setStep(6); // Escalation Mode
      } else {
        setStep(2);
      }
      
      if (isFeedback) setFeedback(''); // Clear feedback after sending
    } catch (err) {
      console.error(err);
      setErrorMessage('Unable to connect to the AI service right now.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetFlow = () => {
    setStep(1);
    setProblem('');
    setFeedback('');
    setAiAnalysis(null);
    setSelectedFormat(null);
    setShowMismatch(false);
  };

  const renderTimeline = () => {
    const steps = [
      { num: 1, label: 'ส่งปัญหา' },
      { num: 2, label: 'AI สรุปความเข้าใจ' },
      { num: 3, label: 'เลือกประเภทคำตอบ' },
      { num: 4, label: 'คัดลอก & ปิดเคส' }
    ];

    if (step === 6) return null; // Don't show timeline in escalation mode

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', gap: '8px' }}>
        {steps.map((s, idx) => {
          const isActive = step === s.num;
          const isPast = step > s.num;
          return (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isActive || isPast ? 'var(--primary-color, #1a73e8)' : 'var(--bg-color)',
                  color: isActive || isPast ? '#fff' : 'var(--text-muted)',
                  border: `2px solid ${isActive || isPast ? 'var(--primary-color, #1a73e8)' : 'var(--border-color)'}`,
                  fontWeight: 600
                }}>
                  {isPast ? <Check size={16} /> : s.num}
                </div>
                <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 400, color: isActive || isPast ? 'var(--text-color)' : 'var(--text-muted)' }}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div style={{ width: '40px', height: '2px', backgroundColor: isPast ? 'var(--primary-color, #1a73e8)' : 'var(--border-color)', alignSelf: 'flex-start', marginTop: '16px' }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {renderTimeline()}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Step 1: Input */}
        <Card style={{ opacity: step === 1 ? 1 : 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <MessageSquare style={{ color: 'var(--primary-color, #1a73e8)' }} size={24} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>วางรายละเอียดข้อความของลูกค้า</h2>
          </div>
          <textarea
            style={{ 
              width: '100%', minHeight: '150px', padding: '16px', borderRadius: '8px', 
              border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)',
              fontFamily: 'inherit', resize: 'vertical'
            }}
            placeholder="วางรายละเอียดปัญหา หรือ พิมพ์คำว่า 'escalate' เพื่อจำลองเคสที่ AI ไม่มั่นใจ..."
            value={problem}
            onChange={e => setProblem(e.target.value)}
            disabled={step > 1}
          />
          {errorMessage && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger-color, #ef4444)',
              fontSize: '14px'
            }}>
              {errorMessage}
            </div>
          )}
          {step === 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="primary" onClick={() => handleAnalyze(false)} disabled={!problem.trim() || loading} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ส่งวิเคราะห์ปัญหา</span>
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </Card>

        {/* Step 2: AI Loading or Result */}
        {step >= 2 && step !== 6 && (
          <Card style={{ opacity: step === 2 ? 1 : 0.5 }}>
            {loading ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <RefreshCw className="animate-spin" style={{ color: 'var(--primary-color, #1a73e8)' }} size={24} />
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>กำลังประมวลผล...</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '20px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', width: '70%', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: '20px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', width: '90%', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: '20px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', width: '50%', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ) : aiAnalysis ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <CheckCircle2 style={{ color: 'var(--success-color, #10b981)' }} size={24} />
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>ผลลัพธ์ความเข้าใจของ AI</h2>
                </div>
                
                <div style={{ 
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', 
                  backgroundColor: 'var(--bg-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' 
                }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>AI สรุปปัญหาว่า</span>
                    <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>{aiAnalysis.summary}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>หมวดหมู่เคส</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{aiAnalysis.category}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ความมั่นใจ AI</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: aiAnalysis.confidence > 80 ? 'var(--success-color, #10b981)' : 'var(--warning-color, #f59e0b)' }} />
                      <span style={{ fontWeight: 500 }}>{aiAnalysis.confidence}%</span>
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>เอกสารอ้างอิง</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{aiAnalysis.sources.join(', ')}</p>
                  </div>
                </div>

                {step === 2 && !showMismatch && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onClick={() => setShowMismatch(true)} style={{ color: 'var(--warning-color, #f59e0b)' }}>
                      ข้อมูลไม่ตรง
                    </Button>
                    <Button variant="primary" style={{ backgroundColor: 'var(--accent-color, #16a34a)', borderColor: 'var(--accent-color, #16a34a)' }} onClick={() => setStep(3)}>
                      ถูกต้อง
                    </Button>
                  </div>
                )}

                {step === 2 && showMismatch && (
                  <div style={{ marginTop: '20px', padding: '16px', border: '1px dashed var(--warning-color, #f59e0b)', borderRadius: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning-color, #f59e0b)', display: 'block', marginBottom: '8px' }}>
                      ระบุข้อมูลแก้ไขป้อนกลับ AI
                    </label>
                    <textarea
                      style={{ 
                        width: '100%', minHeight: '90px', padding: '12px', borderRadius: '8px', 
                        border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-color)',
                        marginBottom: '12px', fontFamily: 'inherit'
                      }}
                      placeholder="พิมพ์อธิบายเพื่อแก้ไขความเข้าใจผิดของ AI..."
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={() => setShowMismatch(false)}>ยกเลิก</Button>
                      <Button variant="primary" onClick={() => handleAnalyze(true)} disabled={!feedback.trim()}>วิเคราะห์ใหม่อีกครั้ง</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        )}

        {/* Step 3: Choose Response Type */}
        {step >= 3 && step !== 6 && (
          <Card style={{ opacity: step === 3 ? 1 : 0.5 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>เลือกรูปแบบภาษาและช่องทางสำหรับตอบคำถาม</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div 
                onClick={() => { if (step === 3) { setSelectedFormat('ticket'); setStep(4); } }}
                style={{ 
                  padding: '20px', borderRadius: '8px', border: `2px solid ${selectedFormat === 'ticket' ? 'var(--primary-color, #1a73e8)' : 'var(--border-color)'}`,
                  cursor: step === 3 ? 'pointer' : 'default', backgroundColor: selectedFormat === 'ticket' ? 'rgba(26, 115, 232, 0.05)' : 'var(--bg-color)',
                  transition: 'all 0.2s'
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>คำตอบใน Ticket</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>กระชับ เป็นกันเอง ตรงประเด็น เหมาะสำหรับระบบ Ticket หรือ Chat</p>
              </div>
              <div 
                onClick={() => { if (step === 3) { setSelectedFormat('email'); setStep(4); } }}
                style={{ 
                  padding: '20px', borderRadius: '8px', border: `2px solid ${selectedFormat === 'email' ? 'var(--primary-color, #1a73e8)' : 'var(--border-color)'}`,
                  cursor: step === 3 ? 'pointer' : 'default', backgroundColor: selectedFormat === 'email' ? 'rgba(26, 115, 232, 0.05)' : 'var(--bg-color)',
                  transition: 'all 0.2s'
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>คำตอบใน Email</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>เป็นทางการ สุภาพ มีคำขึ้นต้นและลงท้ายครบถ้วน เหมาะสำหรับอีเมลทางการ</p>
              </div>
            </div>

            {step === 3 && (
              <div style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => { setStep(2); setSelectedFormat(null); }}>ย้อนกลับ</Button>
              </div>
            )}
          </Card>
        )}

        {/* Step 4: Final Response */}
        {step >= 4 && step !== 6 && selectedFormat && aiAnalysis && (
          <Card>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
              คำตอบร่างโดย AI (รูปแบบ: {selectedFormat === 'ticket' ? 'Ticket' : 'Email'})
            </h2>
            
            <div style={{ 
              padding: '20px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', 
              borderLeft: '4px solid var(--primary-color, #1a73e8)', borderTop: '1px solid var(--border-color)',
              borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)',
              marginBottom: '24px', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'monospace'
            }}>
              {selectedFormat === 'ticket' ? aiAnalysis.responseTicket : aiAnalysis.responseEmail}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setStep(3); setSelectedFormat(null); }}>ย้อนกลับ</Button>
              <Button variant="primary" onClick={() => handleCopy(selectedFormat === 'ticket' ? aiAnalysis.responseTicket : aiAnalysis.responseEmail)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอกคำตอบ'}
              </Button>
              <Button variant="primary" style={{ backgroundColor: 'var(--accent-color, #16a34a)', borderColor: 'var(--accent-color, #16a34a)' }} onClick={() => { alert('ปิดเคสเรียบร้อย บันทึกลง Log Repository แล้ว'); resetFlow(); }}>
                ปิดเคส
              </Button>
            </div>
          </Card>
        )}

        {/* State 6: Escalation Mode */}
        {step === 6 && aiAnalysis && (
          <Card style={{ borderColor: 'var(--danger-color, #ef4444)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <AlertTriangle style={{ color: 'var(--danger-color, #ef4444)' }} size={28} />
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: 'var(--danger-color, #ef4444)' }}>โหมดการส่งต่อเคส (Escalation Mode)</h2>
            </div>
            
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: 'var(--danger-color, #ef4444)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <strong>คำเตือน:</strong> {aiAnalysis.summary}
              <br/>(ระดับความมั่นใจ: {aiAnalysis.confidence}%) จึงแนะนำให้ส่งต่อเคสไปยังทีม Operation
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>ข้อความชั่วคราวแจ้งลูกค้าเพื่อรับเรื่อง</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>"รับทราบปัญหาแล้ว ทางเรากำลังประสานงานวิศวกรผู้เชี่ยวชาญตรวจสอบ..."</p>
                </div>
                <Button variant="secondary" onClick={() => handleCopy('รับทราบปัญหาแล้ว ทางเรากำลังประสานงานวิศวกรผู้เชี่ยวชาญตรวจสอบ และจะแจ้งกลับโดยเร็วที่สุด')}>คัดลอก</Button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>สรุปรายละเอียดปัญหาประสานทีม Operation</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>"เคสถูกจำแนกไม่ได้, ขอให้ตรวจสอบด่วน..."</p>
                </div>
                <Button variant="secondary" onClick={() => handleCopy(`Escalation Report\nProblem: ${problem}\nConfidence: ${aiAnalysis.confidence}%\nNeed advanced investigation.`)}>คัดลอก</Button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button variant="ghost" onClick={resetFlow}>ยกเลิกและเริ่มต้นใหม่</Button>
              <Button style={{ backgroundColor: 'var(--danger-color, #ef4444)', color: '#fff', border: 'none' }} onClick={() => { alert('ส่งต่อเคสไปยัง Operation เรียบร้อย'); resetFlow(); }}>
                ปิดเคสแบบส่งต่อ (Escalated)
              </Button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
