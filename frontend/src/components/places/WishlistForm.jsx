import { useState } from 'react';

const EMPTY_FORM = {
  name: '',
  description: '',
  address: '',
  google_maps_url: '',
  social_url: '',
  latitude: '',
  longitude: '',
};

export default function WishlistForm({ initialData = {}, onSubmit, onCancel, loading }) {
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
        alert('No se encontraron coordenadas. Podés ingresarlas manualmente.');
      }
    } catch {
      alert('Error al buscar la ubicación.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.address.trim()) return setError('La dirección es obligatoria');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim(),
      google_maps_url: form.google_maps_url.trim() || null,
      social_url: form.social_url.trim() || null,
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
          placeholder="Ej: Restaurante La Mar"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Descripción / por qué queremos ir</label>
        <textarea
          className="form-textarea"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Lo recomendó alguien, lo vimos en Instagram..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Dirección *</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Ej: Av. Corrientes 1234, CABA"
            required
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleGeocode}
            disabled={geocoding}
            style={{ whiteSpace: 'nowrap' }}
          >
            {geocoding ? '...' : '📍 Buscar'}
          </button>
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

      <div className="form-group">
        <label className="form-label">Link de Reel / TikTok / Instagram</label>
        <input
          className="form-input"
          type="url"
          value={form.social_url}
          onChange={(e) => set('social_url', e.target.value)}
          placeholder="https://www.instagram.com/reel/..."
        />
        <span className="form-hint">Opcional: el link que te lo hizo querer visitar</span>
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
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
