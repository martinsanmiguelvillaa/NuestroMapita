/**
 * Formulario para crear/editar un lugar visitado.
 * También incluye geocodificación con Nominatim (opcional).
 */
import { useState } from 'react';

const EMPTY_FORM = {
  name: '',
  address: '',
  visit_date: '',
  comment: '',
  rating: null,
  google_maps_url: '',
  latitude: '',
  longitude: '',
};

export default function PlaceForm({ initialData = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialData });
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleGeocode = async () => {
    if (!form.address.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`,
        { headers: { 'User-Agent': 'NuestroMapita/1.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        set('latitude', parseFloat(data[0].lat).toFixed(7));
        set('longitude', parseFloat(data[0].lon).toFixed(7));
      } else {
        alert('No se encontraron coordenadas para esa dirección. Podés ingresarlas manualmente.');
      }
    } catch {
      alert('No se pudo buscar la ubicación. Verificá tu conexión.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.address.trim()) return setError('La dirección es obligatoria');
    if (!form.visit_date) return setError('La fecha de visita es obligatoria');

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      visit_date: form.visit_date,
      comment: form.comment.trim() || null,
      rating: form.rating || null,
      google_maps_url: form.google_maps_url.trim() || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
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
        <label className="form-label">Dirección *</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Ej: Rivadavia 2100, Buenos Aires"
            required
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleGeocode}
            disabled={geocoding}
            title="Buscar coordenadas automáticamente"
            style={{ whiteSpace: 'nowrap' }}
          >
            {geocoding ? '...' : '📍 Buscar'}
          </button>
        </div>
        <span className="form-hint">Tocá "Buscar" para obtener coordenadas automáticamente y que aparezca en el mapa.</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">Latitud</label>
          <input
            className="form-input"
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => set('latitude', e.target.value)}
            placeholder="-34.6037"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Longitud</label>
          <input
            className="form-input"
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => set('longitude', e.target.value)}
            placeholder="-58.3816"
          />
        </div>
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
