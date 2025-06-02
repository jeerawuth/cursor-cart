import React from 'react';
import { Link } from 'react-router-dom';
import { FaBox, FaShoppingCart, FaUsers, FaTags, FaTachometerAlt } from 'react-icons/fa';
import styles from './AdminDashboard.module.css';

const menuItems = [
  {
    title: 'จัดการสินค้า',
    path: '/admin/products',
    icon: <FaBox className={styles.icon} />,
    description: 'เพิ่ม แก้ไข หรือลบสินค้าในระบบ'
  },
  {
    title: 'ดูคำสั่งซื้อ',
    path: '/admin/orders',
    icon: <FaShoppingCart className={styles.icon} />,
    description: 'จัดการคำสั่งซื้อและสถานะการจัดส่ง'
  },
  {
    title: 'ดูผู้ใช้งาน',
    path: '/admin/users',
    icon: <FaUsers className={styles.icon} />,
    description: 'จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง'
  },
  {
    title: 'จัดการหมวดหมู่',
    path: '/admin/categories',
    icon: <FaTags className={styles.icon} />,
    description: 'จัดการหมวดหมู่สินค้า'
  }
];

const AdminDashboard = () => {
  return (
    <div className={styles.adminDashboard}>
      <div className={styles.header}>
        <h1><FaTachometerAlt className={styles.headerIcon} /> แดชบอร์ดผู้ดูแลระบบ</h1>
        <p>ยินดีต้อนรับเข้าสู่ระบบจัดการร้านค้าออนไลน์</p>
      </div>
      
      <div className={styles.dashboardGrid}>
        {menuItems.map((item, index) => (
          <Link key={index} to={item.path} className={styles.card}>
            <div className={styles.cardIcon}>{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className={styles.linkText}>เข้าสู่หน้าจัดการ <span>→</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;