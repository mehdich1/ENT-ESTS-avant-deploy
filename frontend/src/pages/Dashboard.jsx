import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import { BookOpen, Calendar, Mail, MessageSquare, ClipboardList, ArrowRight, GraduationCap, HelpCircle } from 'lucide-react';

const menuItems = [
  {
    label: 'Cours', path: '/courses', icon: BookOpen,
    description: 'Accédez à vos cours et ressources pédagogiques',
    color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)'
  },
  {
    label: 'Calendrier', path: '/calendar', icon: Calendar,
    description: 'Consultez votre emploi du temps et événements',
    color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)'
  },
  {
    label: 'Messagerie', path: '/messaging', icon: Mail,
    description: 'Communiquez avec vos enseignants et collègues',
    color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)'
  },
  {
    label: 'Chat', path: '/chat', icon: MessageSquare,
    description: 'Discussion en temps réel avec votre promotion',
    color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.08)'
  },
  {
    label: 'Examens', path: '/exams', icon: ClipboardList,
    description: 'Soumettez vos devoirs et consultez vos notes',
    color: '#f87171', bg: 'rgba(248, 113, 113, 0.08)'
  },
  {
    label: 'Assistance ENT', path: '/faq', icon: HelpCircle,
    description: 'Foire aux questions sur votre Espace Numérique de Travail',
    color: '#34d399', bg: 'rgba(52, 211, 153, 0.08)'
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 36, animation: 'fadeInUp 0.5s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--green-500), var(--green-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <GraduationCap size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: 'var(--text-primary)' }}>
                {greeting}, <span style={{ color: 'var(--accent)' }}>{user?.username}</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Bienvenue sur votre espace numérique de travail
              </p>
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20
        }}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.path}
                className="card"
                onClick={() => navigate(item.path)}
                style={{
                  padding: 24, cursor: 'pointer',
                  animation: `fadeInUp 0.5s ${i * 0.07}s ease both`
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: item.bg,
                  border: `1px solid ${item.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <Icon size={20} color={item.color} strokeWidth={2} />
                </div>
                <h3 style={{
                  fontSize: 16, fontWeight: 600,
                  color: 'var(--text-primary)', marginBottom: 6
                }}>
                  {item.label}
                </h3>
                <p style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, marginBottom: 18
                }}>
                  {item.description}
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: item.color, fontWeight: 500
                }}>
                  Accéder <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info banner */}
        <div style={{
          marginTop: 28, padding: '18px 24px',
          background: 'rgba(74, 222, 128, 0.05)',
          border: '1px solid rgba(74, 222, 128, 0.12)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'fadeInUp 0.5s 0.4s ease both'
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(74, 222, 128, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <img src="/logo.webp" alt="EST" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              École Supérieure de Technologie de Salé
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Plateforme ENT — Année universitaire 2025/2026
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className="badge badge-green">En ligne</span>
          </div>
        </div>
      </main>
    </div>
  );
}