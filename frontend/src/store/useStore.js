import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useStore = create((set, get) => ({
  user:        null,
  token:       localStorage.getItem('gravitas_token'),
  authLoading: true,

  setToken: (token) => {
    localStorage.setItem('gravitas_token', token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('gravitas_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },
  loadUser: async () => {
    if (!get().token) { set({ authLoading: false }); return; }
    try {
      const { data } = await authAPI.getMe();
      set({ user: data.user, authLoading: false });
    } catch {
      localStorage.removeItem('gravitas_token');
      set({ user: null, token: null, authLoading: false });
    }
  },
}));
