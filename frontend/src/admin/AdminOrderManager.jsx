import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchProducts } from '../api/products';

export default function AdminOrderManager() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(null);
  const navigate = useNavigate();
  
  // Get user and token from auth store
  const { user, token, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    // Redirect to home if not admin
    if (!isAuthLoading && user?.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch products and orders in parallel
        const [productsData, ordersResponse] = await Promise.all([
          fetchProducts(),
          fetch('http://localhost:4000/admin/orders', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        if (!ordersResponse.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลคำสั่งซื้อได้');
        }

        const ordersData = await ordersResponse.json();
        setProducts(productsData);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (err) {
        console.error('Error fetching admin orders:', err);
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && user?.role === 'admin') {
      fetchData();
    }
  }, [token, user, isAuthLoading, navigate]);

  const handleStatusChange = async (orderId, status) => {
    if (!token) return;
    
    setStatusUpdating(orderId);
    try {
      const response = await fetch(`http://localhost:4000/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถอัปเดตสถานะได้');
      }

      setOrders(orders => orders.map(o => 
        o.id === orderId ? { ...o, status } : o
      ));
    } catch (err) {
      console.error('Error updating order status:', err);
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Show loading state while checking auth or loading data
  if (isAuthLoading || isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  // If not admin, show unauthorized message
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>ไม่ได้รับอนุญาต</h3>
        <p>เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้</p>
      </div>
    );
  }

  // Show error message if there was an error
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        {error}
      </div>
    );
  }

  // Show empty state if no orders
  if (!orders.length) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h2>จัดการคำสั่งซื้อ</h2>
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff8e1', borderRadius: '4px' }}>
          ยังไม่มีคำสั่งซื้อในระบบ
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
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
              {order.items.map(item => {
                const prod = products.find(p => p.id === item.product_id);
                return (
                  <li key={item.id} style={{display:'flex',alignItems:'center',gap:8}}>
                    {prod && <img src={prod.image} alt={prod.title} style={{width:40,height:40,objectFit:'cover',borderRadius:4}} />}
                    <span>{prod ? prod.title : `สินค้า #${item.product_id}`}</span>
                    &nbsp;จำนวน {item.quantity} ราคา {item.price} บาท
                  </li>
                );
              })}
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
