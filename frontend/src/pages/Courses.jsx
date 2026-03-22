import { useState, useEffect } from 'react';
import { getCourses, createCourse, downloadCourse, deleteCourse } from '../services/api';
import Sidebar from '../components/Layout/Sidebar';
import { BookOpen, Upload, Download, FileText, Plus, X, Trash2 } from 'lucide-react';

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

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const roles = getRoles();
  const userId = getUserId();
  const isEnseignant = roles.includes('enseignant');
  const isAdmin = roles.includes('admin');
  const canCreate = isEnseignant || isAdmin;

  const load = () =>
    getCourses()
      .then(res => setCourses(res.data.items || []))
      .catch(() => setError('Erreur de chargement'));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    try {
      await createCourse(formData);
      await load();
      setTitle(''); setDescription(''); setFile(null); setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création');
    }
    setLoading(false);
  };

const getExtFromUrl = (url) => {
  if (!url) return '';
  const part = url.split('/').pop().split('?')[0];
  const dot = part.lastIndexOf('.');
  return dot !== -1 ? part.slice(dot) : '';
};

const handleDownload = async (courseId, title, fileUrl = '') => {
  try {
    const res = await downloadCourse(courseId);
    const contentType = res.headers['content-type'] || 'application/octet-stream';
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    let filename = match ? match[1] : title || 'cours';
    if (!filename.includes('.')) {
      const extFromUrl = getExtFromUrl(fileUrl);
      const MIME_TO_EXT = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/zip': '.zip',
        'image/jpeg': '.jpg',
        'image/png': '.png',
      };
      filename += extFromUrl || MIME_TO_EXT[contentType.split(';')[0].trim()] || '';
    }
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch { setError('Erreur de téléchargement'); }
};

  const handleDelete = async (courseId) => {
    if (!window.confirm('Supprimer ce cours ?')) return;
    try {
      await deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch { setError('Erreur lors de la suppression'); }
  };

  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, animation: 'fadeInUp 0.5s ease forwards' }}>
          <div>
            <h1 className="page-title">Gestion des Cours</h1>
            <p className="page-subtitle">{courses.length} cours disponibles</p>
          </div>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showForm ? <><X size={15} /> Annuler</> : <><Plus size={15} /> Nouveau cours</>}
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
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={16} /> Publier un nouveau cours
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" placeholder="Titre du cours" value={title} onChange={e => setTitle(e.target.value)} required />
              <textarea className="input" placeholder="Description du cours" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
              <div style={{ border: '2px dashed rgba(74,222,128,0.2)', borderRadius: 10, padding: '20px', textAlign: 'center', background: file ? 'rgba(74,222,128,0.05)' : 'transparent' }}>
                <input type="file" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} id="file-upload" accept=".pdf,.doc,.docx,.pptx,.xlsx,.zip,.jpg,.png" />
                <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                  <FileText size={24} color={file ? 'var(--accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: file ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {file ? file.name : 'Cliquez pour sélectionner un fichier'}
                  </p>
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Publication...' : <><Upload size={15} /> Publier le cours</>}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {courses.length === 0 && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucun cours disponible pour le moment.</p>
            </div>
          )}
          {courses.map((course, i) => (
            <div key={course.id} className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeInUp 0.4s ${i * 0.05}s ease both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color="var(--accent)" />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{course.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{course.description}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-secondary" onClick={() => handleDownload(course.id, course.title, course.file_url)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={14} /> Télécharger
                </button>
                {(isAdmin || (isEnseignant && course.teacher_id === userId)) && (
                  <button onClick={() => handleDelete(course.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 12px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <Trash2 size={13} /> Supprimer
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