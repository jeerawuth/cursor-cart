import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './AdminProductManager.module.css';

const API_URL = 'http://localhost:4000/products';
const MOCK_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';

const emptyProduct = {
  title: '',
  price: '',
  description: '',
  category: '',
  image: '',
  rating: {
    rate: 0,
    count: 0
  }
};

const AdminProductManager = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [popup, setPopup] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      // Convert flat rating structure to nested for consistent handling
      const normalizedProducts = response.data.map(product => {
        // If rating is an object, use it as is, otherwise create from flat structure
        const rating = typeof product.rating === 'object' ? product.rating : {
          rate: product.rating_rate || 0,
          count: product.rating_count || 0
        };
        
        return {
          ...product,
          rating: {
            rate: Number(rating.rate || 0),
            count: Number(rating.count || 0)
          }
        };
      });
      
      setProducts(normalizedProducts);
    } catch (e) {
      console.error('Error fetching products:', e);
      setError('ไม่สามารถโหลดข้อมูลสินค้าได้: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Temporary function to check product with ID 1
    const checkProductRating = async () => {
      try {
        const response = await axios.get(`${API_URL}/1`);
        console.log('Product ID 1 details:', response.data);
        console.log('Rating data:', response.data.rating);
      } catch (error) {
        console.error('Error fetching product details:', error);
      }
    };
    
    checkProductRating();
  }, []);

  const handleChange = e => {
    const { name, value, type } = e.target;
    
    // Convert value to appropriate type
    const parsedValue = type === 'number' ? 
      (value === '' ? '' : parseFloat(value)) : 
      value;
    
    // Handle nested rating object
    if (name.startsWith('rating.')) {
      const ratingField = name.split('.')[1];
      setForm(prevForm => ({
        ...prevForm,
        rating: {
          ...prevForm.rating,
          [ratingField]: parsedValue
        }
      }));
    } else {
      setForm(prevForm => ({
        ...prevForm,
        [name]: parsedValue
      }));
    }
  };

  const handleEdit = product => {
    console.log('Editing product:', product);
    setEditingId(product.id);
    
    // Handle both nested and flat rating structures
    const rating = {
      rate: product.rating?.rate ?? product.rating_rate ?? 0,
      count: product.rating?.count ?? product.rating_count ?? 0
    };
    
    setForm({
      title: product.title,
      price: product.price,
      description: product.description || '',
      category: product.category || '',
      image: product.image || MOCK_IMAGE,
      rating: {
        rate: Number(rating.rate) || 0,
        count: Number(rating.count) || 0
      }
    });
    
    setShowAddModal(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyProduct);
    setError('');
    setSuccess('');
    setShowAddModal(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!form.title || form.price === '') {
      setError('กรุณาระบุชื่อสินค้าและราคา');
      return;
    }
    
    // Prepare the data with proper types
    const productData = {
      title: form.title,
      price: Number(form.price),
      description: form.description || '',
      category: form.category || '',
      image: form.image || MOCK_IMAGE,
      rating_rate: form.rating?.rate ? Number(form.rating.rate) : 0,
      rating_count: form.rating?.count ? Number(form.rating.count) : 0
    };
    
    console.log('Sending data to API:', productData);
    
    setLoading(true);
    try {
      if (editingId) {
        const response = await axios.put(`${API_URL}/${editingId}`, productData);
        console.log('Update response:', response.data);
        setPopup('แก้ไขสินค้าสำเร็จ');
      } else {
        const response = await axios.post(API_URL, productData);
        console.log('Create response:', response.data);
        setPopup('เพิ่มสินค้าสำเร็จ');
      }
      
      // Reset form and refresh data
      setForm(emptyProduct);
      setEditingId(null);
      setShowAddModal(false);
      await fetchProducts();
      
      setTimeout(() => setPopup(''), 1500);
    } catch (e) {
      console.error('Error saving product:', e);
      setError('บันทึกข้อมูลล้มเหลว: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('ยืนยันการลบสินค้า?')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/${id}`);
      setPopup('ลบสินค้าสำเร็จ');
      fetchProducts();
      setTimeout(() => setPopup(''), 1500);
    } catch (e) {
      setError('ลบสินค้าล้มเหลว');
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setForm(emptyProduct);
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const closeModal = () => {
    setShowAddModal(false);
    handleCancel();
  };

  return (
    <div className={styles.adminDashboard}>
      {popup && (
        <div className={styles.popup}>
          {popup}
        </div>
      )}
      <div className={styles.header}>
        <h2 className={styles.title}>จัดการสินค้า</h2>
        <button 
          onClick={() => {
            setForm(emptyProduct);
            setEditingId(null);
            setShowAddModal(true);
          }}
          className={styles.addButton}
        >
          <span>+</span> เพิ่มสินค้า
        </button>
      </div>
      
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button 
              className={styles.closeButton}
              onClick={closeModal}
            >
              &times;
            </button>
            <h2>{editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่อสินค้า</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>ราคา</label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>หมวดหมู่</label>
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>ลิงก์รูปภาพ</label>
                <input
                  type="url"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="https://example.com/image.jpg"
                />
                {/* Image preview */}
                <div className={styles.imagePreviewContainer}>
                  <img 
                    src={form.image || MOCK_IMAGE} 
                    alt="Preview" 
                    className={styles.imagePreview}
                    onError={(e) => {
                      if (e.target.src !== MOCK_IMAGE) {
                        e.target.src = MOCK_IMAGE;
                      }
                    }}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>เรตติ้ง</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  name="rating.rate"
                  value={form.rating.rate}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>จำนวนรีวิว</label>
                <input
                  type="number"
                  min="0"
                  name="rating.count"
                  value={form.rating.count}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>รายละเอียด</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows="4"
                ></textarea>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                </button>
                <button type="button" onClick={closeModal} className={styles.secondaryButton}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className={styles.tableContainer}>
        <h3 className={styles.sectionTitle}>รายการสินค้า</h3>
        {loading ? (
          <p className={styles.loading}>กำลังโหลด...</p>
        ) : products.length === 0 ? (
          <p className={styles.empty}>ไม่พบสินค้า</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>ชื่อสินค้า</th>
                <th>หมวดหมู่</th>
                <th>ราคา</th>
                <th>รูปภาพ</th>
                <th>เรตติ้ง</th>
                <th>คำสั่ง</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    <div className={styles.productTitle}>
                      {p.title}
                    </div>
                  </td>
                  <td>{p.category || '-'}</td>
                  <td>{p.price ? `${p.price.toLocaleString()} บาท` : '-'}</td>
                  <td>
                    <img 
                      src={p.image || MOCK_IMAGE} 
                      alt={p.title} 
                      className={styles.productImage}
                      onError={(e) => {
                        if (e.target.src !== MOCK_IMAGE) {
                          e.target.src = MOCK_IMAGE;
                        }
                      }}
                    />
                  </td>
                  <td>
                    {(p.rating?.rate !== undefined || p.rating_rate !== undefined) ? (
                      <div className={styles.rating}>
                        {p.rating?.rate !== undefined ? p.rating.rate : p.rating_rate} ⭐
                        <span className={styles.reviewCount}>
                          ({p.rating?.count !== undefined ? p.rating.count : p.rating_count} รีวิว)
                        </span>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        onClick={() => {
                          handleEdit(p);
                          setShowAddModal(true);
                        }} 
                        className={styles.editButton}
                      >
                        แก้ไข
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        className={styles.deleteButton}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminProductManager;
