import React, { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import styles from './Cart.module.css';
import CartItem from '../components/CartItem';

const Cart = () => {
  const { cart, removeFromCart, decreaseQty, addToCart, clearCart } = useCartStore();
  const [popup, setPopup] = useState('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

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
        {cart.length === 0 ? (
          <p>ไม่มีสินค้าในตะกร้า</p>
        ) : (
          <>
            <ul className={styles.cartList}>
              {cart.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                />
              ))}
            </ul>
            <p>รวมทั้งหมด: {total} บาท</p>
            <button onClick={handleClear}>ล้างตะกร้า</button>
            <a href="/checkout">ไปชำระเงิน</a>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart; 