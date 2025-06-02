import axios from 'axios';

const API_URL = 'http://localhost:4000/products';

export const fetchProducts = (categoryId) => {
  const url = categoryId ? `${API_URL}?category=${categoryId}` : API_URL;
  return axios.get(url).then(res => res.data);
};

export const fetchProductById = (id) => 
  axios.get(`${API_URL}/${id}`).then(res => res.data);
