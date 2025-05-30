import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const cartCount = useCartStore(state => state.cart.reduce((sum, item) => sum + item.qty, 0));
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  return (
    <nav className={styles.navbar}>
      <ul>
        <li><Link to="/">หน้าแรก</Link></li>
        <li><Link to="/products">สินค้า</Link></li>
        <li><Link to="/cart">ตะกร้า <span className={styles.cartCount}>{cartCount > 0 ? `(${cartCount})` : ''}</span></Link></li>
        <li><Link to="/profile">โปรไฟล์</Link></li>
        {!user && <li><Link to="/login">เข้าสู่ระบบ</Link></li>}
        {user && (
          <>
            <li><span>สวัสดี, {user.name}</span></li>
            <li><button onClick={logout} className={styles.logoutBtn}>ออกจากระบบ</button></li>
          </>
        )}
        {(user && user.role !== 'customer') && <li><Link to="/admin">Admin</Link></li>}
      </ul>
    </nav>
  );
};

export default Navbar; 