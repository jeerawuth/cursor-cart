import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await fetch('http://localhost:4000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('เซิร์ฟเวอร์ไม่ตอบสนองหรือไม่ได้ส่งข้อมูล JSON (อาจเป็น network error หรือ backend ล่ม)');
      }
      if (!res.ok) throw new Error(data.error || 'สมัครสมาชิกล้มเหลว');
      setSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  };

  return (
    <div className={styles.login}>
      <h2>สมัครสมาชิก</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="อีเมล" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="รหัสผ่าน" value={password} onChange={e => setPassword(e.target.value)} required />
        <input type="text" placeholder="ชื่อผู้ใช้" value={name} onChange={e => setName(e.target.value)} required />
        <select value={role} onChange={e => setRole(e.target.value)} required>
          <option value="customer">Customer</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">สมัครสมาชิก</button>
      </form>
      <button onClick={() => navigate('/login')}>เข้าสู่ระบบ</button>
    </div>
  );
};

export default Signup; 