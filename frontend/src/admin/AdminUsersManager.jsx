import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './AdminUsersManager.module.css';

const API_URL = 'http://localhost:4000/admin/users';

const AdminUsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    // Prevent deleting if this is the last admin
    const adminCount = users.filter(user => user.role === 'admin').length;
    if (userRole === 'admin' && adminCount <= 1) {
      setError('ไม่สามารถลบผู้ดูแลระบบได้ เนื่องจากเป็นผู้ดูแลระบบคนสุดท้าย');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    setDeleting(userId);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('ไม่พบ Token การยืนยันตัวตน');
      }

      console.log(`Attempting to delete user ${userId}...`);
      const response = await axios.delete(`${API_URL}/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // This will prevent axios from throwing on HTTP error status
      });

      console.log('Delete response:', response);
      
      if (response.status === 200 && response.data.success) {
        // Update UI by removing the deleted user
        setUsers(users.filter(user => user.id !== userId));
        setSuccess('ลบผู้ใช้เรียบร้อยแล้ว');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = response.data || {};
        console.error('Delete failed:', errorData);
        throw new Error(
          errorData.error || 
          errorData.message || 
          `เกิดข้อผิดพลาดในการลบผู้ใช้ (Status: ${response.status})`
        );
      }
    } catch (err) {
      console.error('Error in handleDeleteUser:', err);
      let errorMessage = 'เกิดข้อผิดพลาดในการลบผู้ใช้';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        const errorData = err.response.data || {};
        errorMessage = errorData.error || errorData.message || `เกิดข้อผิดพลาด (${err.response.status})`;
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
      } else {
        // Something happened in setting up the request
        errorMessage = err.message || 'เกิดข้อผิดพลาดในการส่งคำร้องขอ';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleting(false);
    }
  };

  const handleRoleChange = async (userId, currentRole, newRole) => {
    // Skip if no change
    if (currentRole === newRole) return;
    
    // Prevent removing the last admin
    if (currentRole === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      setError('ไม่สามารถเปลี่ยนบทบาทได้ เนื่องจากเป็นผู้ดูแลระบบคนสุดท้าย');
      setTimeout(() => setError(''), 3000);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: currentRole } : user
      ));
      return;
    }
    
    // Show confirmation dialog
    const confirmMessage = `คุณแน่ใจหรือไม่ที่จะเปลี่ยนบทบาทผู้ใช้จาก "${currentRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกค้า'}" เป็น "${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกค้า'}"?`;
    if (!window.confirm(confirmMessage)) {
      // Reset the select to previous value if user cancels
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: currentRole } : user
      ));
      return;
    }
    
    setUpdating(prev => ({ ...prev, [userId]: true }));
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/${userId}/role`,
        { role: newRole },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local state with the updated user data from the server
      if (response.data && response.data.user) {
        setUsers(users.map(user => 
          user.id === userId ? response.data.user : user
        ));
      }
      
      setSuccess(response.data?.message || 'User role updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating user role:', err);
      const errorMessage = err.response?.data?.error || 
                         err.response?.data?.details || 
                         'Failed to update user role';
      setError(errorMessage);
      
      // Re-fetch users to ensure we have the latest data
      fetchUsers();
    } finally {
      setUpdating(prev => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div className={styles.loading}>Loading users...</div>;

  return (
    <div className={styles.container}>
      <h2>User Management</h2>
      
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name || 'N/A'}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, user.role, e.target.value)}
                    disabled={updating[user.id]}
                    className={styles.roleSelect}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleDeleteUser(user.id, user.role)}
                      disabled={updating[user.id] || deleting === user.id}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        opacity: (updating[user.id] || deleting === user.id) ? 0.6 : 1,
                      }}
                      title="ลบผู้ใช้"
                    >
                      {deleting === user.id ? 'กำลังลบ...' : 'ลบ'}
                    </button>
                    {updating[user.id] && <span>กำลังอัปเดต...</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersManager;
