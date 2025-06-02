import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useAdminMode } from '../context/AdminModeContext';
import styles from './ProductCard.module.css';

const ProductCard = ({ product, onAddToCart }) => {
  const user = useAuthStore(state => state.user);
  const { isCustomerView } = useAdminMode();
  
  // Show add to cart button only for logged-in customers or admin in customer view
  const showAddToCart = user && (user.role === 'customer' || isCustomerView);
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <img 
          src={product.image} 
          alt={product.title} 
          className={`${styles.productImage} ${isOutOfStock ? styles.outOfStockImage : ''}`} 
        />
        {isOutOfStock && <div className={styles.outOfStockBadge}>หมดสต๊อก</div>}
      </div>
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
              className={`${styles.addToCartBtn} ${isOutOfStock ? styles.disabledBtn : ''}`}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? 'สินค้าหมด' : 'เพิ่มลงตะกร้า'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 