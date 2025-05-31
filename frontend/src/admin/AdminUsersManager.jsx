import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './AdminDashboard.module.css';

const API_URL = 'http://localhost:4000/admin/users';

const AdminUsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});
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

  const handleRoleChange = async (userId, currentRole, newRole) => {
    // Skip if no change
    if (currentRole === newRole) return;
    
    // Show confirmation dialog
    const confirmMessage = `คุณแน่ใจหรือไม่ที่จะเปลี่ยนบทบาทผู้ใช้จาก "${currentRole}" เป็น "${newRole}"?`;
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
                  {updating[user.id] ? 'Updating...' : ''}
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
