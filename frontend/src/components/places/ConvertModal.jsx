/**
 * Modal "Ya fuimos" - convierte un lugar de la wishlist en visitado.
 * Pre-rellena los datos que ya tenemos y pide fecha + comentario + rating.
 */
import { useState } from 'react';
import Modal from '../ui/Modal';
import { convertToVisited } from '../../api/placesWishlist';

export default function ConvertModal({ place, isOpen, onClose, onConverted }) {
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState(place?.description || '');
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!visitDate) return setError('La fecha de visita es obligatoria');

    setLoading(true);
    try {
      await convertToVisited(place.id, {
        visit_date: visitDate,
        comment: comment.trim() || null,
        rating: rating || null,
      });
      onConverted?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ya fuimos">
      <p style={{ color: 'var(--color-text-mid)', marginBottom: '16px', fontStyle: 'italic' }}>
        Genial! Completá los datos de la visita a <strong>{place?.name}</strong>.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Datos que ya teníamos (solo lectura) */}
        <div className="form-group">
          <label className="form-label">Lugar</label>
          <input className="form-input" value={place?.name || ''} disabled />
        </div>

        <div className="form-group">
          <label className="form-label">Dirección</label>
          <input className="form-input" value={place?.address || ''} disabled />
        </div>

        {/* Datos nuevos */}
        <div className="form-group">
          <label className="form-label">Fecha de visita *</label>
          <input
            className="form-input"
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Comentario</label>
          <textarea
            className="form-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Cómo estuvo?"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Rating</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1,2,3,4,5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(rating === s ? null : s)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.6rem',
                  cursor: 'pointer',
                  color: (rating || 0) >= s ? 'var(--color-star)' : 'var(--color-beige-dark)',
                  padding: '2px',
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '16px' }}>
          Podés agregar fotos desde la página de lugares visitados después de guardar.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-rose" disabled={loading}>
            {loading ? 'Guardando...' : 'Confirmar visita'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
