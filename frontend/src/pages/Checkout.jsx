import React from 'react';
import styles from './Checkout.module.css';

const Checkout = () => {
  return (
    <div className={styles.checkout}>
      <h2>ชำระเงิน</h2>
      <p>ฟอร์มชำระเงิน (mockup)</p>
      <button>ยืนยันการสั่งซื้อ</button>
    </div>
  );
};

export default Checkout; 