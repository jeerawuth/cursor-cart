import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function CreateOrder({ cartItems, onOrderSuccess, profile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockCheck, setStockCheck] = useState({ 
    isValid: true, 
    outOfStockItems: [],
    results: []
  });
  const user = useAuthStore(state => state.user);
  const token = user?.token || localStorage.getItem('token');

  // Check stock when cart items change
  useEffect(() => {
    if (cartItems.length > 0) {
      checkStock();
    }
  }, [cartItems]);

  // Function to check stock
  const checkStock = async () => {
    if (!token) return true; // Skip check if not logged in (will be caught later)
    
    try {
      const itemsToCheck = cartItems.map(item => ({
        product_id: item.product_id || item.id,
        quantity: item.qty ?? item.quantity
      }));

      const response = await axios.post('http://localhost:4000/check-stock', 
        { items: itemsToCheck },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setStockCheck({
        isValid: response.data.isValid,
        outOfStockItems: response.data.outOfStockItems || [],
        results: response.data.results || []
      });
      
      return response.data.isValid;
    } catch (err) {
      console.error('Error checking stock:', err);
      // Don't block the user if stock check fails, but log it
      return true;
    }
  };

  const handleSubmit = async (shippingName, shippingAddress) => {
    setLoading(true);
    setError('');
    try {
      if (!token) {
        setError('กรุณาเข้าสู่ระบบ');
        setLoading(false);
        return false;
      }
      
      // Check stock before proceeding
      const isStockValid = await checkStock();
      if (!isStockValid) {
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

  // Get error message for out of stock items
  const getStockErrorMessage = () => {
    if (!stockCheck.isValid && stockCheck.outOfStockItems.length > 0) {
      const itemMessages = stockCheck.outOfStockItems.map(item => 
        `${item.title} (ต้องการ ${item.requested} ชิ้น แต่มีเพียง ${item.available} ชิ้น)`
      ).join(', ');
      return `สินค้ามีไม่เพียงพอ: ${itemMessages}`;
    }
    return '';
  };

  return { 
    handleSubmit, 
    loading, 
    error: error || getStockErrorMessage(),
    stockCheck 
  };
}
