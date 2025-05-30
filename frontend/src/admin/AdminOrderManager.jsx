import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export default function AdminOrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await axios.get('http://localhost:4000/admin/orders', {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setOrders(res.data);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    if (user?.role === 'admin') fetchOrders();
  }, [user]);

  const handleStatusChange = async (orderId, status) => {
    setStatusUpdating(orderId);
    try {
      await axios.put(`http://localhost:4000/admin/orders/${orderId}`, { status }, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setOrders(orders => orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      alert('ไม่สามารถอัปเดตสถานะ');
    } finally {
      setStatusUpdating(null);
    }
  };

  if (!user || user.role !== 'admin') return <div>เฉพาะผู้ดูแลระบบเท่านั้น</div>;
  if (loading) return <div>Loading...</div>;
  if (!orders.length) return <div>ยังไม่มีคำสั่งซื้อ</div>;

  return (
    <div>
      <h2>จัดการคำสั่งซื้อ</h2>
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid #ccc', margin: 12, padding: 12 }}>
          <div>ผู้ใช้: {order.user_email}</div>
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
          <div>
            <label>
              เปลี่ยนสถานะ:
              <select
                value={order.status}
                onChange={e => handleStatusChange(order.id, e.target.value)}
                disabled={statusUpdating === order.id}
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="shipped">shipped</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
