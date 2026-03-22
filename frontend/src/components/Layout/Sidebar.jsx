import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import {
  LayoutDashboard, BookOpen, Calendar, Mail,
  MessageSquare, ClipboardList, LogOut, GraduationCap, HelpCircle
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Cours', path: '/courses', icon: BookOpen },
  { label: 'Calendrier', path: '/calendar', icon: Calendar },
  { label: 'Messagerie', path: '/messaging', icon: Mail },
  { label: 'Chat', path: '/chat', icon: MessageSquare },
  { label: 'Examens & Devoirs', path: '/exams', icon: ClipboardList },
  { label: 'Assistance ENT', path: '/faq', icon: HelpCircle },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, handleLogout } = useAuth();

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      background: 'linear-gradient(180deg, #0a1f0a 0%, #0d2b0d 100%)',
      borderRight: '1px solid rgba(74, 222, 128, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '4px 0 24px rgba(0,0,0,0.3)'
    }}>
      {/* Logo + cloche */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(74, 222, 128, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 44, height: 44,
          background: 'rgba(74, 222, 128, 0.08)',
          border: '1px solid rgba(74, 222, 128, 0.2)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0
        }}>
          <img src="/logo.webp" alt="EST Salé" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, color: '#f0faf0', lineHeight: 1.2 }}>EST Salé</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: 2 }}>Espace Numérique</div>
        </div>
        {/* Cloche notifications */}
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: active ? 'rgba(74, 222, 128, 0.12)' : 'transparent',
                border: active ? '1px solid rgba(74, 222, 128, 0.25)' : '1px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.2s ease',
                textAlign: 'left', width: '100%'
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(74, 222, 128, 0.06)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {item.label}
              {active && (
                <div style={{
                  marginLeft: 'auto', width: 6, height: 6,
                  borderRadius: '50%', background: 'var(--accent)'
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(74, 222, 128, 0.08)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)', marginBottom: 8
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--green-500), var(--green-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <GraduationCap size={16} color="#fff" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connecté</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 14px', borderRadius: 10, width: '100%',
            background: 'transparent', border: '1px solid transparent',
            color: '#f87171', cursor: 'pointer', fontSize: 13,
            fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}