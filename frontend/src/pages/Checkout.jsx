import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import CreateOrder from './CreateOrder';
import styles from './Checkout.module.css';

const Checkout = () => {
  const { cart, clearCart } = useCartStore();
  const user = useAuthStore(state => state.user);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  
  const { handleSubmit: submitOrder, loading: isOrderLoading } = CreateOrder({ 
    cartItems: cart, 
    onOrderSuccess: () => setOrderSuccess(true),
    profile 
  });

  const handleOrderSubmit = async () => {
    if (!profile?.name || !profile?.address) {
      setOrderError('กรุณากรอกชื่อและที่อยู่ให้ครบถ้วน');
      return;
    }
    
    setIsSubmitting(true);
    setOrderError('');
    
    try {
      const success = await submitOrder(profile.name, profile.address);
      if (!success) {
        // Error message is already set by submitOrder
        return;
      }
    } catch (error) {
      console.error('Order submission error:', error);
      setOrderError('เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (orderSuccess) clearCart();
  }, [orderSuccess]);

  // Initial profile fetch
  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchProfile = async () => {
    const token = user?.token || localStorage.getItem('token');
    console.log('[Checkout] fetchProfile: user', user, 'token', token);
    if (!token) {
      setProfileLoading(false);
      setProfileError('กรุณาเข้าสู่ระบบ');
      return;
    }
    try {
      setProfileLoading(true);
      const res = await fetch('http://localhost:4000/profile', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.error) setProfileError(data.error);
      else setProfile(data);
    } catch (error) {
      setProfileError('\u0e2d\u0e23\u0e31\u0e1a\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e1a\u0e32\u0e23\u0e30\u0e1a\u0e1a');
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Initial profile fetch
  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const token = user?.token || localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      // Update local state with new data
      setProfile(data);
      
      // Refresh profile data from server to ensure consistency
      await fetchProfile();
      
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    setFormData({
      name: profile?.name || '',
      address: profile?.address || ''
    });
    setEditMode(true);
  };

  if (orderSuccess) {
    return (
      <div className={styles.container}>
        <h2>สั่งซื้อสำเร็จ!</h2>
        <a href="/orders" className={styles.link}>ดูคำสั่งซื้อของฉัน</a>
      </div>
    );
  }

  if (!cart.length) return <div className={styles.emptyCart}>ไม่มีสินค้าในตะกร้า</div>;

  return (
    <div className={styles.container}>
      <h2>ข้อมูลคำสั่งซื้อ</h2>
      <div className={styles.cartItems}>
        {cart.map(item => (
          <div key={item.product_id || item.id} className={styles.cartItem}>
            <div className={styles.itemImageContainer}>
              <img 
                src={item.image || 'https://via.placeholder.com/100x100?text=No+Image'} 
                alt={item.title || 'สินค้า'} 
                className={styles.itemImage}
                onError={(e) => {
                  // If image fails to load, set a fallback image
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                  e.target.style.objectFit = 'contain';
                  e.target.style.padding = '10px';
                }}
                onLoad={(e) => {
                  // Ensure the image fits nicely in the container
                  e.target.style.objectFit = 'contain';
                }}
              />
            </div>
            <div className={styles.itemDetails}>
              <h4 className={styles.itemTitle}>{item.title || 'สินค้า'}</h4>
              <div className={styles.itemPrice}>
                {item.qty} x {item.price} บาท
              </div>
              <div className={styles.itemTotal}>
                รวม: <b>{item.price * item.qty} บาท</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className={styles.total}>รวมทั้งหมด: {total} บาท</p>
      <hr className={styles.divider} />
      <div className={styles.shippingSection}>
        <h3>ข้อมูลที่อยู่สำหรับจัดส่ง</h3>
        
        {profileLoading ? (
          <div>กำลังโหลดข้อมูล...</div>
        ) : profileError ? (
          <div className={styles.error}>{profileError}</div>
        ) : editMode ? (
          <form onSubmit={handleSaveProfile} className={styles.shippingForm}>
            <div className={styles.formGroup}>
              <label htmlFor="name">ชื่อผู้รับ</label>
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
              <label htmlFor="address">ที่อยู่จัดส่ง</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                rows="4"
                className={styles.textarea}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => setEditMode(false)}
                className={styles.cancelButton}
                disabled={isSaving}
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                className={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกที่อยู่'}
              </button>
            </div>
            {saveError && <div className={styles.error}>{saveError}</div>}
            {saveSuccess && <div className={styles.success}>บันทึกข้อมูลเรียบร้อยแล้ว</div>}
          </form>
        ) : profile && profile.name && profile.address ? (
          <div className={styles.shippingInfo}>
            <div><b>ชื่อ:</b> {profile.name}</div>
            <div><b>ที่อยู่:</b> {profile.address}</div>
            <div className={styles.editButtonContainer}>
              <button 
                type="button" 
                onClick={handleEditClick}
                className={styles.editButton}
              >
                แก้ไขที่อยู่
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noAddress}>
            <div className={styles.error}>ยังไม่ได้กรอกที่อยู่</div>
            <button 
              type="button" 
              onClick={handleEditClick}
              className={styles.editButton}
            >
              เพิ่มที่อยู่จัดส่ง
            </button>
          </div>
        )}
      </div>
      <div className={styles.orderSubmitSection}>
        <h3>สร้างคำสั่งซื้อ</h3>
        {orderError && <div className={styles.error}>{orderError}</div>}
        <button 
          onClick={handleOrderSubmit} 
          disabled={isSubmitting || isOrderLoading || !profile?.name || !profile?.address}
          className={styles.submitButton}
        >
          {isSubmitting || isOrderLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการสั่งซื้อ'}
        </button>
      </div>
    </div>
  );
};

export default Checkout; 