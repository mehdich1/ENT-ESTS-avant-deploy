import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Lock, User } from 'lucide-react';

export default function Login() {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await handleLogin(username, password);
      navigate('/dashboard');
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--green-900)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse at 15% 50%, rgba(29, 94, 29, 0.35) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 20%, rgba(45, 122, 45, 0.2) 0%, transparent 45%),
          radial-gradient(ellipse at 60% 80%, rgba(10, 31, 10, 0.8) 0%, transparent 60%)
        `
      }} />

      {/* Decorative grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 80px', position: 'relative', zIndex: 1
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'fadeInUp 0.6s ease forwards'
        }}>
          <div style={{
            width: 120, height: 120,
            background: 'rgba(74, 222, 128, 0.06)',
            border: '1px solid rgba(74, 222, 128, 0.2)',
            borderRadius: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 28,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(74,222,128,0.08)'
          }}>
            <img src="/logo.webp" alt="EST Salé" style={{ width: 90, height: 90, objectFit: 'contain' }} />
          </div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 42, fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.15, textAlign: 'center', marginBottom: 12
          }}>
            EST Salé
          </h1>
          <p style={{
            fontSize: 14, color: 'var(--text-secondary)',
            textAlign: 'center', lineHeight: 1.7, maxWidth: 340,
            letterSpacing: '0.3px'
          }}>
            École Supérieure de Technologie de Salé<br />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Espace Numérique de Travail — Plateforme pédagogique
            </span>
          </p>

          {/* Decorative line */}
          <div style={{
            marginTop: 36, display: 'flex', alignItems: 'center', gap: 12, width: 280
          }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(74,222,128,0.3))' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(74,222,128,0.3))' }} />
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, marginTop: 36 }}>
            {[
              { label: 'Étudiants', value: '2000+' },
              { label: 'Enseignants', value: '80+' },
              { label: 'Filières', value: '13' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 24, fontWeight: 700, color: 'var(--accent)'
                }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(74,222,128,0.2), transparent)',
        position: 'relative', zIndex: 1, alignSelf: 'stretch', margin: '60px 0'
      }} />

      {/* Right panel — Login form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '60px 80px', position: 'relative', zIndex: 1
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          animation: 'fadeInUp 0.6s 0.2s ease both'
        }}>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 28, fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: 8
          }}>
            Connexion
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
            Accédez à votre espace de travail
          </p>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 10, padding: '12px 16px',
              marginBottom: 20, fontSize: 13, color: '#f87171',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 16 }}>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Nom d'utilisateur
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }} />
                <input
                  className="input"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }} />
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                marginTop: 8, padding: '14px',
                fontSize: 15, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            © {new Date().getFullYear()} École Supérieure de Technologie de Salé
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}