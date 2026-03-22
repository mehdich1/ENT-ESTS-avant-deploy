import { useState, useEffect } from 'react';
import { getEvents, createEvent, deleteEvent } from '../services/api';
import Sidebar from '../components/Layout/Sidebar';
import { Calendar as CalendarIcon, Plus, Clock, X, Trash2 } from 'lucide-react';

const getRoles = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return [];
    return JSON.parse(atob(token.split('.')[1]))?.realm_access?.roles || [];
  } catch { return []; }
};

const getUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]))?.sub || null;
  } catch { return null; }
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = getRoles();
  const userId = getUserId();
  const isEnseignant = roles.includes('enseignant');
  const isAdmin = roles.includes('admin');
  const canCreate = isEnseignant || isAdmin;

  const load = () =>
    getEvents()
      .then(res => setEvents(res.data.items || []))
      .catch(() => setError('Erreur de chargement'));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createEvent({ title, description, start_time: startTime, end_time: endTime });
      await load();
      setTitle(''); setDescription(''); setStartTime(''); setEndTime('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création');
    }
    setLoading(false);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    try {
      await deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch { setError('Erreur lors de la suppression'); }
  };

  const colorByIndex = ['#4ade80', '#60a5fa', '#f59e0b', '#a78bfa', '#f87171'];

  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, animation: 'fadeInUp 0.5s ease forwards' }}>
          <div>
            <h1 className="page-title">Calendrier</h1>
            <p className="page-subtitle">{events.length} événement(s) programmé(s)</p>
          </div>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showForm ? <><X size={15} /> Annuler</> : <><Plus size={15} /> Nouvel événement</>}
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        {canCreate && showForm && (
          <div className="card" style={{ padding: 28, marginBottom: 24, animation: 'fadeInUp 0.3s ease forwards' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 20 }}>Ajouter un événement</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" placeholder="Titre de l'événement" value={title} onChange={e => setTitle(e.target.value)} required />
              <textarea className="input" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ resize: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Début</label>
                  <input className="input" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Fin</label>
                  <input className="input" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Enregistrement...' : <><Plus size={15} /> Ajouter l'événement</>}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.length === 0 && !showForm && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <CalendarIcon size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucun événement programmé.</p>
            </div>
          )}
          {events.map((event, i) => (
            <div key={event.id} className="card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start', animation: `fadeInUp 0.4s ${i * 0.05}s ease both` }}>
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: colorByIndex[i % 5], flexShrink: 0, minHeight: 50 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{event.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{event.description}</p>
                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} /> Début : {new Date(event.start_time).toLocaleString('fr-FR')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} /> Fin : {new Date(event.end_time).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
              {(isAdmin || (canCreate && event.created_by === userId)) && (
                <button onClick={() => handleDelete(event.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 10px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}