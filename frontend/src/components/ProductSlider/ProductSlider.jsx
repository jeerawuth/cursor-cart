import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductSlider.module.css';

const ProductSlider = ({ title, products, slidesToShow = 5 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShowState, setSlidesToShowState] = useState(slidesToShow);
  const sliderTrackRef = useRef(null);
  const autoSlideInterval = useRef(null);
  const navigate = useNavigate();

  // Auto slide every 3 seconds
  useEffect(() => {
    autoSlideInterval.current = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
      }
    };
  }, [currentSlide, products.length]);

  // Calculate slides to show based on screen width with better breakpoints
  useEffect(() => {
    const updateSlidesToShow = () => {
      const width = window.innerWidth;
      if (width < 480) return 1;     // Extra small: 1 product
      if (width < 768) return 2;     // Small: 2 products
      if (width < 1024) return 3;    // Medium: 3 products
      if (width < 1440) return 4;    // Large: 4 products
      return 5;                      // Extra large: 5 products
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
    const slidePercentage = 100 / slidesToShowState;
    return `translateX(calc(-${currentSlide * slidePercentage}% - ${currentSlide * 0.5}rem))`;
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
      <div className={styles.sliderWrapper}>
        {showControls && (
          <>
            <button 
              className={`${styles.controlButton} ${styles.prevButton} ${currentSlide === 0 ? styles.disabled : ''}`} 
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              ←
            </button>
            <button 
              className={`${styles.controlButton} ${styles.nextButton} ${currentSlide >= maxSlide ? styles.disabled : ''}`} 
              onClick={nextSlide}
              aria-label="Next slide"
            >
              →
            </button>
          </>
        )}
        
        <div className={styles.sliderTrack} ref={sliderTrackRef}>
          <div 
            className={styles.slides} 
            style={{ 
              transform: getTransformValue(),
              width: `calc(100% + 1rem)`,
              '--slides-per-view': slidesToShowState
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
    </div>
  );
};

export default ProductSlider;
