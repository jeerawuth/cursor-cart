import axios from 'axios';

const API_URL = 'https://fakestoreapi.com/products/categories';

export const fetchCategories = () => axios.get(API_URL).then(res => res.data);
