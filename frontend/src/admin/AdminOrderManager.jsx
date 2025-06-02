import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchProducts } from '../api/products';
import styles from './AdminOrderManager.module.css';

// สถานะคำสั่งซื้อ
const ORDER_STATUS = {
  ALL: 'all',
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// แท็บสถานะคำสั่งซื้อ
const statusTabs = [
  { id: ORDER_STATUS.PENDING, label: 'รอดำเนินการ' },
  { id: ORDER_STATUS.PAID, label: 'ชำระเงินแล้ว' },
  { id: ORDER_STATUS.SHIPPED, label: 'กำลังจัดส่ง' },
  { id: ORDER_STATUS.DELIVERED, label: 'จัดส่งสำเร็จ' },
  { id: ORDER_STATUS.CANCELLED, label: 'ยกเลิก' },
  { id: ORDER_STATUS.ALL, label: 'ทั้งหมด' },
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

export default function AdminOrderManager() {
  // State management
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(ORDER_STATUS.ALL);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(null);
  
  // Hooks
  const navigate = useNavigate();
  const { user, token, isLoading: isAuthLoading } = useAuthStore();
  
  // Calculate order counts for each status
  const getOrderCountByStatus = (status) => {
    if (!orders.length) return 0;
    if (status === ORDER_STATUS.ALL) return orders.length;
    return orders.filter(order => order.status === status).length;
  };
  
  // Filter orders based on active tab
  const filterOrders = useCallback(() => {
    if (activeTab === ORDER_STATUS.ALL) {
      return orders;
    }
    return orders.filter(order => order.status === activeTab);
  }, [activeTab, orders]);
  
  // Update filtered orders when dependencies change
  useEffect(() => {
    setFilteredOrders(filterOrders());
  }, [filterOrders]);

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
        const validOrders = Array.isArray(ordersData) ? ordersData : [];
        setProducts(productsData);
        setOrders(validOrders);
        setFilteredOrders(validOrders);
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

  const handleStatusChange = async (orderId, newStatus, currentStatus) => {
    if (!token) return;
    
    // Skip if no change
    if (newStatus === currentStatus) return;
    
    // Show confirmation dialog
    const confirmMessage = `คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะคำสั่งซื้อจาก "${getStatusLabel(currentStatus)}" เป็น "${getStatusLabel(newStatus)}"?`;
    if (!window.confirm(confirmMessage)) {
      // Reset the select to previous value if user cancels
      const selectElement = document.querySelector(`select[data-order-id="${orderId}"]`);
      if (selectElement) {
        selectElement.value = currentStatus;
      }
      return;
    }
    
    setStatusUpdating(orderId);
    try {
      const response = await fetch(`http://localhost:4000/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })  // Make sure to use newStatus here
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'ไม่สามารถอัปเดตสถานะได้');
      }

      const result = await response.json();
      console.log('Update successful:', result);

      setOrders(orders => orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
    } catch (err) {
      console.error('Error updating order status:', err);
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      // Reset the select to previous value on error
      const selectElement = document.querySelector(`select[data-order-id="${orderId}"]`);
      if (selectElement) {
        selectElement.value = currentStatus;
      }
    } finally {
      setStatusUpdating(null);
    }
  };

  // Handle loading state
  if (isAuthLoading || isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  // Handle unauthorized access
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>ไม่ได้รับอนุญาต</h3>
        <p>เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้</p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        {error}
      </div>
    );
  }

  // Loading state
  const renderLoading = () => (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  );

  // Error state
  const renderError = () => (
    <div className={styles.errorContainer}>
      <p className={styles.errorText}>{error}</p>
      <button 
        className={styles.retryButton}
        onClick={() => window.location.reload()}
      >
        โหลดใหม่
      </button>
    </div>
  );

  // Empty state for no orders
  const renderEmptyState = () => (
    <div className={styles.noOrders}>
      <p>ยังไม่มีคำสั่งซื้อในระบบ</p>
    </div>
  );

  // Empty state for no matching orders in current filter
  const renderNoMatchingOrders = () => (
    <div className={styles.noOrders}>
      <p>ไม่พบคำสั่งซื้อในหมวดหมู่นี้</p>
    </div>
  );
  
  // Render tabs with order counts
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

  // Main render
  if (isLoading) {
    return renderLoading();
  }

  if (error) {
    return renderError();
  }

  return (
    <div className={styles.ordersContainer}>
      <h2 className={styles.title}>จัดการคำสั่งซื้อ</h2>
      
      {/* Render tabs */}
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
      
      {/* Render content based on orders */}
      {!orders.length ? (
        renderEmptyState()
      ) : !filteredOrders.length ? (
        renderNoMatchingOrders()
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
                <div className={styles.customerInfo}>
                  <p><strong>ผู้ใช้:</strong> {order.user_email}</p>
                  <p><strong>ชื่อผู้รับ:</strong> {order.shipping_name}</p>
                  <p><strong>ที่อยู่:</strong> {order.shipping_address}</p>
                  <p><strong>วันที่สั่ง:</strong> {new Date(order.created_at).toLocaleString('th-TH')}</p>
                </div>
                
                <div className={styles.orderItems}>
                  <h4>สินค้า:</h4>
                  <ul>
                    {order.items.map(item => {
                      const prod = products.find(p => p.id === item.product_id);
                      return (
                        <li key={item.id} className={styles.orderItem}>
                          {prod && (
                            <img 
                              src={prod.image || 'https://via.placeholder.com/60'} 
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
                            <span className={styles.itemName}>
                              {prod ? prod.title : `สินค้า #${item.product_id}`}
                            </span>
                            <div className={styles.itemPrice}>
                              <span>จำนวน: {item.quantity}</span>
                              <span>ราคา: {item.price} บาท</span>
                              <span>รวม: {item.quantity * item.price} บาท</span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                
                <div className={styles.orderTotal}>
                  <span>ยอดรวมทั้งหมด: </span>
                  <span>
                    {order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)} บาท
                  </span>
                </div>
                
                <div className={styles.orderActions}>
                  <div className={styles.statusUpdateContainer}>
                    <label className={styles.statusUpdateLabel}>
                      เปลี่ยนสถานะ:
                    </label>
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value, order.status)}
                      disabled={statusUpdating === order.id}
                      className={styles.statusSelect}
                      aria-label="เปลี่ยนสถานะคำสั่งซื้อ"
                    >
                      <option value="pending">รอดำเนินการ</option>
                      <option value="paid">ชำระเงินแล้ว</option>
                      <option value="shipped">กำลังจัดส่ง</option>
                      <option value="delivered">จัดส่งสำเร็จ</option>
                      <option value="cancelled">ยกเลิก</option>
                    </select>
                    {statusUpdating === order.id && (
                      <span className={styles.updatingText}>กำลังอัปเดต...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
