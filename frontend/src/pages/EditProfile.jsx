import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

export default function EditProfile() {
  const user = useAuthStore(state => state.user);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:4000/profile', {
          headers: { Authorization: 'Bearer ' + token }
        });
        setName(res.data.name || '');
        setAddress(res.data.address || '');
      } catch {
        setError('โหลดข้อมูลโปรไฟล์ล้มเหลว');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      const token = user?.token || localStorage.getItem('token');
      await axios.put('http://localhost:4000/profile', { name, address }, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setSuccess(true);
    } catch {
      setError('บันทึกไม่สำเร็จ');
    }
  };

  if (!user && !localStorage.getItem('token')) return <div>กรุณาเข้าสู่ระบบ</div>;
  if (loading) return <div>กำลังโหลดข้อมูล...</div>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>แก้ไขโปรไฟล์</h2>
      <div>
        <label>ชื่อ <input value={name} onChange={e => setName(e.target.value)} required /></label>
      </div>
      <div>
        <label>ที่อยู่ <textarea value={address} onChange={e => setAddress(e.target.value)} required /></label>
      </div>
      <button type="submit">บันทึก</button>
      {success && <div style={{ color: 'green' }}>บันทึกสำเร็จ</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}
