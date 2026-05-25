/**
 * Formulario para crear/editar un lugar visitado.
 */
import { useState, useRef, useEffect } from 'react';
import LocationPickerMap from './LocationPickerMap';
import StarRating from './StarRating';

const EMPTY_FORM = {
  name: '',
  visit_date: '',
  comment: '',
  rating: null,
  google_maps_url: '',
  would_revisit: null,
  latitude: null,
  longitude: null,
};

export default function PlaceForm({ initialData = {}, onSubmit, onCancel, loading, onDirtyChange, submitRef, initialBounds }) {
  const formRef = useRef();

  useEffect(() => {
    if (submitRef) submitRef.current = () => formRef.current?.requestSubmit();
  }, []);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...initialData,
    comment: initialData.comment ?? '',
    google_maps_url: initialData.google_maps_url ?? '',
    latitude: initialData.latitude ? parseFloat(initialData.latitude) : null,
    longitude: initialData.longitude ? parseFloat(initialData.longitude) : null,
  });
  const [error, setError] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const photoInputRef = useRef();

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    onDirtyChange?.(true);
  };

  const handleLocationChange = ({ lat, lng }) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
    onDirtyChange?.(true);
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
      would_revisit: form.would_revisit,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
    };

    try {
      await onSubmit(payload, photoFiles.length ? photoFiles : null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Nombre del lugar *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ej: Café Laban"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Ubicación en el mapa</label>
        <LocationPickerMap
          lat={form.latitude}
          lng={form.longitude}
          onChange={handleLocationChange}
          initialBounds={initialBounds}
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
        <label className="form-label">¿Cuánto nos gustó?</label>
        <StarRating value={form.rating} onChange={(val) => set('rating', val)} />
      </div>

      <div className="form-group">
        <label className="form-label">¿Volvería a hacer?</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ val: true, label: '✓ Sí' }, { val: false, label: '✗ No' }].map(({ val, label }) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => set('would_revisit', form.would_revisit === val ? null : val)}
              className={`btn btn-sm ${form.would_revisit === val ? (val ? 'btn-primary' : 'btn-danger') : 'btn-outline'}`}
            >
              {label}
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

      <div className="form-group">
        <label className="form-label">Fotos <span style={{ fontWeight: 400, color: 'var(--color-text-light)' }}>(opcional)</span></label>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => { setPhotoFiles(Array.from(e.target.files)); onDirtyChange?.(true); }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => photoInputRef.current?.click()}
        >
          📷 {photoFiles.length > 0 ? `${photoFiles.length} foto${photoFiles.length !== 1 ? 's' : ''} seleccionada${photoFiles.length !== 1 ? 's' : ''}` : 'Seleccionar fotos'}
        </button>
        {photoFiles.length > 0 && (
          <span className="form-hint" style={{ display: 'block', marginTop: '4px' }}>
            Se subirán al guardar
          </span>
        )}
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
