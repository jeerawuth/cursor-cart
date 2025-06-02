import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.css';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบล้มเหลว');
      setAuth(data.user, data.token);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>เข้าสู่ระบบ</h1>
      </div>
      
      <div className={styles.card}>
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">อีเมล</label>
            <input
              id="email"
              type="email"
              className={styles.formInput}
              placeholder="กรอกอีเมลของคุณ"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className={styles.formInput}
              placeholder="กรอกรหัสผ่าน"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!email || !password}
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
        
        <div className={styles.footer}>
          ยังไม่มีบัญชี? 
          <Link to="/signup">สมัครสมาชิก</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 