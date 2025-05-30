import React, { useEffect, useState } from 'react';
import styles from './Profile.module.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('กรุณาเข้าสู่ระบบ');
      return;
    }
    fetch('http://localhost:4000/profile', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setUser(data);
      })
      .catch(() => setError('เกิดข้อผิดพลาดในการโหลดข้อมูล'));
  }, []);

  if (error) return <div className={styles.profile}><h2>โปรไฟล์ผู้ใช้</h2><p style={{color:'red'}}>{error}</p></div>;
  if (!user) return <div className={styles.profile}><h2>โปรไฟล์ผู้ใช้</h2><p>กำลังโหลด...</p></div>;

  return (
    <div className={styles.profile}>
      <h2>โปรไฟล์ผู้ใช้</h2>
      <p><b>ชื่อ:</b> {user.name}</p>
      <p><b>อีเมล:</b> {user.email}</p>
    </div>
  );
};

export default Profile; 