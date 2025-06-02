import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { fetchProducts } from '../api/products';
import styles from './Cart.module.css';
import CartItem from '../components/CartItem';

const Cart = () => {
  const { cart, removeFromCart, decreaseQty, addToCart, clearCart } = useCartStore();
  const [popup, setPopup] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  // join cart กับ products เพื่อเติม image/title ให้ cart item
  const cartWithDetails = cart.map(item => {
    // รองรับทั้ง item.id และ item.product_id
    const prod = products.find(p => p.id === item.product_id || p.id === item.id);
    return prod ? { ...prod, ...item } : item;
  });

  const total = cartWithDetails.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleRemove = (id) => {
    removeFromCart(id);
    setPopup('ลบสินค้าออกจากตะกร้าแล้ว');
    setTimeout(() => setPopup(''), 1500);
  };

  const handleDecrease = (item) => {
    if (item.qty <= 1) {
      removeFromCart(item.id);
      setPopup('ลบสินค้าออกจากตะกร้าแล้ว');
    } else {
      decreaseQty(item.id);
      setPopup('ลดจำนวนสินค้าแล้ว');
    }
    setTimeout(() => setPopup(''), 1500);
  };

  const handleIncrease = (item) => {
    addToCart(item);
    setPopup('เพิ่มจำนวนสินค้าแล้ว');
    setTimeout(() => setPopup(''), 1500);
  };

  const handleClear = () => {
    clearCart();
    setPopup('ล้างตะกร้าแล้ว');
    setTimeout(() => setPopup(''), 1500);
  };

  return (
    <div className={styles.cartPage}>
      {popup && <div className={styles.popup}>{popup}</div>}
      <div className={styles.cart}>
        <h2>ตะกร้าสินค้า</h2>
        <button onClick={handleClear}>ล้างตะกร้า</button>
        {cart.length === 0 ? (
          <p>ไม่มีสินค้าในตะกร้า</p>
        ) : (
          <>
            <ul className={styles.cartList}>
              {cartWithDetails.map(item => (
                <CartItem
                  key={item.product_id || item.id}
                  item={item}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                />
              ))}
            </ul>
            <p>รวมทั้งหมด: {total.toFixed(2)} บาท</p>
            
            <br />
            <a href="/checkout" style={{textDecoration:'none'}}>
              <button style={{marginTop: 12, background: '#4caf50', color: 'white', padding: '8px 24px', fontSize: 16}}>
              ไปชำระเงิน
              </button>
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart; 