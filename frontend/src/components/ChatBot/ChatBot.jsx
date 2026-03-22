import { useState, useRef, useEffect } from 'react';
import { askOllama } from '../../services/api';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Bonjour ! Je suis l\'assistant IA de l\'EST Salé. Comment puis-je vous aider ?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const response = await askOllama(input);
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Service IA temporairement indisponible.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000 }}>
      {open && (
        <div style={{
          width: 360, height: 500,
          background: 'linear-gradient(180deg, #0d2b0d 0%, #0a1f0a 100%)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,222,128,0.05)',
          display: 'flex', flexDirection: 'column',
          marginBottom: 16,
          animation: 'fadeInUp 0.3s ease forwards',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, #0d2b0d, #0a1f0a)',
            borderBottom: '1px solid rgba(74,222,128,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={16} color="#4ade80" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0fdf4' }}>Assistant IA</div>
                <div style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                  Llama 3 — EST Salé
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: 6, cursor: 'pointer', color: '#f0fdf4',
              display: 'flex', alignItems: 'center'
            }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
                {msg.role === 'bot' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={13} color="#4ade80" />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%', padding: '10px 13px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'user' ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(74,222,128,0.1)',
                  fontSize: 13, color: '#f0fdf4', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={13} color="#fff" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={13} color="#4ade80" />
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px 14px 14px 4px', border: '1px solid rgba(74,222,128,0.1)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#4ade80',
                      animation: `bounce 1s ${j * 0.15}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(74,222,128,0.08)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Posez votre question..."
              style={{
                flex: 1, padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(74,222,128,0.15)',
                borderRadius: 12, color: '#f0fdf4',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none'
              }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#22c55e',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: !input.trim() || loading ? 0.5 : 1,
                flexShrink: 0
              }}>
              <Send size={14} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 54, height: 54, borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid rgba(74,222,128,0.3)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(74,222,128,0.2)',
          transition: 'transform 0.2s ease',
          marginLeft: 'auto'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </button>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}