import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchProducts } from '../api/products';
import styles from './Orders.module.css';

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
  { id: ORDER_STATUS.PENDING, label: 'รอดำเนินการ' },
  { id: ORDER_STATUS.PAID, label: 'ชำระเงินแล้ว' },
  { id: ORDER_STATUS.SHIPPED, label: 'กำลังจัดส่ง' },
  { id: ORDER_STATUS.DELIVERED, label: 'จัดส่งสำเร็จ' },
  { id: ORDER_STATUS.CANCELLED, label: 'ยกเลิก' },
  { id: ORDER_STATUS.ALL, label: 'ทั้งหมด' }
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
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // If no token and not loading, show login prompt
  if (!token) {
    return (
      <div className={styles.errorContainer}>
        <p>กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อ</p>
        <button 
          className={styles.retryButton}
          onClick={() => navigate('/login')}
        >
          เข้าสู่ระบบ
        </button>
      </div>
    );
  }

  // Show tabs even when there are no orders in the current filter
  const renderEmptyState = () => (
    <div className={styles.noOrders}>
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
    <div className={styles.statusTabs}>
      {statusTabs.map(tab => {
        const count = getOrderCountByStatus(tab.id);
        return (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {count > 0 && (
              <span className={styles.tabCount}>
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
      <div className={styles.ordersContainer}>
        <h2 className={styles.title}>คำสั่งซื้อของฉัน</h2>
        {renderTabs()}
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className={styles.ordersContainer}>
      <h2 className={styles.title}>คำสั่งซื้อของฉัน</h2>
      
      {/* Render tabs */}
      {renderTabs()}
      
      {/* Render content based on filtered orders */}
      {!filteredOrders.length ? (
        renderEmptyState()
      ) : (
        <div className={styles.ordersList}>
          {filteredOrders.map(order => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <span className={styles.orderId}>#ORD-{order.id}</span>
                <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className={styles.orderDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>ชื่อผู้รับ:</span>
                  <span>{order.shipping_name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>ที่อยู่:</span>
                  <span>{order.shipping_address}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>วันที่สั่ง:</span>
                  <span>{new Date(order.created_at).toLocaleDateString('th-TH')}</span>
                </div>
              </div>
              
              <div className={styles.orderItems}>
                <div className={styles.itemsLabel}>สินค้า:</div>
                <ul>
                  {order.items.map(item => {
                    const prod = products.find(p => p.id === item.product_id);
                    return (
                      <li key={item.id} className={styles.orderItem}>
                        {prod && (
                          <img 
                            src={prod.image} 
                            alt={prod.title} 
                            className={styles.productImage}
                            onError={(e) => {
                              if (e.target.src !== 'https://via.placeholder.com/60') {
                                e.target.src = 'https://via.placeholder.com/60';
                              }
                            }}
                          />
                        )}
                        <div className={styles.itemDetails}>
                          <div className={styles.itemTitle}>
                            {prod ? prod.title : `สินค้า #${item.product_id}`}
                          </div>
                          <div className={styles.itemQuantity}>
                            จำนวน {item.quantity} ชิ้น
                          </div>
                          <div className={styles.itemPrice}>
                            ราคา {item.price} บาท
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div className={styles.orderTotal}>
                <span>รวมทั้งหมด:</span>
                <span className={styles.totalAmount}>
                  {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} บาท
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
