import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(persist(
  (set, get) => ({
    cart: [],
    addToCart: (product) => {
      set((state) => {
        const exist = state.cart.find(item => item.id === product.id);
        if (exist) {
          return {
            cart: state.cart.map(item =>
              item.id === product.id ? { ...item, qty: item.qty + 1 } : item
            )
          };
        }
        return { cart: [...state.cart, { ...product, qty: 1 }] };
      });
      // sync to server
      import('./authStore').then(mod => {
        const token = mod.useAuthStore.getState().token;
        if (token) get().syncCartToServer(token);
      });
    },
    decreaseQty: (id) => {
      set((state) => ({
        cart: state.cart.map(item =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item
        ).filter(item => item.qty > 0)
      }));
      import('./authStore').then(mod => {
        const token = mod.useAuthStore.getState().token;
        if (token) get().syncCartToServer(token);
      });
    },
    removeFromCart: (id) => {
      set((state) => ({
        cart: state.cart.filter(item => item.id !== id)
      }));
      import('./authStore').then(mod => {
        const token = mod.useAuthStore.getState().token;
        if (token) get().syncCartToServer(token);
      });
    },
    clearCart: () => {
      set({ cart: [] });
      import('./authStore').then(mod => {
        const token = mod.useAuthStore.getState().token;
        if (token) get().syncCartToServer(token);
      });
    },
    fetchCartFromServer: async (token) => {
      console.log('fetchCartFromServer called', token);
      if (!token) return;
      try {
        const res = await fetch('http://localhost:4000/cart', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('fetch cart fail');
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        set({ cart: items.map(i => ({ ...i, qty: i.quantity || i.qty || 1 })) });
      } catch (e) {
        // ignore error
      }
    },
    syncCartToServer: async (token) => {
      if (!token) return;
      const cart = get().cart;
      try {
        await fetch('http://localhost:4000/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ items: cart.map(item => ({ product_id: item.id, quantity: item.qty, price: item.price })) })
        });
      } catch (e) {
        // ignore error
      }
    }
  }),
  { name: 'cart' }
));
