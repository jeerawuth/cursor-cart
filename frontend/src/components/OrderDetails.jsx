import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import ReviewModal from './ReviewModal';
import styles from '../pages/Profile.module.css';

const OrderDetails = ({ order, onReviewSubmit }) => {
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingProduct, setReviewingProduct] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!order) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:4000/api/orders/${order.id}/reviews`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReviews(response.data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('ไม่สามารถโหลดข้อมูลรีวิวได้');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [order]);

  const handleReviewClick = (product) => {
    setReviewingProduct(product);
  };

  const handleReviewSubmit = async () => {
    // Refresh reviews after submission
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:4000/api/orders/${order.id}/reviews`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(response.data);
      
      if (onReviewSubmit) {
        onReviewSubmit();
      }
    } catch (err) {
      console.error('Error refreshing reviews:', err);
      // Return error status to the modal
      return { 
        success: false, 
        error: 'ไม่สามารถรีเฟรชข้อมูลรีวิวได้ กรุณารีเฟรชหน้าเว็บด้วยตนเอง' 
      };
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: th });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'รอดำเนินการ', className: styles.statusPending },
      processing: { text: 'กำลังดำเนินการ', className: styles.statusProcessing },
      shipped: { text: 'จัดส่งแล้ว', className: styles.statusShipped },
      delivered: { text: 'จัดส่งสำเร็จ', className: styles.statusDelivered },
      cancelled: { text: 'ยกเลิก', className: styles.statusCancelled }
    };
    
    const statusInfo = statusMap[status] || { text: status, className: '' };
    
    return (
      <span className={`${styles.statusBadge} ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (!order) {
    return <div>ไม่พบข้อมูลคำสั่งซื้อ</div>;
  }

  if (loading) {
    return <div>กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className={styles.card}>
      <h3>รายละเอียดคำสั่งซื้อ #{order.id}</h3>
      <p>วันที่สั่งซื้อ: {formatDate(order.created_at)}</p>
      <p>สถานะ: {getStatusBadge(order.status)}</p>
      
      <div className={styles.section}>
        <h4>ที่อยู่ในการจัดส่ง</h4>
        <p>{order.shipping_name}</p>
        <p>{order.shipping_address}</p>
      </div>
      
      <div className={styles.section}>
        <h4>รายการสินค้า</h4>
        {order.items && order.items.length > 0 ? (
          <div>
            {order.items.map((item) => {
              const productReview = reviews[item.product_id];
              const canReview = order.status === 'delivered' && !productReview;
              
              return (
                <div key={item.id} className={styles.orderItem}>
                  <div className={styles.orderItemInfo}>
                    <div className={styles.orderItemTitle}>
                      {item.title}
                      {item.quantity > 1 && ` (${item.quantity} ชิ้น)`}
                    </div>
                    <div className={styles.orderItemPrice}>
                      ฿{item.price.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    {productReview ? (
                      <span className={styles.reviewedBadge}>เขียนรีวิวแล้ว</span>
                    ) : canReview ? (
                      <button
                        type="button"
                        className={styles.reviewButton}
                        onClick={() => handleReviewClick(item)}
                      >
                        เขียนรีวิว
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>ไม่พบรายการสินค้า</p>
        )}
      </div>
      
      <div className={styles.section}>
        <div className={styles.orderTotal}>
          <strong>ยอดรวม:</strong>
          <span>฿{order.total?.toLocaleString()}</span>
        </div>
      </div>
      
      {reviewingProduct && (
        <ReviewModal
          isOpen={!!reviewingProduct}
          onClose={() => setReviewingProduct(null)}
          orderId={order.id}
          product={reviewingProduct}
          onSubmit={handleReviewSubmit}
        />
      )}
      
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default OrderDetails;
