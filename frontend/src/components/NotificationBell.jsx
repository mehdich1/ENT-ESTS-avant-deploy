import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, BookOpen, FileText, Mail, Calendar, Star, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HOST = window.location.hostname;

const EventIcon = ({ type }) => {
  const icons = {
    new_course: <BookOpen size={16} />,
    new_exam: <FileText size={16} />,
    new_message: <Mail size={16} />,
    new_event: <Calendar size={16} />,
    exam_graded: <Star size={16} />,
    submission_received: <Send size={16} />,
  };
  return icons[type] || <Bell size={16} />;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`http://${HOST}/api/notifications?size=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        setUnread(data.unread || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await fetch(`http://${HOST}/api/notifications/${id}/read`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`http://${HOST}/api/notifications/read-all`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`http://${HOST}/api/notifications/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnread(prev => {
        const notif = notifications.find(n => n.id === id);
        return notif && !notif.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch {}
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.link) { navigate(notif.link); setOpen(false); }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: 10, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#f87171', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--green-900)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 44, left: 0, width: 340, background: '#0d2b0d', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(74,222,128,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Notifications {unread > 0 && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: 6, padding: '2px 6px', marginLeft: 6 }}>{unread} non lue(s)</span>}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button onClick={markAllRead}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <CheckCheck size={14} /> Tout lire
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Aucune notification</p>
              </div>
            )}
            {notifications.map(notif => (
              <div key={notif.id}
                onClick={() => handleClick(notif)}
                style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', background: notif.is_read ? 'transparent' : 'rgba(74,222,128,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(74,222,128,0.04)'}
              >
                <span style={{ flexShrink: 0, color: 'var(--accent)', marginTop: 2 }}>
                  <EventIcon type={notif.event_type} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: notif.is_read ? 400 : 600, color: 'var(--text-primary)', margin: 0, marginBottom: 2 }}>
                    {notif.title}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notif.message}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                    {new Date(notif.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  {!notif.is_read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 2 }} />
                  )}
                  <button onClick={(e) => deleteNotif(notif.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.4)', padding: 2, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}