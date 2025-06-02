import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './AdminProductManager.module.css';

const API_URL = 'http://localhost:4000/categories';

const getAuthHeader = (token) => ({
  headers: { 'Authorization': `Bearer ${token}` }
});

const AdminCategoriesManager = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ categoryName: '', categoryNote: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [popup, setPopup] = useState('');

  const { token } = useAuthStore();

  const fetchCategories = async () => {
    if (!token) {
      setError('กรุณาเข้าสู่ระบบก่อน');
      return;
    }
    
    try {
      const response = await axios.get(API_URL, getAuthHeader(token));
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('ไม่สามารถโหลดรายการหมวดหมู่ได้: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    const categoryData = {
      categoryName: form.categoryName.trim(),
      categoryNote: form.categoryNote?.trim() || ''
    };

    if (!categoryData.categoryName) {
      setError('กรุณาระบุชื่อหมวดหมู่');
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting form data:', categoryData);
      
      let response;
      if (editingId) {
        // Update existing category
        response = await axios.put(
          `${API_URL}/${editingId}`,
          categoryData,
          getAuthHeader(token)
        );
        setPopup('อัปเดตหมวดหมู่สำเร็จ');
      } else {
        // Create new category
        response = await axios.post(
          API_URL,
          categoryData,
          getAuthHeader(token)
        );
        setPopup('เพิ่มหมวดหมู่สำเร็จ');
      }
      
      console.log('API Response:', response.data);
      
      // Reset form and fetch updated categories
      setForm({ categoryName: '', categoryNote: '' });
      setEditingId(null);
      setShowAddModal(false);
      
      // Add a small delay to ensure the database has been updated
      setTimeout(() => {
        fetchCategories().catch(err => {
          console.error('Error refreshing categories:', err);
          setError('ไม่สามารถโหลดรายการหมวดหมู่ล่าสุดได้');
        });
      }, 300);
      
    } catch (error) {
      console.error('Error saving category:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          headers: error.config?.headers
        }
      });
      
      let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      
      if (error.response) {
        // Handle specific error messages from the server
        if (error.response.status === 400) {
          errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        } else if (error.response.status === 401) {
          errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
        } else if (error.response.status === 403) {
          errorMessage = 'คุณไม่มีสิทธิ์ดำเนินการนี้';
        } else if (error.response.status === 500) {
          errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์';
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setForm({
      categoryName: category.categoryName,
      categoryNote: category.categoryNote || ''
    });
    setEditingId(category.categoryId);
    setShowAddModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('ยืนยันการลบหมวดหมู่นี้?')) return;
    
    if (!token) {
      setError('กรุณาเข้าสู่ระบบก่อน');
      return;
    }
    
    try {
      console.log('Attempting to delete category ID:', categoryId);
      const response = await axios.delete(
        `${API_URL}/${categoryId}`,
        {
          ...getAuthHeader(token),
          data: {} // Ensure we send an empty object as the request body
        }
      );
      console.log('Delete response:', response.data);
      setPopup('ลบหมวดหมู่สำเร็จ');
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          headers: error.config?.headers
        }
      });
      
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         'ไม่สามารถลบหมวดหมู่ได้: ' + error.message;
      setError(errorMessage);
    }
  };

  const handleCancel = () => {
    setForm({ categoryName: '', categoryNote: '' });
    setEditingId(null);
    setShowAddModal(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className={styles.adminDashboard}>
      {popup && (
        <div className={styles.popup}>
          {popup}
        </div>
      )}
      
      <div className={styles.header}>
        <h2 className={styles.title}>จัดการหมวดหมู่สินค้า</h2>
        <button 
          onClick={() => {
            setForm({ categoryName: '', categoryNote: '' });
            setEditingId(null);
            setShowAddModal(true);
          }}
          className={styles.addButton}
        >
          <span>+</span> เพิ่มหมวดหมู่
        </button>
      </div>
      
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ชื่อหมวดหมู่</th>
              <th>หมายเหตุ</th>
              <th>วันที่สร้าง</th>
              <th>วันที่อัปเดต</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.categoryId}>
                <td>{category.categoryName}</td>
                <td>{category.categoryNote || '-'}</td>
                <td>{new Date(category.createdAt).toLocaleDateString('th-TH')}</td>
                <td>{new Date(category.updatedAt).toLocaleDateString('th-TH')}</td>
                <td>
                  <div className={styles.actionButtons}>
                    <button 
                      onClick={() => handleEdit(category)}
                      className={styles.editButton}
                    >
                      แก้ไข
                    </button>
                    <button 
                      onClick={() => handleDelete(category.categoryId)}
                      className={styles.deleteButton}
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>ไม่พบข้อมูลหมวดหมู่</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Category Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button 
              className={styles.closeButton}
              onClick={handleCancel}
            >
              &times;
            </button>
            <h2>{editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  name="categoryName"
                  value={form.categoryName}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>หมายเหตุ (ไม่บังคับ)</label>
                <input
                  type="text"
                  name="categoryNote"
                  value={form.categoryNote}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formActions}>
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className={styles.cancelButton}
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={loading}
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesManager;
