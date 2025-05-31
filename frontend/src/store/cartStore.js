import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(persist(
  (set, get) => ({
    cart: [],
    addToCart: (product) => {
      // Ensure we have all necessary product details with proper fallbacks
      const cartProduct = {
        id: product.id,
        title: product.title || product.name || 'สินค้า',
        price: product.price || 0,
        image: product.image || product.image_url || 'https://via.placeholder.com/100x100?text=No+Image',
        qty: 1,
        // Preserve any additional product details that might be needed
        ...(product.description && { description: product.description }),
        ...(product.category && { category: product.category })
      };
      
      set((state) => {
        const exist = state.cart.find(item => item.id === cartProduct.id);
        if (exist) {
          return {
            cart: state.cart.map(item =>
              item.id === cartProduct.id 
                ? { ...item, qty: item.qty + 1 } 
                : item
            )
          };
        }
        return { cart: [...state.cart, cartProduct] };
      });
      
      // sync to server
      import('./authStore').then(mod => {
        const token = mod.useAuthStore.getState().token;
        if (token) get().syncCartToServer(token);
      });
      
      console.log('Added to cart:', cartProduct);
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
        // First, fetch the cart items
        const res = await fetch('http://localhost:4000/cart', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('fetch cart fail');
        const data = await res.json();
        let items = Array.isArray(data.items) ? data.items : [];
        
        // Then, fetch all products to get their details
        const productsRes = await fetch('http://localhost:4000/products');
        if (!productsRes.ok) throw new Error('fetch products fail');
        const products = await productsRes.json();
        
        // Map cart items with product details
        const cartItems = items.map(item => {
          // Find the product in the products array
          const product = products.find(p => p.id === (item.product_id || item.id));
          
          // If product is found, use its details, otherwise use the item data
          if (product) {
            return {
              ...item,
              id: item.product_id || item.id,
              title: product.title || product.name || 'สินค้า',
              price: product.price || item.price || 0,
              image: product.image || product.image_url || 'https://via.placeholder.com/100x100?text=No+Image',
              qty: item.quantity || item.qty || 1
            };
          }
          
          // Fallback to basic item data if product not found
          return {
            ...item,
            id: item.product_id || item.id,
            title: item.title || 'สินค้า',
            price: item.price || 0,
            image: 'https://via.placeholder.com/100x100?text=No+Image',
            qty: item.quantity || item.qty || 1
          };
        });
        
        console.log('Cart items with details:', cartItems);
        set({ cart: cartItems });
      } catch (e) {
        console.error('Error in fetchCartFromServer:', e);
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
