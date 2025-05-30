import React, { useEffect, useState } from 'react';
import styles from './AdminDashboard.module.css';
import axios from 'axios';

const API_URL = 'http://localhost:4000/products';
const MOCK_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';

const emptyProduct = {
  title: '',
  price: '',
  description: '',
  category: '',
  image: '',
  rating_rate: '',
  rating_count: ''
};

const AdminProductManager = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setProducts(res.data);
    } catch (e) {
      setError('โหลดข้อมูลสินค้าล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = product => {
    setEditingId(product.id);
    setForm({
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      rating_rate: product.rating?.rate || product.rating_rate || '',
      rating_count: product.rating?.count || product.rating_count || ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyProduct);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.title || form.price === '') {
      setError('กรุณาระบุชื่อสินค้าและราคา');
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, { ...form });
        setSuccess('แก้ไขสินค้าสำเร็จ');
      } else {
        await axios.post(API_URL, { ...form });
        setSuccess('เพิ่มสินค้าสำเร็จ');
      }
      setForm(emptyProduct);
      setEditingId(null);
      fetchProducts();
    } catch (e) {
      setError('บันทึกข้อมูลล้มเหลว');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('ยืนยันการลบสินค้า?')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/${id}`);
      setSuccess('ลบสินค้าสำเร็จ');
      fetchProducts();
    } catch (e) {
      setError('ลบสินค้าล้มเหลว');
    }
  };

  return (
    <div className={styles.adminDashboard}>
      <h2>จัดการสินค้า</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      <form onSubmit={handleSubmit} className={styles.form} style={{marginBottom:'2rem'}}>
        <input name="title" value={form.title} onChange={handleChange} placeholder="ชื่อสินค้า" required />
        <input name="price" value={form.price} onChange={handleChange} placeholder="ราคา" type="number" required />
        <input name="category" value={form.category} onChange={handleChange} placeholder="หมวดหมู่" />
        <input name="image" value={form.image} onChange={handleChange} placeholder="URL รูปภาพ" />
        <input name="rating_rate" value={form.rating_rate} onChange={handleChange} placeholder="เรตติ้ง (rate)" type="number" step="0.1" />
        <input name="rating_count" value={form.rating_count} onChange={handleChange} placeholder="จำนวนโหวต (count)" type="number" />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="รายละเอียดสินค้า" />
        <button type="submit">{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}</button>
        {editingId && <button type="button" onClick={handleCancel}>ยกเลิก</button>}
      </form>
      <h3>รายการสินค้า</h3>
      {loading ? <p>กำลังโหลด...</p> : (
        <table style={{width:'100%',background:'#fff',borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อ</th>
              <th>หมวดหมู่</th>
              <th>ราคา</th>
              <th>รูป</th>
              <th>เรตติ้ง</th>
              <th>คำสั่ง</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                <td>{p.id}</td>
                <td>{p.title}</td>
                <td>{p.category}</td>
                <td>{p.price}</td>
                <td><img src={p.image || MOCK_IMAGE} alt={p.title} style={{width:40}} onError={e=>e.target.src=MOCK_IMAGE} /></td>
                <td>{p.rating?.rate ?? p.rating_rate} ({p.rating?.count ?? p.rating_count})</td>
                <td>
                  <button onClick={()=>handleEdit(p)} style={{marginRight:8}}>แก้ไข</button>
                  <button onClick={()=>handleDelete(p.id)} style={{color:'red'}}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminProductManager;
