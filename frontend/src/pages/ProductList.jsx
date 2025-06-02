import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './ProductList.module.css';
import { useCartStore } from '../store/cartStore';
import { fetchProducts } from '../api/products';
import { fetchCategories } from '../api/categories';
import ProductCard from '../components/ProductCard';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [popup, setPopup] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const addToCart = useCartStore(state => state.addToCart);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Load products based on filters
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      let categoryId = searchParams.get('category');
      if (categoryId === 'all' || !categoryId) {
        const allProducts = await fetchProducts();
        setProducts(allProducts);
      } else {
        const filteredProducts = await fetchProducts(categoryId);
        setProducts(filteredProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  // Initial load and when search params change
  useEffect(() => {
    const categoryParam = searchParams.get('category') || 'all';
    setSelectedCategory(categoryParam);
    loadProducts();
  }, [searchParams, loadProducts]);

  // Apply search filter and sorting
  let filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(filter.toLowerCase())
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

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    
    // Update URL with the new category
    const params = new URLSearchParams(searchParams);
    if (newCategory === 'all') {
      params.delete('category');
    } else {
      params.set('category', newCategory);
    }
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  return (
    <div className={styles.productList}>
      <h2>รายการสินค้า</h2>
      {popup && <div className={styles.popup}>{popup}</div>}
      
      <div className={styles.filters}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={styles.searchInput}
          />
        </form>

        <div className={styles.filterGroup}>
          <label htmlFor="category-filter">หมวดหมู่:</label>
          <select 
            id="category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className={styles.selectInput}
          >
            <option value="all">ทุกประเภท</option>
            {categories.map(cat => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.categoryName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="sort">เรียงตาม:</label>
          <select 
            id="sort"
            value={sort} 
            onChange={e => setSort(e.target.value)}
            className={styles.selectInput}
          >
            <option value="default">เรียงตามปกติ</option>
            <option value="asc">ราคาน้อย-มาก</option>
            <option value="desc">ราคามาก-น้อย</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>กำลังโหลดสินค้า...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className={styles.grid}>
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={handleAddToCart} 
            />
          ))}
        </div>
      ) : (
        <div className={styles.noResults}>
          <p>ไม่พบสินค้าที่ตรงกับการค้นหา</p>
        </div>
      )}
    </div>
  );
};

export default ProductList; 