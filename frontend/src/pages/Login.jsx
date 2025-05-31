import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className={styles.login}>
      <h2>เข้าสู่ระบบ</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="อีเมล" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="รหัสผ่าน" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
      <button onClick={() => navigate('/signup')}>สมัครสมาชิก</button>
    </div>
  );
};

export default Login; 