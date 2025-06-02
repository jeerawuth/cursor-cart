import axios from 'axios';

const API_URL = 'http://localhost:4000/categories';

export const fetchCategories = () => 
  axios.get(API_URL).then(res => res.data);

export const createCategory = (categoryData, token) =>
  axios.post(API_URL, categoryData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }).then(res => res.data);

export const updateCategory = (categoryId, categoryData, token) =>
  axios.put(`${API_URL}/${categoryId}`, categoryData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }).then(res => res.data);

export const deleteCategory = (categoryId, token) =>
  axios.delete(`${API_URL}/${categoryId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(res => res.data);
