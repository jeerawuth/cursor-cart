import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaStar, 
  FaUser, 
  FaBoxOpen, 
  FaClock,
  FaArrowLeft,
  FaSearch,
  FaTrash,
  FaSpinner,
  FaCheckCircle,
  FaEdit,
  FaTimes
} from 'react-icons/fa';
import axios from 'axios';
import styles from './AdminReviews.module.css';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [popup, setPopup] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/reviews');
        setReviews(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('ไม่สามารถโหลดข้อมูลรีวิวได้');
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // Format date to Thai locale
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  // Render star ratings
  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <FaStar 
        key={i} 
        className={`${styles.star} ${i < rating ? styles.filled : ''}`}
      />
    ));
  };

  // Filter reviews based on search term
  const filteredReviews = reviews.filter(review => 
    review.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (review.comment && review.comment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้?')) {
      return;
    }

    setDeletingId(reviewId);
    try {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);
      
      if (!token) {
        alert('กรุณาเข้าสู่ระบบอีกครั้ง');
        navigate('/login');
        return;
      }

      console.log('Sending DELETE request to:', `http://localhost:4000/api/reviews/${reviewId}`);
      console.log('Authorization header:', `Bearer ${token}`);

      // Add request interceptor to log the request
      const requestInterceptor = axios.interceptors.request.use(request => {
        console.log('Starting Request', JSON.stringify(request, null, 2));
        return request;
      });

      // Add response interceptor to log the response
      const responseInterceptor = axios.interceptors.response.use(
        response => {
          console.log('Response:', JSON.stringify(response.data, null, 2));
          return response;
        },
        error => {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
          } else if (error.request) {
            // The request was made but no response was received
            console.error('Error request:', error.request);
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
          }
          return Promise.reject(error);
        }
      );

      const response = await axios.delete(
        `http://localhost:4000/api/reviews/${reviewId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true,
          validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        }
      );
      
      console.log('Full response:', response);

      // Remove interceptors
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);

      if (response.data && response.data.success) {
        // Remove the deleted review from the list
        setReviews(reviews.filter(review => review.id !== reviewId));
        setPopup('ลบรีวิวสำเร็จ');
        setTimeout(() => setPopup(''), 1500);
      } else {
        const errorMessage = response.data?.error || response.data?.message || 'เกิดข้อผิดพลาดในการลบรีวิว';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      const errorMessage = error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการลบรีวิว';
      alert(errorMessage);
      
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>กำลังโหลดข้อมูลรีวิว...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.error}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className={styles.retryButton}
        >
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className={styles.adminDashboard}>
      {popup && (
        <div className={styles.popup}>
          <FaCheckCircle className={styles.popupIcon} />
          {popup}
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <FaStar /> จัดการรีวิว
          </h1>
          <p className={styles.subtitle}>ดูและจัดการรีวิวจากลูกค้าทั้งหมด</p>
        </div>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="ค้นหาจือชื่อลูกค้า, สินค้า, หรือความคิดเห็น..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.resultsCount}>
          พบทั้งหมด {filteredReviews.length} รีวิว
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>ผู้ใช้</th>
              <th style={{ width: '15%' }}>สินค้า</th>
              <th style={{ width: '10%' }}>คะแนน</th>
              <th style={{ width: '40%' }}>ความคิดเห็น</th>
              <th style={{ width: '15%' }}>วันที่</th>
              <th style={{ width: '10%' }}>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.noData}>
                  ไม่พบข้อมูลรีวิว
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <div className={styles.userCell}>
                      <FaUser className={styles.userIcon} />
                      <span>{review.user_name}</span>
                    </div>
                  </td>
                  <td className={styles.productCell}>
                    <FaBoxOpen className={styles.productIcon} />
                    <span className={styles.productName} title={review.product_name}>
                      {review.product_name}
                    </span>
                  </td>
                  <td>
                    <div className={styles.ratingCell}>
                      {renderStars(review.rating)}
                      <span className={styles.ratingNumber}>({review.rating})</span>
                    </div>
                  </td>
                  <td className={styles.commentCell}>
                    {review.comment ? (
                      <div className={styles.commentText}>
                        "{review.comment}"
                      </div>
                    ) : (
                      <span className={styles.noComment}>ไม่มีข้อความ</span>
                    )}
                  </td>
                  <td className={styles.dateCell}>
                    <FaClock className={styles.dateIcon} />
                    {formatDate(review.created_at)}
                  </td>
                  <td className={styles.actionsCell}>
                    <button 
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingId === review.id}
                      title="ลบรีวิว"
                    >
                      {deletingId === review.id ? (
                        <FaSpinner className="fa-spin" />
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReviews;
