import React from 'react';
import styles from './AdminLogin.module.css';

const AdminLogin = () => {
  return (
    <div className={styles.adminLogin}>
      <h2>เข้าสู่ระบบผู้ดูแล</h2>
      <form>
        <input type="text" placeholder="ชื่อผู้ใช้" required />
        <input type="password" placeholder="รหัสผ่าน" required />
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
};

export default AdminLogin; 