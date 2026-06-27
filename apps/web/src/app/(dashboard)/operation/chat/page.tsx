'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button/Button';
import { Send, Bot } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export default function OperationChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยวิเคราะห์ระบบ Operation\nคุณสามารถพิมพ์คำถาม หรือวาง Log เพื่อให้ผมช่วยตรวจสอบได้เลยครับ'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI service is not available right now.');
      }
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.text || 'ไม่สามารถตอบกลับได้ในขณะนี้'
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: err instanceof Error ? err.message : 'Unable to connect to the AI service right now.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary-color, #1a73e8)' }}></div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>ห้องสนทนาวิเคราะห์ปัญหา (Free Chat)</h2>
        </div>
        <Button variant="primary" style={{ backgroundColor: 'var(--accent-color, #16a34a)', borderColor: 'var(--accent-color, #16a34a)' }} onClick={() => alert('ปิดเคสนี้เรียบร้อยแล้ว')}>ปิดเคสนี้</Button>
      </div>

      {/* Messages Area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        backgroundColor: 'var(--panel-bg)', 
        borderRadius: '12px 12px 0 0', 
        border: '1px solid var(--border-color)',
        borderBottom: 'none',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ 
            display: 'flex', 
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: '12px'
          }}>
            {msg.role === 'ai' && (
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: '1px solid var(--border-color)'
              }}>
                <Bot size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            
            <div style={{ 
              backgroundColor: msg.role === 'user' ? 'var(--primary-color, #1a73e8)' : 'var(--bg-color)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-color)',
              padding: '12px 16px',
              borderRadius: '12px',
              borderTopLeftRadius: msg.role === 'ai' ? '0' : '12px',
              borderTopRightRadius: msg.role === 'user' ? '0' : '12px',
              maxWidth: '80%',
              border: msg.role === 'ai' ? '1px solid var(--border-color)' : 'none',
              borderLeft: msg.role === 'ai' ? '4px solid var(--primary-color, #1a73e8)' : 'none',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5'
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px' }}>
             <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: '1px solid var(--border-color)'
              }}>
                <Bot size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
            <div style={{ 
              backgroundColor: 'var(--bg-color)',
              padding: '12px 16px',
              borderRadius: '0 12px 12px 12px',
              border: '1px solid var(--border-color)',
              borderLeft: '4px solid var(--primary-color, #1a73e8)',
              color: 'var(--text-muted)'
            }}>
              กำลังพิมพ์...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ 
        backgroundColor: 'var(--panel-bg)',
        padding: '16px',
        borderRadius: '0 0 12px 12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        gap: '12px'
      }}>
        <textarea
          style={{ 
            flex: 1, 
            minHeight: '44px',
            maxHeight: '120px', 
            padding: '10px 14px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)', 
            backgroundColor: 'var(--bg-color)', 
            color: 'var(--text-color)',
            resize: 'none',
            fontFamily: 'inherit'
          }}
          placeholder="พิมพ์ถามคำถาม หรือ วาง log เพื่อให้ AI ช่วยวิเคราะห์..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button 
          variant="primary" 
          onClick={handleSendMessage} 
          disabled={loading || !inputValue.trim()}
          style={{ alignSelf: 'flex-end', height: '44px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>ส่งข้อความ</span>
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
