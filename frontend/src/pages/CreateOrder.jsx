import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function CreateOrder({ cartItems, onOrderSuccess, profile }) {
  const [shippingName, setShippingName] = useState(profile?.name || '');
  const [shippingAddress, setShippingAddress] = useState(profile?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore(state => state.user);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // ถ้า profile ยังไม่มี address ให้บันทึกลง profile ก่อน
      if (!profile?.address || !profile?.name) {
        await axios.put('http://localhost:4000/profile', {
          name: shippingName,
          address: shippingAddress
        }, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
      }
      await axios.post('http://localhost:4000/orders', {
        shipping_name: shippingName,
        shipping_address: shippingAddress,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.qty ?? item.quantity,
          price: item.price
        }))
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setShippingName('');
      setShippingAddress('');
      if (onOrderSuccess) onOrderSuccess();
    } catch (err) {
      setError('ไม่สามารถสร้างคำสั่งซื้อ');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>กรุณาเข้าสู่ระบบ</div>;
  if (!cartItems?.length) return <div>ไม่มีสินค้าในตะกร้า</div>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <h2>สร้างคำสั่งซื้อ</h2>
      <div>
        <label>ชื่อผู้รับ <input value={shippingName} onChange={e => setShippingName(e.target.value)} required disabled={!!profile?.name} /></label>
      </div>
      <div>
        <label>ที่อยู่จัดส่ง <textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} required disabled={!!profile?.address} /></label>
      </div>
      <button type="submit" disabled={loading}>{loading ? 'กำลังส่ง...' : 'ยืนยันสั่งซื้อ'}</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}
