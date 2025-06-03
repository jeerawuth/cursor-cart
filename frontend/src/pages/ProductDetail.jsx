import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './ProductDetail.module.css';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import Rating from '../components/Rating';
import { FaUserCircle } from 'react-icons/fa';

const API_URL = 'http://localhost:4000/products';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewError, setReviewError] = useState('');
  const addToCart = useCartStore(state => state.addToCart);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const [productRes, reviewsRes] = await Promise.all([
          axios.get(`http://localhost:4000/products/${id}`),
          axios.get(`http://localhost:4000/api/products/${id}/reviews`)
        ]);
        
        setProduct(productRes.data);
        setReviews(reviewsRes.data);
        setLoadingReviews(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('ไม่สามารถโหลดข้อมูลสินค้าได้');
        setReviewError('ไม่สามารถโหลดข้อมูลรีวิวได้');
        setLoadingReviews(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (!product) return <div>ไม่พบสินค้า</div>;

  const handleAddToCart = () => {
    if (product.stock_quantity <= 0) {
      setError('ขออภัย สินค้าหมดสต็อก');
      setTimeout(() => setError(''), 1500);
      return;
    }
    
    addToCart({
      ...product,
      title: product.name, // Map name to title if needed by your cart
      image: product.image_url || product.image // Use image_url if exists, otherwise fallback to image
    });
    setError('เพิ่มสินค้าลงตะกร้าแล้ว');
    setTimeout(() => setError(''), 1500);
  };

  return (
    <div className={styles.productDetailPage}>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.productDetail}>
        <img src={product.image} alt={product.title} />
        <div>
          <h2>{product.name}</h2>
          <div className={styles.ratingContainer}>
            <Rating 
              rating={product.rating} 
              size="large"
              showCount={true}
            />
          </div>
          <p className={styles.description}>{product.description || 'ไม่มีรายละเอียด'}</p>
          <p className={styles.price}>ราคา: {product.price.toLocaleString()} บาท</p>
          {product.stock_quantity !== undefined && (
            <p className={product.stock_quantity > 0 ? styles.inStock : styles.outOfStock}>
              {product.stock_quantity > 0 ? `มีสินค้า: ${product.stock_quantity} ชิ้น` : 'สินค้าหมด'}
            </p>
          )}
          {user?.role === 'customer' && (
            <button 
              onClick={handleAddToCart}
              disabled={product.stock_quantity <= 0}
              className={product.stock_quantity <= 0 ? styles.disabledButton : ''}
            >
              {product.stock_quantity > 0 ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด'}
            </button>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className={styles.reviewsSection}>
        <div className={styles.reviewsHeader}>
          <h3>รีวิวจากลูกค้า</h3>
          {reviews.length > 2 && (
            <div className={styles.reviewCountBadge}>
              ทั้งหมด {reviews.length} รีวิว
            </div>
          )}
        </div>
        {loadingReviews ? (
          <p>กำลังโหลดรีวิว...</p>
        ) : reviewError ? (
          <p className={styles.errorText}>{reviewError}</p>
        ) : reviews.length === 0 ? (
          <p>ยังไม่มีการรีวิวสินค้านี้</p>
        ) : (
          <div className={styles.reviewsContainer}>
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.userInfo}>
                      <FaUserCircle className={styles.userIcon} />
                      <div>
                        <span className={`${styles.userName} ${review.is_anonymous ? styles.anonymousName : ''}`}>
                          {review.user_name || 'ผู้ใช้ไม่ระบุชื่อ'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.reviewMeta}>
                      <Rating rating={{ rate: review.rating }} size="small" showCount={false} />
                      <span className={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className={styles.reviewComment}>{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;