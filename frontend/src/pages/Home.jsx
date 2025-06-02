import React, { useState, useEffect } from 'react';
import styles from './Home.module.css';
import ProductSlider from '../components/ProductSlider/ProductSlider';
import { fetchProducts } from '../api/products';
import { useCartStore } from '../store/cartStore';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore(state => state.addToCart);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const products = await fetchProducts();
        
        // Create featured products (first 10 products)
        setFeaturedProducts(products.slice(0, 10));
        
        // Create new arrivals (last 10 products, but make sure we don't go out of bounds)
        const start = Math.max(0, products.length - 10);
        setNewArrivals(products.slice(start).reverse());
        
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleAddToCart = (product) => {
    addToCart({
      ...product,
      title: product.name || product.title, // Use name or title, whichever is available
      image: product.image || 'https://via.placeholder.com/300x200?text=No+Image'
    });
  };

  if (loading) {
    return <div className={styles.loading}>กำลังโหลดสินค้า...</div>;
  }

  return (
    <div className={styles.home}>
      <div className={styles.hero}>
        <h1>ยินดีต้อนรับสู่ร้านค้าออนไลน์</h1>
        <p>เลือกชมสินค้าและสั่งซื้อได้เลย!</p>
      </div>

      {featuredProducts.length > 0 && (
        <section className={styles.sliderSection}>
          <h2>สินค้ายอดนิยม</h2>
          <ProductSlider 
            products={featuredProducts}
            onAddToCart={handleAddToCart}
          />
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className={styles.sliderSection}>
          <h2>สินค้ามาใหม่</h2>
          <ProductSlider 
            products={newArrivals}
            onAddToCart={handleAddToCart}
          />
        </section>
      )}
    </div>
  );
};

export default Home; 