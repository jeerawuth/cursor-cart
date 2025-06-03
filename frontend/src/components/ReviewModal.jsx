import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../pages/Profile.module.css';

const ReviewModal = ({ isOpen, onClose, orderId, product, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal is closed
      setRating(0);
      setComment('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('กรุณาให้คะแนนสินค้า');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      // Decode the token to get user ID
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      console.log('Current user from token:', {
        id: tokenPayload.id,
        email: tokenPayload.email,
        role: tokenPayload.role
      });
      
      // Make sure we're using the correct product ID
      const productId = product.product_id || product.id;
      
      console.log('Token from localStorage:', token);
      console.log('Submitting review with data:', {
        order_id: orderId,
        product_id: productId, // Use the correct product ID
        rating,
        comment: comment.trim() || null,
        user_id: tokenPayload.id // Add user ID to the logged data
      });
      
      const response = await axios.post(
        'http://localhost:4000/api/reviews',
        {
          order_id: orderId,
          product_id: productId,
          rating,
          comment: comment.trim() || null
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Call the parent's onSubmit handler and wait for it to complete
      const result = await onSubmit(response.data);
      
      // If the parent handler returns an error, show it
      if (result && !result.success) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลรีวิว');
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting review:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        headers: err.response?.headers
      });
      
      let errorMessage = 'เกิดข้อผิดพลาดในการส่งรีวิว';
      if (err.response?.status === 403) {
        errorMessage = 'คุณไม่มีสิทธิ์รีวิวสินค้านี้';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="ปิด"
          disabled={isSubmitting}
        >
          &times;
        </button>
        
        <h3>รีวิวสินค้า: {product?.title}</h3>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>ให้คะแนน</label>
            <div className={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.starButton} ${star <= rating ? styles.filled : ''}`}
                  onClick={() => setRating(star)}
                  disabled={isSubmitting}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor={`comment-${product.id}`}>ความคิดเห็น (ไม่บังคับ)</label>
            <textarea
              id={`comment-${product.id}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`${styles.formInput} ${styles.textarea}`}
              rows="4"
              maxLength="500"
              disabled={isSubmitting}
            />
          </div>
          
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              className={styles.secondaryButton}
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
