/**
 * Formulario para crear/editar un lugar visitado.
 */
import { useState } from 'react';
import LocationPickerMap from './LocationPickerMap';

const EMPTY_FORM = {
  name: '',
  visit_date: '',
  comment: '',
  rating: null,
  google_maps_url: '',
  latitude: null,
  longitude: null,
};

export default function PlaceForm({ initialData = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...initialData,
    latitude: initialData.latitude ? parseFloat(initialData.latitude) : null,
    longitude: initialData.longitude ? parseFloat(initialData.longitude) : null,
  });
  const [error, setError] = useState('');

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleLocationChange = ({ lat, lng }) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.visit_date) return setError('La fecha de visita es obligatoria');

    const payload = {
      name: form.name.trim(),
      visit_date: form.visit_date,
      comment: form.comment.trim() || null,
      rating: form.rating || null,
      google_maps_url: form.google_maps_url.trim() || null,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Nombre del lugar *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ej: Café de los Angelitos"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Ubicación en el mapa</label>
        <LocationPickerMap
          lat={form.latitude}
          lng={form.longitude}
          onChange={handleLocationChange}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Fecha de visita *</label>
        <input
          className="form-input"
          type="date"
          value={form.visit_date}
          onChange={(e) => set('visit_date', e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Comentario</label>
        <textarea
          className="form-textarea"
          value={form.comment}
          onChange={(e) => set('comment', e.target.value)}
          placeholder="¿Qué fue lo que más te gustó?"
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
              onClick={() => set('rating', form.rating === s ? null : s)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.6rem',
                cursor: 'pointer',
                color: (form.rating || 0) >= s ? 'var(--color-star)' : 'var(--color-beige-dark)',
                padding: '2px',
                transition: 'transform 0.1s',
              }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Link de Google Maps</label>
        <input
          className="form-input"
          type="url"
          value={form.google_maps_url}
          onChange={(e) => set('google_maps_url', e.target.value)}
          placeholder="https://maps.google.com/..."
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar lugar'}
        </button>
      </div>
    </form>
  );
}
