import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchProducts } from '../api/products';
import '../styles/Orders.css';

// สถานะคำสั่งซื้อ
const ORDER_STATUS = {
  ALL: 'all',
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// แท็บสถานะคำสั่งซื้อ
const statusTabs = [
  { id: ORDER_STATUS.ALL, label: 'ทั้งหมด' },
  { id: ORDER_STATUS.PENDING, label: 'รอดำเนินการ' },
  { id: ORDER_STATUS.PAID, label: 'ชำระเงินแล้ว' },
  { id: ORDER_STATUS.SHIPPED, label: 'กำลังจัดส่ง' },
  { id: ORDER_STATUS.DELIVERED, label: 'จัดส่งสำเร็จ' },
  { id: ORDER_STATUS.CANCELLED, label: 'ยกเลิก' }
];

// ฟังก์ชันแปลงสถานะเป็นข้อความภาษาไทย
const getStatusLabel = (status) => {
  const statusMap = {
    [ORDER_STATUS.PENDING]: 'รอดำเนินการ',
    [ORDER_STATUS.PAID]: 'ชำระเงินแล้ว',
    [ORDER_STATUS.SHIPPED]: 'กำลังจัดส่ง',
    [ORDER_STATUS.DELIVERED]: 'จัดส่งสำเร็จ',
    [ORDER_STATUS.CANCELLED]: 'ยกเลิก'
  };
  return statusMap[status] || status;
};

export default function Orders() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(ORDER_STATUS.ALL);
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
        const validOrders = Array.isArray(ordersData) ? ordersData : [];
        setProducts(productsData);
        setOrders(validOrders);
        setFilteredOrders(validOrders); // เริ่มต้นแสดงทั้งหมด
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

  // Update filtered orders when activeTab or orders change
  useEffect(() => {
    if (activeTab === ORDER_STATUS.ALL) {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === activeTab));
    }
  }, [activeTab, orders]);

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

  // Show tabs even when there are no orders in the current filter
  const renderEmptyState = () => (
    <div className="no-orders">
      <p>{orders.length === 0 ? 'ยังไม่มีคำสั่งซื้อ' : 'ไม่พบคำสั่งซื้อในหมวดหมู่นี้'}</p>
    </div>
  );
  
  // Calculate order counts for each status
  const getOrderCountByStatus = (status) => {
    if (status === ORDER_STATUS.ALL) return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  // Always show the tabs, even when there are no orders
  const renderTabs = () => (
    <div className="status-tabs">
      {statusTabs.map(tab => {
        const count = getOrderCountByStatus(tab.id);
        return (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {count > 0 && (
              <span className="tab-count">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // If there are no orders at all
  if (!orders.length) {
    return (
      <div className="orders-container">
        <h2>คำสั่งซื้อของฉัน</h2>
        {renderTabs()}
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h2>คำสั่งซื้อของฉัน</h2>
      
      {/* Render tabs */}
      {renderTabs()}
      
      {/* Render content based on filtered orders */}
      {!filteredOrders.length ? (
        renderEmptyState()
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span className="order-id">#ORD-{order.id}</span>
                <span className={`status-badge ${order.status}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="order-details">
                <div className="detail-row">
                  <span className="detail-label">ชื่อผู้รับ:</span>
                  <span>{order.shipping_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">ที่อยู่:</span>
                  <span>{order.shipping_address}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">วันที่สั่ง:</span>
                  <span>{new Date(order.created_at).toLocaleDateString('th-TH')}</span>
                </div>
              </div>
              
              <div className="order-items">
                <div className="items-label">สินค้า:</div>
                <ul>
                  {order.items.map(item => {
                    const prod = products.find(p => p.id === item.product_id);
                    return (
                      <li key={item.id} className="order-item">
                        {prod && (
                          <img 
                            src={prod.image} 
                            alt={prod.title} 
                            className="product-image"
                          />
                        )}
                        <div className="item-details">
                          <div className="item-title">
                            {prod ? prod.title : `สินค้า #${item.product_id}`}
                          </div>
                          <div className="item-quantity">
                            จำนวน {item.quantity} ชิ้น
                          </div>
                          <div className="item-price">
                            ราคา {item.price} บาท
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div className="order-total">
                <span>รวมทั้งหมด:</span>
                <span className="total-amount">
                  {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} บาท
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
