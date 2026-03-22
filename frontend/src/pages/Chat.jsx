import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { MessageSquare, Send, Hash, LogOut, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HOST = window.location.hostname;

const getRoles = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1]))?.realm_access?.roles || []; }
  catch { return []; }
};

export default function Chat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomRestricted, setNewRoomRestricted] = useState('all');
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const token = localStorage.getItem('token');
  const username = user?.username || localStorage.getItem('username');
  const roles = getRoles();
  const isAdmin = roles.includes('admin');

  const loadRooms = async () => {
    try {
      const res = await fetch(`http://${HOST}/api/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRooms(await res.json());
    } catch {}
  };

  useEffect(() => {
    loadRooms();
    return () => {
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = (room) => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    setMessages([]); setConnected(false); setSelectedRoom(room);

    const ws = new WebSocket(`ws://${HOST}/ws/chat/ws/${room.id}?token=${token}`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try { setMessages(prev => [...prev, JSON.parse(e.data)]); }
      catch {}
    };
    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnected(false); setSelectedRoom(null); setMessages([]);
  };

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || !connected) return;
    wsRef.current.send(input);
    setInput('');
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`http://${HOST}/api/chat/rooms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDesc.trim(), restricted_to: newRoomRestricted })
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail || 'Erreur'); return; }
      await loadRooms();
      setNewRoomName(''); setNewRoomDesc(''); setNewRoomRestricted('all'); setShowNewRoom(false);
    } catch { setError('Erreur réseau'); }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Supprimer la room #${room.name} et tous ses messages ?`)) return;
    if (selectedRoom?.id === room.id) disconnect();
    try {
      await fetch(`http://${HOST}/api/chat/rooms/${room.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadRooms();
    } catch {}
  };

  const deleteMessage = async (msgId) => {
    await fetch(`http://${HOST}/api/chat/messages/${msgId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const isMyMessage = (msg) => msg.sender === username;

  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 24, animation: 'fadeInUp 0.5s ease forwards' }}>
          <h1 className="page-title">Chat en temps réel</h1>
          <p className="page-subtitle">Communication instantanée avec votre promotion</p>
        </div>

        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>

          {/* Sidebar rooms */}
          <div className="card" style={{ width: 220, flexShrink: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(74,222,128,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rooms</span>
              {isAdmin && (
                <button onClick={() => setShowNewRoom(!showNewRoom)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                  {showNewRoom ? <X size={15} /> : <Plus size={15} />}
                </button>
              )}
            </div>

            {isAdmin && showNewRoom && (
              <form onSubmit={handleCreateRoom} style={{ padding: '12px 14px', borderBottom: '1px solid rgba(74,222,128,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {error && <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>{error}</p>}
                <input className="input" placeholder="Nom de la room" value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)} required
                  style={{ fontSize: 12, padding: '6px 10px' }} />
                <input className="input" placeholder="Description (optionnel)" value={newRoomDesc}
                  onChange={e => setNewRoomDesc(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px' }} />
                <select className="input" value={newRoomRestricted}
                  onChange={e => setNewRoomRestricted(e.target.value)}
                  style={{ fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
                  <option value="all">Tous</option>
                  <option value="enseignant">Enseignants uniquement</option>
                  <option value="etudiant">Etudiants uniquement</option>
                  <option value="admin">Admin uniquement</option>
                </select>
                <button type="submit" className="btn-primary" style={{ fontSize: 12, padding: '6px 10px' }}>
                  Créer
                </button>
              </form>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rooms.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px', textAlign: 'center' }}>
                  Aucune room disponible
                </p>
              )}
              {rooms.map(room => (
                <div key={room.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', cursor: 'pointer',
                  background: selectedRoom?.id === room.id ? 'rgba(74,222,128,0.08)' : 'transparent',
                  borderLeft: selectedRoom?.id === room.id ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                  onClick={() => connect(room)}
                >
                  <Hash size={13} color={selectedRoom?.id === room.id ? 'var(--accent)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: selectedRoom?.id === room.id ? 600 : 400, color: selectedRoom?.id === room.id ? 'var(--accent)' : 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.name}
                    </p>
                    {room.description && (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.description}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); handleDeleteRoom(room); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Zone chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                borderRadius: 10, border: '1px solid',
                borderColor: connected ? 'rgba(74,222,128,0.3)' : 'rgba(100,100,100,0.2)',
                background: connected ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                flex: 1
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--accent)' : '#555', flexShrink: 0 }} />
                <Hash size={13} color={connected ? 'var(--accent)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 13, fontWeight: 500, color: connected ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {selectedRoom ? selectedRoom.name : 'Sélectionnez une room'}
                </span>
              </div>
              {connected && (
                <button onClick={disconnect} className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', flexShrink: 0 }}>
                  <LogOut size={14} /> Quitter
                </button>
              )}
            </div>

            <div className="card" style={{ flex: 1, minHeight: 380, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!selectedRoom && (
                  <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <MessageSquare size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choisissez une room pour commencer</p>
                  </div>
                )}
                {selectedRoom && messages.length === 0 && (
                  <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun message dans #{selectedRoom.name}</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  if (msg.type === 'system') return (
                    <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '2px 0' }}>
                      {msg.content}
                    </div>
                  );
                  const mine = isMyMessage(msg);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                      {!mine && (
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                          {msg.sender?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ maxWidth: '70%' }}>
                        {!mine && (
                          <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 3, fontWeight: 600 }}>
                            {msg.sender}
                            {msg.is_history && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>historique</span>}
                          </div>
                        )}
                        <div style={{ position: 'relative' }}>
                          <div style={{ padding: '10px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? 'linear-gradient(135deg, var(--green-500), var(--green-400))' : 'rgba(255,255,255,0.05)', border: mine ? 'none' : '1px solid rgba(74,222,128,0.1)', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            {msg.content}
                          </div>
                          {isAdmin && msg.id && (
                            <button onClick={() => deleteMessage(msg.id)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.8)', border: 'none', cursor: 'pointer', fontSize: 10, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={10} />
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                          {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                      {mine && (
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: '#fff', fontWeight: 700 }}>
                          {username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(74,222,128,0.08)', display: 'flex', gap: 10 }}>
                <input className="input" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={connected ? `Message dans #${selectedRoom?.name}...` : 'Sélectionnez une room...'}
                  disabled={!connected} />
                <button onClick={sendMessage} disabled={!connected || !input.trim()} className="btn-primary"
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, opacity: (!connected || !input.trim()) ? 0.5 : 1 }}>
                  <Send size={15} /> Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}