import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: localStorage.getItem('token') || null,
      isLoading: true, // Add loading state
      
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isLoading: false });
        import('../store/cartStore').then(mod => {
          mod.useCartStore.getState().fetchCartFromServer(token);
          console.log('authStore.setAuth: called fetchCartFromServer with token', token);
        });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isLoading: false });
        // clear cart when logout
        import('../store/cartStore').then(mod => {
          mod.useCartStore.getState().clearCart();
        });
      },
      
      fetchUser: async () => {
        const { token } = get();
        if (!token) {
          set({ user: null, isLoading: false });
          return null;
        }
        
        try {
          console.log('[authStore] Fetching user profile with token:', token);
          const res = await fetch('http://localhost:4000/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!res.ok) {
            throw new Error('Failed to fetch profile');
          }
          
          const data = await res.json();
          console.log('[authStore] Profile response:', data);
          
          set({ user: data, isLoading: false });
          
          // Fetch cart after successful profile fetch
          import('../store/cartStore').then(mod => {
            mod.useCartStore.getState().fetchCartFromServer(token);
          });
          
          return data;
        } catch (error) {
          console.error('[authStore] Error fetching user:', error);
          localStorage.removeItem('token');
          set({ user: null, token: null, isLoading: false });
          return null;
        }
      },
      
      // Initialize function to be called when the store is created
      initialize: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('[authStore] Initializing with token from localStorage');
          await get().fetchUser();
        } else {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // use localStorage
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);

// Initialize the auth store when the store is first created
const initializeAuth = async () => {
  console.log('[authStore] Initializing auth store...');
  try {
    await useAuthStore.getState().initialize();
  } catch (error) {
    console.error('[authStore] Error initializing auth store:', error);
  }
};

// Call initialize when the module loads
if (typeof window !== 'undefined') {
  initializeAuth();
}
