import React from 'react';
import styles from './CartItem.module.css';

const CartItem = ({ item, onIncrease, onDecrease }) => (
  <li className={styles.cartItem}>
    <img src={item.image} alt={item.title} className={styles.cartImg} />
    <div className={styles.itemDetails}>
      <span className={styles.cartTitle}>{item.title}</span>
      <span className={styles.price}>{(item.price * item.qty).toFixed(2)} บาท</span>
    </div>
    <div className={styles.quantityControl}>
      <button 
        className={`${styles.qtyButton} ${styles.decrease}`}
        onClick={() => onDecrease(item)}
        aria-label="ลดจำนวน"
      >
        <svg width="12" height="2" viewBox="0 0 12 2" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span className={styles.qty}>{item.qty}</span>
      <button 
        className={`${styles.qtyButton} ${styles.increase}`}
        onClick={() => onIncrease(item)}
        aria-label="เพิ่มจำนวน"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  </li>
);

export default CartItem; 