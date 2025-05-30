import React from 'react';
import styles from './CartItem.module.css';

const CartItem = ({ item, onIncrease, onDecrease }) => (
  <li className={styles.cartItem}>
    <img src={item.image} alt={item.title} className={styles.cartImg} />
    <span className={styles.cartTitle}>{item.title}</span> x {item.qty} = {item.price * item.qty} บาท
    <button onClick={() => onIncrease(item)}>+</button>
    <button onClick={() => onDecrease(item)}>-</button>
  </li>
);

export default CartItem; 