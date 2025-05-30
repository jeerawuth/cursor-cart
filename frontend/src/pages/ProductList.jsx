import React, { useEffect, useState } from 'react';
import styles from './ProductList.module.css';
import { useCartStore } from '../store/cartStore';
import { fetchProducts } from '../api/products';
import { fetchCategories } from '../api/categories';
import ProductCard from '../components/ProductCard';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [popup, setPopup] = useState('');
  const addToCart = useCartStore(state => state.addToCart);

  useEffect(() => {
    fetchProducts().then(setProducts);
    fetchCategories().then(setCategories);
  }, []);

  let filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(filter.toLowerCase()) &&
    (category === 'all' || p.category === category)
  );

  if (sort === 'asc') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sort === 'desc') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  }

  const handleAddToCart = (product) => {
    addToCart(product);
    setPopup('เพิ่มสินค้าลงตะกร้าแล้ว');
    setTimeout(() => setPopup(''), 1500);
  };

  return (
    <div className={styles.productList}>
      <h2>รายการสินค้า</h2>
      {popup && <div className={styles.popup}>{popup}</div>}
      <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
        <input
          type="text"
          placeholder="ค้นหาสินค้า..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">ทุกประเภท</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="default">เรียงตามปกติ</option>
          <option value="asc">ราคาน้อย-มาก</option>
          <option value="desc">ราคามาก-น้อย</option>
        </select>
      </div>
      <div className={styles.grid}>
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
        ))}
      </div>
    </div>
  );
};

export default ProductList; 