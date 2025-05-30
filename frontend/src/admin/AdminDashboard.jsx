import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  return (
    <div className={styles.adminDashboard}>
      <h2>แดชบอร์ดผู้ดูแลระบบ</h2>
      <ul>
        <li><Link to="/admin/products">จัดการสินค้า</Link></li>
        <li><a href="/admin/orders">ดูคำสั่งซื้อ</a></li>
        <li><a href="/admin/users">ดูผู้ใช้งาน</a></li>
      </ul>
    </div>
  );
};

export default AdminDashboard; 