import React, { useEffect, useState } from 'react';
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const updateAuthUser = useAuthStore(state => state.setAuth);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('กรุณาเข้าสู่ระบบ');
      return;
    }
    try {
      const response = await fetch('http://localhost:4000/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setUser(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    console.log('Form data being submitted:', formData);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('กรุณาเข้าสู่ระบบ');
      setIsSubmitting(false);
      return;
    }

    try {

      const response = await fetch('http://localhost:4000/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address
        })
      });

      const responseData = await response.json();
      
      console.log('Server response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์');
      }

      // The backend now returns the complete user object directly
      const updatedUser = {
        ...responseData,
        // Remove the message from the user object if it exists
        message: undefined
      };
      
      console.log('Updating state with user:', updatedUser);
      
      // Update both user and formData states with the server response
      // Also update the auth store to reflect the changes in the Navbar
      updateAuthUser(updatedUser, token);
      
      setUser(updatedUser);
      setFormData({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        address: updatedUser.address || ''
      });
      
      console.log('State updated successfully');
      setIsEditing(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSubmitError(error.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:4000/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setPasswordSuccess('เปลี่ยนรหัสผ่านสำเร็จ');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    }
  };

  if (error) return (
    <div className={styles.adminDashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>โปรไฟล์ผู้ใช้</h1>
      </div>
      <div className={styles.error}>{error}</div>
    </div>
  );

  if (!user) return (
    <div className={styles.adminDashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>โปรไฟล์ผู้ใช้</h1>
      </div>
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>ข้อมูลส่วนตัว</h2>
        <div>กำลังโหลดข้อมูลผู้ใช้...</div>
      </div>
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>เปลี่ยนรหัสผ่าน</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.formGroup}>
                <label>รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>รหัสผ่านใหม่</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={styles.formInput}
                  required
                  minLength="6"
                />
              </div>
              <div className={styles.formGroup}>
                <label>ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={styles.formInput}
                  required
                  minLength="6"
                />
              </div>
              
              {passwordError && <div className={styles.error} style={{ marginBottom: '1rem' }}>{passwordError}</div>}
              {passwordSuccess && <div className={styles.success} style={{ marginBottom: '1rem' }}>{passwordSuccess}</div>}
              
              <div className={styles.buttonGroup} style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={styles.secondaryButton}
                  disabled={!!passwordSuccess}
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!!passwordSuccess}
                >
                  {passwordSuccess ? 'สำเร็จ' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.adminDashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>โปรไฟล์ผู้ใช้</h1>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>ข้อมูลส่วนตัว</h2>
        <div className={styles.profileContent}>
          {isEditing ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>ชื่อ</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>อีเมล</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  className={styles.formInput}
                  disabled
                />
              </div>
              <div className={styles.formGroup}>
                <label>ที่อยู่</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${styles.textarea}`}
                  rows="4"
                  required
                />
              </div>
              <div className={styles.buttonGroup}>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className={styles.secondaryButton}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={styles.primaryButton}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
              {submitError && <div className={styles.error}>{submitError}</div>}
              {submitSuccess && <div className={styles.success}>อัปเดตโปรไฟล์เรียบร้อยแล้ว</div>}
            </form>
          ) : (
            <div className={styles.profileInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ชื่อ:</span>
                <span className={styles.infoValue}>{user.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>อีเมล:</span>
                <span className={styles.infoValue}>{user.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>ที่อยู่:</span>
                <span className={styles.infoValue}>{user.address || 'ยังไม่ได้ระบุที่อยู่'}</span>
              </div>
              <div className={styles.buttonGroup} style={{ gap: '10px' }}>
                <button onClick={handleEditClick} className={styles.primaryButton}>
                  แก้ไขโปรไฟล์
                </button>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className={styles.secondaryButton}
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button 
              className={styles.closeButton}
              onClick={() => setShowPasswordModal(false)}
              aria-label="ปิด"
            >
              &times;
            </button>
            <h3>เปลี่ยนรหัสผ่าน</h3>
            {passwordError && <div className={styles.error}>{passwordError}</div>}
            {passwordSuccess && <div className={styles.success}>{passwordSuccess}</div>}
            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className={styles.formInput}
                  minLength="6"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className={styles.formInput}
                  minLength="6"
                  required
                />
              </div>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={styles.secondaryButton}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={styles.primaryButton}
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 