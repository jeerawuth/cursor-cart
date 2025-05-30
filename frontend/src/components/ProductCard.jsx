import React from 'react';
import styles from './ProductCard.module.css';

const ProductCard = ({ product, onAddToCart }) => (
  <div className={styles.card}>
    <img src={product.image} alt={product.title} />
    <h3>{product.title}</h3>
    <p>{product.price} บาท</p>
    <a href={`/product/${product.id}`}>ดูรายละเอียด</a>
    <button onClick={() => onAddToCart(product)}>เพิ่มลงตะกร้า</button>
  </div>
);

export default ProductCard; 