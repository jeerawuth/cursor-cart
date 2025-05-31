import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import CreateOrder from './CreateOrder';

const Checkout = () => {
  const { cart, clearCart } = useCartStore();
  const user = useAuthStore(state => state.user);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  useEffect(() => {
    async function fetchProfile() {
      const token = user?.token || localStorage.getItem('token');
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
      } catch {
        setProfileError('โหลดข้อมูลโปรไฟล์ล้มเหลว');
      } finally {
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (orderSuccess) clearCart();
  }, [orderSuccess]);

  if (orderSuccess) {
    return <div style={{padding: 32}}><h2>สั่งซื้อสำเร็จ!</h2><a href="/orders">ดูคำสั่งซื้อของฉัน</a></div>;
  }

  if (!cart.length) return <div style={{padding: 32}}>ไม่มีสินค้าในตะกร้า</div>;

  return (
    <div style={{maxWidth: 600, margin: '0 auto', padding: 24}}>
      <h2>ตรวจสอบรายการสั่งซื้อ</h2>
      <ul>
        {cart.map(item => (
          <li key={item.id} style={{marginBottom: 8}}>
            {item.title} x {item.qty} = <b>{item.price * item.qty} บาท</b>
          </li>
        ))}
      </ul>
      <p style={{fontWeight:'bold'}}>รวมทั้งหมด: {total} บาท</p>
      <hr />
      <div style={{marginBottom: 16}}>
        <h3>ข้อมูลที่อยู่สำหรับจัดส่ง</h3>
        {profileLoading ? (
          <span>กำลังโหลดข้อมูล...</span>
        ) : profileError ? (
          <div style={{color:'red'}}>{profileError}</div>
        ) : profile && profile.address ? (
          <div style={{background:'#f3f3f3',padding:12,borderRadius:4}}>
            <div><b>ชื่อ:</b> {profile.name}</div>
            <div><b>ที่อยู่:</b> {profile.address}</div>
          </div>
        ) : (
          <div style={{color:'red'}}>ยังไม่ได้กรอกที่อยู่ กรุณากรอกที่อยู่ในฟอร์มด้านล่าง</div>
        )}
        {profile && profile.address && (
          <div style={{marginTop:8}}>
            <a href="/edit-profile">
              <button type="button">แก้ไขที่อยู่</button>
            </a>
          </div>
        )}
      </div>
      <CreateOrder cartItems={cart} onOrderSuccess={() => setOrderSuccess(true)} profile={profile} />
    </div>
  );
};

export default Checkout; 