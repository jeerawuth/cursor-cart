import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductSlider.module.css';

const ProductSlider = ({ title, products, slidesToShow = 5 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShowState, setSlidesToShowState] = useState(slidesToShow);
  const sliderTrackRef = useRef(null);
  const autoSlideInterval = useRef(null);
  const navigate = useNavigate();

  // Auto slide every 5 seconds
  useEffect(() => {
    autoSlideInterval.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
      }
    };
  }, [currentSlide, products.length]);

  // Calculate slides to show based on screen width
  useEffect(() => {
    const updateSlidesToShow = () => {
      if (window.innerWidth < 640) return 2;
      if (window.innerWidth < 1024) return 3;
      if (window.innerWidth < 1280) return 4;
      return slidesToShow;
    };

    const handleResize = () => {
      const newSlidesToShow = updateSlidesToShow();
      setSlidesToShowState(newSlidesToShow);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [slidesToShow]);

  const nextSlide = () => {
    const maxSlide = Math.max(0, products.length - slidesToShowState);
    setCurrentSlide(prev => (prev >= maxSlide ? 0 : prev + 1));
  };

  const prevSlide = () => {
    const maxSlide = Math.max(0, products.length - slidesToShowState);
    setCurrentSlide(prev => (prev <= 0 ? maxSlide : prev - 1));
  };

  const getTransformValue = () => {
    return `translateX(-${currentSlide * (100 / slidesToShowState)}%)`;
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (products.length === 0) {
    return null; // Don't render if no products
  }

  const maxSlide = Math.max(0, products.length - slidesToShowState);
  const showControls = products.length > slidesToShowState;

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderHeader}>
        <h2 className={styles.sliderTitle}>{title}</h2>
        {showControls && (
          <div className={styles.sliderControls}>
            <button 
              className={`${styles.controlButton} ${currentSlide === 0 ? styles.disabled : ''}`} 
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              ←
            </button>
            <button 
              className={`${styles.controlButton} ${currentSlide >= maxSlide ? styles.disabled : ''}`} 
              onClick={nextSlide}
              aria-label="Next slide"
            >
              →
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.sliderTrack} ref={sliderTrackRef}>
        <div 
          className={styles.slides} 
          style={{ 
            transform: getTransformValue(),
            width: `${(products.length * 100) / slidesToShowState}%`
          }}
        >
          {products.map((product, index) => (
            <div 
              key={product.id} 
              className={`${styles.slide} ${index === currentSlide ? styles.activeSlide : ''}`}
              onClick={() => handleProductClick(product.id)}
              style={{ width: `${100 / slidesToShowState}%` }}
            >
              <div className={styles.productCard}>
                <div className={styles.imageContainer}>
                  <img 
                    src={product.image || '/placeholder-product.jpg'} 
                    alt={product.name || product.title} 
                    className={styles.productImage}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                </div>
                <div className={styles.productName}>
                  {product.name || product.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSlider;
