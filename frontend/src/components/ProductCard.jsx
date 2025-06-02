import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useAdminMode } from '../context/AdminModeContext';
import styles from './ProductCard.module.css';

const ProductCard = ({ product, onAddToCart }) => {
  const user = useAuthStore(state => state.user);
  const { isCustomerView } = useAdminMode();
  
  // Show add to cart button for customers or admin in customer view
  const showAddToCart = !user || user.role === 'customer' || isCustomerView;

  return (
    <div className={styles.card}>
      <img src={product.image} alt={product.title} className={styles.productImage} />
      <div className={styles.cardBody}>
        <h3 className={styles.productTitle}>{product.title}</h3>
        <p className={styles.productPrice}>{product.price.toLocaleString()} บาท</p>
        <div className={styles.cardActions}>
          <a href={`/product/${product.id}`} className={styles.viewDetailsBtn}>
            ดูรายละเอียด
          </a>
          {showAddToCart && (
            <button 
              onClick={() => onAddToCart(product)} 
              className={`${styles.addToCartBtn} ${product.stock_quantity <= 0 ? styles.disabledBtn : ''}`}
              disabled={product.stock_quantity <= 0}
            >
              {product.stock_quantity > 0 ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด'}
            </button>
          )}
          {product.stock_quantity !== undefined && product.stock_quantity <= 0 && (
            <p className={styles.outOfStockText}>สินค้าหมดสต็อก</p>
          )}
        </div>
      </div>
      {/* Admin badge removed as it's already shown in the navbar */}
    </div>
  );
};

export default ProductCard; 