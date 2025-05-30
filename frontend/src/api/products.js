import axios from 'axios';

const API_URL = 'http://localhost:4000/products';

export const fetchProducts = () => axios.get(API_URL).then(res => res.data);
export const fetchProductById = (id) => axios.get(`${API_URL}/${id}`).then(res => res.data);
