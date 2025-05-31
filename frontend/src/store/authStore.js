import { create } from 'zustand';

export const useAuthStore = create((set) => ({

  user: null,
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
    import('../store/cartStore').then(mod => {
      mod.useCartStore.getState().fetchCartFromServer(token);
      console.log('authStore.setAuth: called fetchCartFromServer with token', token);
    });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
    // clear cart when logout
    import('../store/cartStore').then(mod => {
      mod.useCartStore.getState().clearCart();
    });
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
        import('../store/cartStore').then(mod => {
          mod.useCartStore.getState().fetchCartFromServer(token);
          console.log('authStore.fetchUser: called fetchCartFromServer with token', token);
        });
      }
    } catch {
      set({ user: null, token: null });
    }
  }
}));

// โหลด user อัตโนมัติถ้ามี token ใน localStorage
if (localStorage.getItem('token')) {
  useAuthStore.getState().fetchUser();
}
