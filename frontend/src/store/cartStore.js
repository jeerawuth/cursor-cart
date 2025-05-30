import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(persist(
  (set) => ({
    cart: [],
    addToCart: (product) => set((state) => {
      const exist = state.cart.find(item => item.id === product.id);
      if (exist) {
        return {
          cart: state.cart.map(item =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          )
        };
      }
      return { cart: [...state.cart, { ...product, qty: 1 }] };
    }),
    decreaseQty: (id) => set((state) => ({
      cart: state.cart.map(item =>
        item.id === id ? { ...item, qty: item.qty - 1 } : item
      ).filter(item => item.qty > 0)
    })),
    removeFromCart: (id) => set((state) => ({
      cart: state.cart.filter(item => item.id !== id)
    })),
    clearCart: () => set({ cart: [] })
  }),
  { name: 'cart' }
));
