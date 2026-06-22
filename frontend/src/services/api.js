// services/api.js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('gravitas_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gravitas_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  getGoogleUrl: () => api.get('/auth/google'),
  getMe:        () => api.get('/auth/me'),
  debug:        () => api.get('/auth/debug'),
};
export const dashAPI    = { get: () => api.get('/dashboard') };
export const emailAPI   = { fetch: (p) => api.get('/emails', { params: p }), stats: () => api.get('/emails/stats') };
export const taskAPI    = {
  getAll:     (p) => api.get('/tasks', { params: p }),
  create:     (d) => api.post('/tasks', d),
  update:     (id, d) => api.put(`/tasks/${id}`, d),
  del:        (id) => api.delete(`/tasks/${id}`),
  prioritize: ()  => api.post('/tasks/prioritize'),
  dailyPlan:  (p) => api.get('/tasks/daily-plan', { params: p }),
};
export const calAPI     = {
  events:  (p) => api.get('/calendar/events', { params: p }),
  analyze: ()  => api.get('/calendar/analyze'),
};
export const wellnessAPI = {
  insights: () => api.get('/wellness/insights'),
  breaks:   (d) => api.post('/wellness/break-suggestions', d),
};
export const chatAPI = { send: (d) => api.post('/chat/message', d) };

export default api;
