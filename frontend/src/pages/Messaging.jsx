import { useState, useEffect } from 'react';
import { getInbox, getSent, sendMessage, deleteMessage, getUsers } from '../services/api';
import Sidebar from '../components/Layout/Sidebar';
import { Mail, Send, Inbox, Trash2, Plus, X, Reply } from 'lucide-react';

const getUsername = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1]))?.preferred_username || ''; }
  catch { return ''; }
};
const getUserId = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1]))?.sub || null; }
  catch { return null; }
};
const getRoles = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1]))?.realm_access?.roles || []; }
  catch { return []; }
};

export default function Messaging() {
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
  const [receiverUsername, setReceiverUsername] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, sender_id, sender_name }
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const currentUsername = getUsername();
  const currentUserId = getUserId();
  const isAdmin = getRoles().includes('admin');

  const loadAll = () => {
    getInbox().then(res => setInbox(res.data.items || [])).catch(() => {});
    getSent().then(res => setSent(res.data.items || [])).catch(() => {});
    getUsers().then(res => setUsers(res.data.items || [])).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const resolveUsername = (id) => {
    const u = users.find(u => u.id === id);
    return u ? (u.preferred_username || u.username || id) : id?.slice(0, 8) + '...';
  };

  const handleReply = (msg) => {
    const senderName = resolveUsername(msg.sender_id);
    setReplyTo({ id: msg.id, sender_id: msg.sender_id, sender_name: senderName });
    setReceiverUsername(senderName);
    setContent('');
    setShowForm(true);
    setTab('inbox');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!receiverUsername.trim()) { setError('Veuillez sélectionner un destinataire'); return; }
    const receiver = users.find(u =>
      u.preferred_username === receiverUsername || u.username === receiverUsername
    );
    if (!receiver) { setError(`Utilisateur "${receiverUsername}" introuvable`); return; }
    if (receiver.id === currentUserId) { setError('Vous ne pouvez pas vous envoyer un message'); return; }

    setLoading(true);
    try {
      await sendMessage({ receiver_id: receiver.id, content });
      await loadAll();
      setContent(''); setReceiverUsername(''); setReplyTo(null); setShowForm(false);
      setSuccess('Message envoyé');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
    setLoading(false);
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await deleteMessage(msgId);
      setInbox(prev => prev.filter(m => m.id !== msgId));
      setSent(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const items = tab === 'inbox' ? inbox : sent;

  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, animation: 'fadeInUp 0.5s ease forwards' }}>
          <div>
            <h1 className="page-title">Messagerie</h1>
            <p className="page-subtitle">{currentUsername}</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setReplyTo(null); setReceiverUsername(''); setContent(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {showForm ? <><X size={15} /> Annuler</> : <><Plus size={15} /> Nouveau message</>}
          </button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#4ade80' }}>{success}</div>}

        {showForm && (
          <div className="card" style={{ padding: 28, marginBottom: 24, animation: 'fadeInUp 0.3s ease forwards' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              {replyTo ? <><Reply size={16} /> Répondre à {replyTo.sender_name}</> : <><Send size={16} /> Nouveau message</>}
            </h3>
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Destinataire</label>
                {users.length > 0 ? (
                  <select className="input" value={receiverUsername} onChange={e => setReceiverUsername(e.target.value)} required style={{ cursor: 'pointer' }}>
                    <option value="">-- Sélectionner --</option>
                    {users.filter(u => (u.preferred_username || u.username) !== currentUsername).map(u => (
                      <option key={u.id} value={u.preferred_username || u.username}>
                        {u.preferred_username || u.username} — {u.name || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input" placeholder="Nom d'utilisateur" value={receiverUsername} onChange={e => setReceiverUsername(e.target.value)} required />
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea className="input" placeholder="Votre message..." value={content} onChange={e => setContent(e.target.value)} rows={4} style={{ resize: 'none' }} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Envoi...' : <><Send size={15} /> Envoyer</>}
              </button>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'inbox', label: 'Reçus', icon: Inbox, count: inbox.length },
            { key: 'sent', label: 'Envoyés', icon: Send, count: sent.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: tab === key ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
              color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              <Icon size={14} /> {label}
              <span style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--accent)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <Mail size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tab === 'inbox' ? 'Aucun message reçu.' : 'Aucun message envoyé.'}</p>
            </div>
          )}
          {items.map((msg, i) => (
            <div key={msg.id} className="card" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start', animation: `fadeInUp 0.4s ${i * 0.04}s ease both` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={16} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {tab === 'inbox' ? `De : ${resolveUsername(msg.sender_id)}` : `À : ${resolveUsername(msg.receiver_id)}`}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {new Date(msg.sent_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-word' }}>{msg.content}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {tab === 'inbox' && (
                  <button onClick={() => handleReply(msg)} title="Répondre"
                    style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 7, padding: '5px 9px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Reply size={13} /> Répondre
                  </button>
                )}
                {(isAdmin || msg.sender_id === currentUserId || msg.receiver_id === currentUserId) && (
                  <button onClick={() => handleDelete(msg.id)} title="Supprimer"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, padding: '5px 9px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}