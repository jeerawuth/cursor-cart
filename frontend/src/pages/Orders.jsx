import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchProducts } from '../api/products';

export default function Orders() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, token, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthLoading && !token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch products and orders in parallel
        const [productsData, ordersResponse] = await Promise.all([
          fetchProducts(),
          fetch('http://localhost:4000/orders', {
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
        setError('');
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, isAuthLoading, navigate]);

  // Show loading state while checking auth or loading data
  if (isAuthLoading || isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  }

  // If no token and not loading, show login prompt
  if (!token) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อ</p>
        <button onClick={() => navigate('/login')}>เข้าสู่ระบบ</button>
      </div>
    );
  }

  // Show empty state if no orders
  if (!orders.length) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>คำสั่งซื้อของฉัน</h2>
        <p>ยังไม่มีคำสั่งซื้อ</p>
      </div>
    );
  }

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
        </div>
      ))}
    </div>
  );
}
