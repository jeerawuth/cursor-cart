import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useAdminMode } from '../context/AdminModeContext';

const Navbar = () => {
  const cartCount = useCartStore(state => state.cart.reduce((sum, item) => sum + item.qty, 0));
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();
  const { isCustomerView, toggleCustomerView } = useAdminMode();
  
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    if (isCustomerView) {
      toggleCustomerView();
    }
    logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <ul className={styles.navLinks}>
          <li><Link to="/">หน้าแรก</Link></li>
          <li><Link to="/products">สินค้า</Link></li>
          
          {/* Show cart only for customers or when admin is in customer view */}
          {(user?.role === 'customer' || isCustomerView) && (
            <>
              <li>
                <Link to="/cart">
                  ตะกร้า <span className={styles.cartCount}>{cartCount > 0 ? `(${cartCount})` : ''}</span>
                </Link>
              </li>
              <li>
                <Link to="/orders">คำสั่งซื้อ</Link>
              </li>
            </>
          )}
          
          <li><Link to="/profile">โปรไฟล์</Link></li>
          
          {!user ? (
            <li><Link to="/login">เข้าสู่ระบบ</Link></li>
          ) : (
            <li className={styles.userInfo}>
              <span>สวัสดี, {user.name}</span>
              {isAdmin && (
                <span className={`${styles.adminBadge} ${isCustomerView ? styles.customerView : ''}`}>
                  {isCustomerView ? 'โหมดลูกค้า' : 'โหมดผู้ดูแลระบบ'}
                </span>
              )}
            </li>
          )}
          
          {isAdmin && (
            <li>
              <button 
                onClick={toggleCustomerView}
                className={styles.toggleModeBtn}
                title="สลับระหว่างโหมดผู้ดูแลระบบและโหมดลูกค้า"
              >
                สลับโหมด
              </button>
            </li>
          )}
          
          {isAdmin && (
            <li>
              <Link to="/admin" className={styles.adminLink}>
                แดชบอร์ด
              </Link>
            </li>
          )}
          
          {user && (
            <li className={styles.logoutContainer}>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                ออกจากระบบ
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar; 