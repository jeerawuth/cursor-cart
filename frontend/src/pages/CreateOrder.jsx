import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function CreateOrder({ cartItems, onOrderSuccess, profile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore(state => state.user);
  const token = user?.token || localStorage.getItem('token');

  const handleSubmit = async (shippingName, shippingAddress) => {
    setLoading(true);
    setError('');
    try {
      if (!token) {
        setError('กรุณาเข้าสู่ระบบ');
        setLoading(false);
        return false;
      }

      // Validate cart items
      const items = cartItems.map(item => ({
        product_id: item.product_id || item.id,
        quantity: item.qty ?? item.quantity,
        price: item.price
      }));

      const invalidItems = items.filter(i => i.product_id == null || i.quantity == null || i.price == null);
      if (!shippingName || !shippingAddress || items.length === 0 || invalidItems.length > 0) {
        setError('ข้อมูลสินค้าไม่ครบ กรุณาเลือกสินค้าใหม่');
        setLoading(false);
        return false;
      }

      // Update profile if needed
      if ((shippingName && !profile?.name) || (shippingAddress && !profile?.address)) {
        await axios.put('http://localhost:4000/profile', {
          name: shippingName,
          address: shippingAddress
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Create order
      await axios.post('http://localhost:4000/orders', {
        shipping_name: shippingName,
        shipping_address: shippingAddress,
        items
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (onOrderSuccess) onOrderSuccess();
      return true;
    } catch (err) {
      console.error('Create order error:', err);
      setError(err.response?.data?.error || 'ไม่สามารถสร้างคำสั่งซื้อได้');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { handleSubmit, loading, error };
}
