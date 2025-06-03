import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBox, 
  FaShoppingCart, 
  FaUsers, 
  FaTags, 
  FaTachometerAlt,
  FaCommentAlt
} from 'react-icons/fa';
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
  },
  {
    title: 'จัดการรีวิว',
    path: '/admin/reviews',
    icon: <FaCommentAlt className={styles.icon} />,
    description: 'ดูและจัดการรีวิวจากลูกค้า'
  }
];

const stats = [
  {
    title: 'สินค้าทั้งหมด',
    value: '0',
    icon: <FaBox className={styles.statIcon} />,
    color: '#3498db',
    path: '/admin/products'
  },
  {
    title: 'คำสั่งซื้อใหม่',
    value: '0',
    icon: <FaShoppingCart className={styles.statIcon} />,
    color: '#2ecc71',
    path: '/admin/orders'
  },
  {
    title: 'ผู้ใช้ทั้งหมด',
    value: '0',
    icon: <FaUsers className={styles.statIcon} />,
    color: '#9b59b6',
    path: '/admin/users'
  },
  {
    title: 'รีวิวล่าสุด',
    value: '0',
    icon: <FaCommentAlt className={styles.statIcon} />,
    color: '#f39c12',
    path: '/admin/reviews'
  }
];

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // You can add data fetching here if needed
    const fetchDashboardData = async () => {
      try {
        // Add your dashboard data fetching logic here
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className={styles.adminDashboard}>
      <div className={styles.header}>
        <h1><FaTachometerAlt className={styles.headerIcon} /> แดชบอร์ดผู้ดูแลระบบ</h1>
        <p>ยินดีต้อนรับเข้าสู่ระบบจัดการร้านค้าออนไลน์</p>
      </div>
      
      {/* <div className={styles.dashboardGrid}>
        {menuItems.map((item, index) => (
          <Link key={index} to={item.path} className={styles.card}>
            <div className={styles.cardIcon}>{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className={styles.linkText}>เข้าสู่หน้าจัดการ <span>→</span></span>
          </Link>
        ))}
      </div> */}

      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={styles.statCard}
            style={{ '--stat-color': stat.color }}
          >
            <Link to={stat.link || '#'} className={styles.statLink}>
              <div className={styles.statIconContainer} style={{ backgroundColor: `${stat.color}15` }}>
                {stat.icon}
              </div>
              <div className={styles.statContent}>
                <h3>{stat.title}</h3>
                <p className={styles.statValue}>{stat.value}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      <div className={styles.quickLinks}>
        <h2>เมนูด่วน</h2>
        <div className={styles.quickLinksGrid}>
          {menuItems.map((item, index) => (
            <Link key={index} to={item.path} className={styles.quickLinkCard}>
              <div className={styles.quickLinkIcon}>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;