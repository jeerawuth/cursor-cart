import React from 'react';
import styles from './Rating.module.css';

const Rating = ({ rating, reviewCount, showCount = true, size = 'medium' }) => {
  // Handle both flat and nested rating structures
  const rate = rating?.rate ?? rating?.rating_rate ?? 0;
  const count = rating?.count ?? rating?.rating_count ?? 0;
  
  const fullStars = Math.floor(rate);
  const hasPartialStar = rate % 1 > 0;
  const emptyStars = 5 - fullStars - (hasPartialStar ? 1 : 0);
  const partialStarPercentage = Math.round((rate % 1) * 100);

  return (
    <div className={`${styles.rating} ${styles[size]}`}>
      <div className={styles.stars}>
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className={styles.star}>★</span>
        ))}

        {/* Partial star */}
        {hasPartialStar && (
          <div className={styles.partialStarContainer}>
            <span className={styles.star} style={{
              '--star-percentage': `${partialStarPercentage}%`,
              display: 'inline-block',
              width: '1em',
              height: '1em',
              lineHeight: 1,
              textAlign: 'center',
              verticalAlign: 'middle'
            }}>★</span>
          </div>
        )}

        {/* Empty stars */}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className={`${styles.star} ${styles.emptyStar}`}>★</span>
        ))}
      </div>
      {showCount && count > 0 && (
        <span className={styles.reviewCount}>({count} รีวิว)</span>
      )}
    </div>
  );
};

export default Rating;
