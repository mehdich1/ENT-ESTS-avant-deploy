import { useState, useEffect } from 'react';
import { getExams, createExam, deleteExam, getCourses, submitExam, cancelSubmission, getSubmissions, getMySubmission, gradeSubmission, getUsers } from '../services/api';
import Sidebar from '../components/Layout/Sidebar';
import { ClipboardList, Plus, X, Upload, FileText, Trash2, ChevronDown, ChevronUp, Star, CheckCircle, Download } from 'lucide-react';

const HOST = window.location.hostname;
const getRoles = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1]))?.realm_access?.roles || []; }
  catch { return []; }
};
const getUserId = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1]))?.sub || null; }
  catch { return null; }
};

const getExtFromUrl = (url) => {
  if (!url) return '';
  const part = url.split('/').pop().split('?')[0];
  const dot = part.lastIndexOf('.');
  return dot !== -1 ? part.slice(dot) : '';
};

const downloadFile = async (url, filename, fileUrl = '') => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Erreur téléchargement');
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  let name = match ? match[1] : filename;
  if (!name.includes('.')) {
    const extFromUrl = getExtFromUrl(fileUrl);
    const MIME_TO_EXT = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/zip': '.zip',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    };
    name += extFromUrl || MIME_TO_EXT[blob.type] || '';
  }
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(a.href);
};

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedExam, setExpandedExam] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [submitFile, setSubmitFile] = useState({});
  const [grades, setGrades] = useState({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [file, setFile] = useState(null);

  const roles = getRoles();
  const userId = getUserId();
  const isEnseignant = roles.includes('enseignant');
  const isAdmin = roles.includes('admin');
  const isEtudiant = roles.includes('etudiant');
  const canManage = isEnseignant || isAdmin;

  const resolveUsername = (id) => {
    const u = users.find(u => u.id === id);
    return u ? (u.preferred_username || u.username || u.name || id) : id?.slice(0, 8) + '...';
  };

  const load = async () => {
    try {
      const res = await getExams();
      setExams(res.data.items || []);
    } catch { setError('Erreur de chargement'); }
  };

  useEffect(() => {
    const init = async () => {
      await load();
      getUsers().then(res => setUsers(res.data.items || [])).catch(() => {});
      if (canManage) getCourses().then(res => setCourses(res.data.items || [])).catch(() => {});
    };
    init();
  }, []);

  // Charger la soumission de l'étudiant pour chaque examen via route dédiée
  useEffect(() => {
    if (!isEtudiant || exams.length === 0) return;
    exams.forEach(exam => {
      getMySubmission(exam.id)
        .then(res => {
          const { found, submission } = res.data;
          setMySubmissions(prev => ({ ...prev, [exam.id]: found ? submission : null }));
        })
        .catch(() => {});
    });
  }, [exams]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('title', title); fd.append('description', description);
    fd.append('course_id', courseId); fd.append('deadline', deadline);
    fd.append('file', file);
    try {
      await createExam(fd);
      await load();
      setTitle(''); setDescription(''); setCourseId(''); setDeadline(''); setFile(null); setShowForm(false);
      setSuccess('Examen créé'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.detail || 'Erreur création'); }
    setLoading(false);
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Supprimer cet examen ?')) return;
    try { await deleteExam(examId); setExams(prev => prev.filter(e => e.id !== examId)); }
    catch { setError('Erreur suppression'); }
  };

  const loadSubmissions = async (examId) => {
    try {
      if (canManage) {
        const res = await getSubmissions(examId);
        const items = res.data.items || [];
        setSubmissions(prev => ({ ...prev, [examId]: items }));
        return items;
      } else {
        // Étudiant — route dédiée
        const res = await getMySubmission(examId);
        const { found, submission } = res.data;
        setMySubmissions(prev => ({ ...prev, [examId]: found ? submission : null }));
        return found ? [submission] : [];
      }
    } catch { return []; }
  };

  const handleExpand = async (examId) => {
    if (expandedExam === examId) { setExpandedExam(null); return; }
    setExpandedExam(examId);
    await loadSubmissions(examId);
  };

  const handleSubmit = async (examId) => {
    const f = submitFile[examId];
    if (!f) return;
    setLoading(true); setError('');
    const fd = new FormData(); fd.append('file', f);
    try {
      await submitExam(examId, fd);
      setSuccess('Devoir soumis'); setTimeout(() => setSuccess(''), 3000);
      setSubmitFile(prev => ({ ...prev, [examId]: null }));
      await loadSubmissions(examId);
    } catch (err) { setError(err.response?.data?.detail || 'Erreur soumission'); }
    setLoading(false);
  };

  const handleCancelSubmit = async (examId) => {
    if (!window.confirm('Annuler votre rendu ?')) return;
    setError('');
    try {
      await cancelSubmission(examId);
      setMySubmissions(prev => ({ ...prev, [examId]: null }));
      setSubmissions(prev => ({
        ...prev,
        [examId]: (prev[examId] || []).filter(s => s.student_id !== userId)
      }));
      setSuccess('Rendu annulé'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.detail || 'Erreur annulation'); }
  };

  const handleGrade = async (submissionId, examId) => {
    const grade = parseFloat(grades[submissionId]);
    if (isNaN(grade) || grade < 0 || grade > 20) { setError('Note invalide (0-20)'); return; }
    try {
      await gradeSubmission(submissionId, grade);
      setSubmissions(prev => ({
        ...prev, [examId]: prev[examId].map(s => s.id === submissionId ? { ...s, grade } : s)
      }));
      setSuccess('Note attribuée'); setTimeout(() => setSuccess(''), 2000);
    } catch { setError('Erreur notation'); }
  };

const handleDownloadExam = async (exam) => {
  try { await downloadFile(`http://${HOST}/api/exams/${exam.id}/download`, exam.title, exam.file_url); }
  catch { setError('Erreur téléchargement sujet'); }
};

const handleDownloadSubmission = async (sub) => {
  try { await downloadFile(`http://${HOST}/api/exams/submissions/${sub.id}/download`, `rendu_${sub.student_id.slice(0,8)}`, sub.file_url); }
  catch { setError('Erreur téléchargement rendu'); }
};

  const isDeadlinePassed = (dl) => dl && new Date(dl) < new Date();
  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, animation: 'fadeInUp 0.5s ease forwards' }}>
          <div>
            <h1 className="page-title">Examens & Devoirs</h1>
            <p className="page-subtitle">{exams.length} examen(s) disponible(s)</p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showForm ? <><X size={15} /> Annuler</> : <><Plus size={15} /> Nouvel examen</>}
            </button>
          )}
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#4ade80' }}>{success}</div>}

        {canManage && showForm && (
          <div className="card" style={{ padding: 28, marginBottom: 24, animation: 'fadeInUp 0.3s ease forwards' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={16} /> Créer un examen / devoir
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} required />
              <textarea className="input" placeholder="Description / consignes" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
              <select className="input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                <option value="">-- Cours associé --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Date limite</label>
                <input className="input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} required />
              </div>
              <div style={{ border: '2px dashed rgba(74,222,128,0.2)', borderRadius: 10, padding: 20, textAlign: 'center', background: file ? 'rgba(74,222,128,0.05)' : 'transparent' }}>
                <input type="file" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} id="exam-file-upload" accept=".pdf,.doc,.docx,.pptx,.xlsx,.zip,.jpg,.png" />
                <label htmlFor="exam-file-upload" style={{ cursor: 'pointer' }}>
                  <FileText size={24} color={file ? 'var(--accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: file ? 'var(--accent)' : 'var(--text-muted)' }}>{file ? file.name : 'Sujet de l\'examen'}</p>
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Création...' : <><Upload size={15} /> Créer</>}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {exams.length === 0 && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <ClipboardList size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucun examen disponible.</p>
            </div>
          )}
          {exams.map((exam, i) => {
            const passed = isDeadlinePassed(exam.deadline);
            const mySubmission = mySubmissions[exam.id];
            const hasSubmitted = !!mySubmission;

            return (
              <div key={exam.id} className="card" style={{ padding: 20, animation: `fadeInUp 0.4s ${i * 0.05}s ease both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: passed ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${passed ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ClipboardList size={18} color={passed ? '#f87171' : 'var(--accent)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{exam.title}</h4>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{exam.description}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: passed ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', color: passed ? '#f87171' : 'var(--accent)' }}>
                          {passed ? 'Délai dépassé' : `Limite : ${new Date(exam.deadline).toLocaleString('fr-FR')}`}
                        </span>
                        {isEtudiant && hasSubmitted && (
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(74,222,128,0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={11} />
                            Rendu{mySubmission.grade != null ? ` — ${mySubmission.grade}/20` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Télécharger le sujet — tout le monde */}
                    {exam.file_url && (
                      <button onClick={() => handleDownloadExam(exam)}
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '6px 12px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Download size={13} /> Sujet
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => handleExpand(exam.id)}
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '6px 12px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {expandedExam === exam.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Rendus
                      </button>
                    )}
                    {isEtudiant && (
                      <button onClick={() => handleExpand(exam.id)}
                        style={{ background: hasSubmitted ? 'rgba(74,222,128,0.08)' : passed ? 'rgba(100,100,100,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${hasSubmitted ? 'rgba(74,222,128,0.3)' : 'rgba(74,222,128,0.15)'}`, borderRadius: 8, padding: '6px 12px', color: hasSubmitted ? '#4ade80' : passed ? 'var(--text-muted)' : 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {hasSubmitted ? <><CheckCircle size={13} /> Mon rendu</> : <><Upload size={13} /> Rendre</>}
                      </button>
                    )}
                    {(isAdmin || (canManage && exam.teacher_id === userId)) && (
                      <button onClick={() => handleDelete(exam.id)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 12px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {expandedExam === exam.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(74,222,128,0.1)' }}>

                    {/* Vue étudiant */}
                    {isEtudiant && (
                      <div>
                        {hasSubmitted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(74,222,128,0.06)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.15)' }}>
                            <CheckCircle size={18} color="#4ade80" />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', margin: 0 }}>Devoir soumis</p>
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                {new Date(mySubmission.submitted_at).toLocaleString('fr-FR')}
                                {mySubmission.grade != null ? ` — Note : ${mySubmission.grade}/20` : ' — En attente de correction'}
                              </p>
                            </div>
                            <button onClick={() => handleDownloadSubmission(mySubmission)}
                              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '6px 10px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <Download size={13} /> Mon fichier
                            </button>
                            {!passed && mySubmission.grade == null && (
                              <button onClick={() => handleCancelSubmit(exam.id)}
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 10px', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
                                Annuler
                              </button>
                            )}
                          </div>
                        ) : !passed ? (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input type="file" id={`submit-${exam.id}`} style={{ display: 'none' }}
                              onChange={e => setSubmitFile(prev => ({ ...prev, [exam.id]: e.target.files[0] }))}
                              accept=".pdf,.doc,.docx,.pptx,.xlsx,.zip,.jpg,.png" />
                            <label htmlFor={`submit-${exam.id}`} className="btn-secondary"
                              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <FileText size={13} />
                              {submitFile[exam.id] ? submitFile[exam.id].name : 'Choisir un fichier'}
                            </label>
                            {submitFile[exam.id] && (
                              <button onClick={() => handleSubmit(exam.id)} className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} disabled={loading}>
                                <Upload size={13} /> {loading ? 'Envoi...' : 'Soumettre'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Le délai de rendu est dépassé.</p>
                        )}
                      </div>
                    )}

                    {/* Vue enseignant/admin */}
                    {canManage && (
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                          {submissions[exam.id]?.length ?? 0} rendu(s)
                        </p>
                        {(submissions[exam.id] || []).length === 0 && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun rendu.</p>
                        )}
                        {(submissions[exam.id] || []).map(sub => (
                          <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                              {resolveUsername(sub.student_id)?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{resolveUsername(sub.student_id)}</p>
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                {new Date(sub.submitted_at).toLocaleString('fr-FR')}
                              </p>
                            </div>
                            <button onClick={() => handleDownloadSubmission(sub)}
                              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 7, padding: '5px 10px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <Download size={13} /> Rendu
                            </button>
                            {sub.grade != null ? (
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', minWidth: 55, textAlign: 'center' }}>{sub.grade}/20</span>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="number" min="0" max="20" step="0.5" placeholder="/20"
                                  value={grades[sub.id] || ''}
                                  onChange={e => setGrades(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  style={{ width: 65, padding: '5px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }} />
                                <button onClick={() => handleGrade(sub.id, exam.id)}
                                  style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '5px 10px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                  <Star size={11} /> Noter
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}