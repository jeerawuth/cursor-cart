import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './ProductDetail.module.css';
import { useCartStore } from '../store/cartStore';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [popup, setPopup] = useState('');
  const addToCart = useCartStore(state => state.addToCart);

  useEffect(() => {
    axios.get(`https://fakestoreapi.com/products/${id}`)
      .then(res => setProduct(res.data));
  }, [id]);

  if (!product) return <div>Loading...</div>;

  const handleAddToCart = () => {
    addToCart(product);
    setPopup('เพิ่มสินค้าลงตะกร้าแล้ว');
    setTimeout(() => setPopup(''), 1500);
  };

  return (
    <div className={styles.productDetailPage}>
      {popup && <div className={styles.popup}>{popup}</div>}
      <div className={styles.productDetail}>
        <img src={product.image} alt={product.title} />
        <div>
          <h2>{product.title}</h2>
          <p>{product.description}</p>
          <p>ราคา: {product.price} บาท</p>
          <button onClick={handleAddToCart}>เพิ่มลงตะกร้า</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 