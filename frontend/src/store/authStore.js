import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return set({ user: null, token: null });
    try {
      const res = await fetch('http://localhost:4000/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.error) {
        set({ user: null, token: null });
      } else {
        set({ user: data, token });
      }
    } catch {
      set({ user: null, token: null });
    }
  }
}));
