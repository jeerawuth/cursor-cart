import React, { useEffect, useState } from 'react';
import styles from './Profile.module.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('กรุณาเข้าสู่ระบบ');
        return;
      }

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

  if (error) return <div className={styles.profile}><h2>โปรไฟล์ผู้ใช้</h2><p className={styles.error}>{error}</p></div>;
  if (!user) return <div className={styles.profile}><h2>โปรไฟล์ผู้ใช้</h2><p>กำลังโหลด...</p></div>;

  return (
    <div className={styles.profile}>
      <h2>โปรไฟล์ผู้ใช้</h2>
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className={styles.profileForm}>
          <div className={styles.formGroup}>
            <label htmlFor="name">ชื่อ</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="email">อีเมล</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled
              className={`${styles.input} ${styles.disabled}`}
            />
            <p className={styles.helpText}>ไม่สามารถเปลี่ยนอีเมลได้</p>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="address">ที่อยู่</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows="4"
              className={styles.textarea}
            />
          </div>
          
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
          
          {submitError && <p className={styles.error}>{submitError}</p>}
          {submitSuccess && <p className={styles.success}>บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว</p>}
        </form>
      ) : (
        <div className={styles.profileInfo}>
          <p><b>ชื่อ:</b> {user.name}</p>
          <p><b>อีเมล:</b> {user.email}</p>
          {user.address && (
            <p className={styles.address}>
              <b>ที่อยู่:</b> {user.address}
            </p>
          )}
          <div className={styles.editButtonContainer}>
            <button
              type="button"
              onClick={handleEditClick}
              className={styles.editButton}
            >
              แก้ไขโปรไฟล์
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 