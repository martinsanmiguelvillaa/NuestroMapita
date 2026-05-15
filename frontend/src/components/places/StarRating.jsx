import { useState } from 'react';
import '../../styles/places.css';

/**
 * Componente de rating con alas de hada.
 *
 * Props:
 * - value: número del 1 al 5 (o null)
 * - onChange: función que recibe el nuevo valor (null si se deselecciona)
 * - readOnly: solo muestra sin interactividad
 * - small: tamaño reducido para tarjetas
 * - showCount: muestra "X/5" junto a las alas (útil en readOnly)
 */
export default function StarRating({ value, onChange, readOnly = false, small = false, showCount = false }) {
  const [hover, setHover] = useState(0);

  const ratingClass = `star-rating${readOnly ? ' readonly' : ''}${small ? ' small' : ''}`;
  const active = hover || value || 0;

  return (
    <div className={ratingClass}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star${active >= star ? ' filled' : ''}`}
          onClick={() => !readOnly && onChange?.(value === star ? null : star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          disabled={readOnly}
          aria-label={`${star} ala${star > 1 ? 's' : ''}`}
        >
          <img src="/icons/alas-puntuacion.png" alt="" />
        </button>
      ))}
      {showCount && value && (
        <span className="star-rating__count">{value}/5</span>
      )}
    </div>
  );
}
