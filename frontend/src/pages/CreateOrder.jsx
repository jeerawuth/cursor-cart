import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function CreateOrder({ cartItems, onOrderSuccess, profile }) {
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  // set ค่าเริ่มต้นจาก profile เฉพาะตอน mount/เปลี่ยน profile (แต่ไม่ reset ถ้าผู้ใช้กรอกเองแล้ว)
  useEffect(() => {
    if (profile?.name && !shippingName) setShippingName(profile.name);
    if (profile?.address && !shippingAddress) setShippingAddress(profile.address);
  }, [profile]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore(state => state.user);
  const token = user?.token || localStorage.getItem('token');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!token) {
        setError('กรุณาเข้าสู่ระบบ');
        setLoading(false);
        return;
      }
      // Validate cart items
      const items = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.qty ?? item.quantity,
        price: item.price
      }));
      console.log('cartItems:', cartItems);
      console.log('payload items:', items);
      console.log('shippingName:', shippingName, 'shippingAddress:', shippingAddress, 'items.length:', items.length);
      const invalidItems = items.filter(i => i.product_id == null || i.quantity == null || i.price == null);
      if (!shippingName || !shippingAddress || items.length === 0 || invalidItems.length > 0) {
        console.log('Invalid items:', invalidItems.map(i => ({
          ...i,
          product_id_reason: i.product_id == null ? 'product_id is null/undefined' : undefined,
          quantity_reason: i.quantity == null ? 'quantity is null/undefined' : undefined,
          price_reason: i.price == null ? 'price is null/undefined' : undefined
        })));
        setError('ข้อมูลสินค้าไม่ครบ กรุณาเลือกสินค้าใหม่');
        setLoading(false);
        return;
      }
      // ถ้า profile ยังไม่มี address ให้บันทึกลง profile ก่อน
      if ((shippingName && !profile?.name) || (shippingAddress && !profile?.address)) {
        await axios.put('http://localhost:4000/profile', {
          name: shippingName,
          address: shippingAddress
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      await axios.post('http://localhost:4000/orders', {
        shipping_name: shippingName,
        shipping_address: shippingAddress,
        items
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
        <label>ชื่อผู้รับ <input value={shippingName} onChange={e => setShippingName(e.target.value)} required /></label>
      </div>
      <div>
        <label>ที่อยู่จัดส่ง <textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} required /></label>
      </div>
      <button type="submit" disabled={loading}>{loading ? 'กำลังส่ง...' : 'ยืนยันสั่งซื้อ'}</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}
