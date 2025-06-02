import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Signup.module.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  // Role is always set to 'customer' for new registrations
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError('รหัสผ่านไม่ตรงกัน');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validatePassword()) {
      return;
    }
    
    try {
      const res = await fetch('http://localhost:4000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: 'customer' })
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
    <div className={styles.signupContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>สมัครสมาชิก</h1>
      </div>
      
      <div className={styles.card}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        
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
              placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (confirmPassword && e.target.value !== confirmPassword) {
                  setPasswordError('รหัสผ่านไม่ตรงกัน');
                } else {
                  setPasswordError('');
                }
              }}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
            <input
              id="confirmPassword"
              type="password"
              className={`${styles.formInput} ${passwordError ? styles.inputError : ''}`}
              placeholder="กรุณากรอกรหัสผ่านอีกครั้ง"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (e.target.value !== password) {
                  setPasswordError('รหัสผ่านไม่ตรงกัน');
                } else {
                  setPasswordError('');
                }
              }}
              onBlur={validatePassword}
              required
            />
            {passwordError && <div className={styles.errorText}>{passwordError}</div>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="name">ชื่อผู้ใช้</label>
            <input
              id="name"
              type="text"
              className={styles.formInput}
              placeholder="กรอกชื่อผู้ใช้"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          
          {/* Role is automatically set to 'customer' */}
          
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate('/login')}
            >
              กลับไปเข้าสู่ระบบ
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!email || !password || !confirmPassword || !name || passwordError}
            >
              สมัครสมาชิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup; 