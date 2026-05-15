import { useState } from 'react';
import '../../styles/places.css';

/**
 * Componente de rating con estrellas.
 *
 * Props:
 * - value: número del 1 al 5 (o null)
 * - onChange: función que recibe el nuevo valor (solo si no es readOnly)
 * - readOnly: si es true, solo muestra las estrellas sin interactividad
 * - small: tamaño reducido para usar en tarjetas
 */
export default function StarRating({ value, onChange, readOnly = false, small = false }) {
  const [hover, setHover] = useState(0);

  const ratingClass = `star-rating${readOnly ? ' readonly' : ''}${small ? ' small' : ''}`;

  return (
    <div className={ratingClass}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star${(hover || value) >= star ? ' filled' : ''}`}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          disabled={readOnly}
          aria-label={`${star} ala${star > 1 ? 's' : ''}`}
        >
          <img src="/icons/alas-puntuacion.png" alt="" />
        </button>
      ))}
    </div>
  );
}
