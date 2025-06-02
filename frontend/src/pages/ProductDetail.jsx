import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './ProductDetail.module.css';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const API_URL = 'http://localhost:4000/products';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popup, setPopup] = useState('');
  const addToCart = useCartStore(state => state.addToCart);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/${id}`);
        setProduct(response.data);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('ไม่พบสินค้านี้');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <div>กำลังโหลด...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!product) return <div>ไม่พบสินค้า</div>;

  const handleAddToCart = () => {
    if (product.stock_quantity <= 0) {
      setPopup('ขออภัย สินค้าหมดสต็อก');
      setTimeout(() => setPopup(''), 1500);
      return;
    }
    
    addToCart({
      ...product,
      title: product.name, // Map name to title if needed by your cart
      image: product.image_url || product.image // Use image_url if exists, otherwise fallback to image
    });
    setPopup('เพิ่มสินค้าลงตะกร้าแล้ว');
    setTimeout(() => setPopup(''), 1500);
  };

  return (
    <div className={styles.productDetailPage}>
      {popup && <div className={styles.popup}>{popup}</div>}
      <div className={styles.productDetail}>
        <img src={product.image} alt={product.title} />
        <div>
          <h2>{product.name}</h2>
          <p className={styles.description}>{product.description || 'ไม่มีรายละเอียด'}</p>
          <p className={styles.price}>ราคา: {product.price.toLocaleString()} บาท</p>
          {product.stock_quantity !== undefined && (
            <p className={product.stock_quantity > 0 ? styles.inStock : styles.outOfStock}>
              {product.stock_quantity > 0 ? `มีสินค้า: ${product.stock_quantity} ชิ้น` : 'สินค้าหมด'}
            </p>
          )}
          {user?.role !== 'admin' && (
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
    </div>
  );
};

export default ProductDetail; 