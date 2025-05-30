import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await axios.get('http://localhost:4000/orders', {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setOrders(res.data);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchOrders();
  }, [user]);

  if (!user) return <div>กรุณาเข้าสู่ระบบ</div>;
  if (loading) return <div>Loading...</div>;
  if (!orders.length) return <div>ยังไม่มีคำสั่งซื้อ</div>;

  return (
    <div>
      <h2>คำสั่งซื้อของฉัน</h2>
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid #ccc', margin: 12, padding: 12 }}>
          <div>ชื่อผู้รับ: {order.shipping_name}</div>
          <div>ที่อยู่: {order.shipping_address}</div>
          <div>สถานะ: <b>{order.status}</b></div>
          <div>วันที่สั่ง: {order.created_at}</div>
          <div>สินค้า:
            <ul>
              {order.items.map(item => (
                <li key={item.id}>สินค้า #{item.product_id} จำนวน {item.quantity} ราคา {item.price} บาท</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
