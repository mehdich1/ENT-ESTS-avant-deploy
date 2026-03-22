import axios from 'axios';

const HOST = window.location.hostname;
const API_URL = `http://${HOST}`;
const KEYCLOAK_URL = `http://${HOST}:8080`;

// ─── INSTANCE AXIOS ────────────────────────────────────────────
const api = axios.create({ baseURL: API_URL });

// Intercepteur requête : injecte le token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur réponse : rafraîchit le token si 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(
          `${KEYCLOAK_URL}/realms/ent-est/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: 'ent-frontend',
            refresh_token: refreshToken,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const newToken = res.data.access_token;
        localStorage.setItem('token', newToken);
        if (res.data.refresh_token) localStorage.setItem('refresh_token', res.data.refresh_token);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ──────────────────────────────────────────────────────
export const login = async (username, password) => {
  const response = await axios.post(
    `${KEYCLOAK_URL}/realms/ent-est/protocol/openid-connect/token`,
    new URLSearchParams({ grant_type: 'password', client_id: 'ent-frontend', username, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
};

// --- USERS ---
export const getMe = () => api.get('/api/users/me');
export const getUsers = (page = 1, size = 100) => api.get(`/api/users?page=${page}&size=${size}`);
export const getUserById = (userId) => api.get(`/api/users/${userId}`);
export const updateUser = (userId, data) => api.put(`/api/users/${userId}`, data);
export const deleteUser = (userId) => api.delete(`/api/users/${userId}`);

// --- COURSES ---
export const getCourses = (page = 1, size = 10) => api.get(`/api/courses?page=${page}&size=${size}`);
export const createCourse = (formData) => api.post('/api/courses', formData);
export const deleteCourse = (courseId) => api.delete(`/api/courses/${courseId}`);
export const downloadCourse = (courseId) => api.get(`/api/courses/${courseId}/download`, { responseType: 'blob' });

// --- MESSAGING ---
export const getInbox = (page = 1, size = 10) => api.get(`/api/messages/inbox?page=${page}&size=${size}`);
export const getSent = (page = 1, size = 10) => api.get(`/api/messages/sent?page=${page}&size=${size}`);
export const sendMessage = (data) => api.post('/api/messages', data);
export const deleteMessage = (messageId) => api.delete(`/api/messages/${messageId}`);

// --- CALENDAR ---
export const getEvents = (page = 1, size = 50) => api.get(`/api/calendar/events?page=${page}&size=${size}`);
export const createEvent = (data) => api.post('/api/calendar/events', data);
export const deleteEvent = (eventId) => api.delete(`/api/calendar/events/${eventId}`);

// --- CHAT ---
export const getChatHistory = (roomId) => api.get(`/api/chat/history/${roomId}`);

// --- EXAMS ---
export const getExams = (page = 1, size = 10) => api.get(`/api/exams?page=${page}&size=${size}`);
export const createExam = (formData) => api.post('/api/exams', formData);
export const deleteExam = (examId) => api.delete(`/api/exams/${examId}`);
export const submitExam = (examId, formData) => api.post(`/api/exams/${examId}/submit`, formData);
export const getSubmissions = (examId) => api.get(`/api/exams/${examId}/submissions`);
export const gradeSubmission = (submissionId, grade) => api.put(`/api/exams/submissions/${submissionId}/grade`, { grade });
export const cancelSubmission = (examId) => api.delete(`/api/exams/${examId}/submit`);
export const getMySubmission = (examId) => api.get(`/api/exams/${examId}/my-submission`);
export const downloadSubmission = (submissionId) => api.get(`/api/exams/submissions/${submissionId}/download`, { responseType: 'blob' });

// ─── OLLAMA ────────────────────────────────────────────────────
export const askOllama = async (message) => {
  try {
    const response = await fetch(`http://${HOST}/api/ollama/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: message,
        stream: false,
        system: 'Tu es un assistant académique de l\'EST Salé. Tu aides les étudiants et enseignants avec leurs questions académiques. Réponds en français de façon concise et utile.'
      })
    });
    if (!response.ok) throw new Error('Indisponible');
    const data = await response.json();
    return data.response;
  } catch {
    throw new Error('Service Ollama indisponible');
  }
};