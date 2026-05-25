import { useState, useRef, useEffect } from 'react';
import LocationPickerMap from './LocationPickerMap';
import PhotoSection from '../photos/PhotoSection';

const EMPTY_FORM = {
  name: '',
  description: '',
  google_maps_url: '',
  social_url: '',
  latitude: null,
  longitude: null,
};

export default function WishlistForm({ initialData = {}, onSubmit, onCancel, loading, onDirtyChange, submitRef, initialBounds, variant, liveUpload }) {
  const formRef = useRef();
  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (submitRef) submitRef.current = () => formRef.current?.requestSubmit();
  }, []);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...initialData,
    description: initialData.description ?? '',
    google_maps_url: initialData.google_maps_url ?? '',
    social_url: initialData.social_url ?? '',
    latitude: initialData.latitude ? parseFloat(initialData.latitude) : null,
    longitude: initialData.longitude ? parseFloat(initialData.longitude) : null,
  });
  const [error, setError] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const photoInputRef = useRef();

  // Edit mode: track live photos state
  const [livePhotos, setLivePhotos] = useState(initialData?.photos ?? []);
  const [uploading, setUploading] = useState(false);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    onDirtyChange?.(true);
  };

  const handleLocationChange = ({ lat, lng }) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
    onDirtyChange?.(true);
  };

  const handleLiveUpload = async (files) => {
    if (!liveUpload) return;
    setUploading(true);
    try {
      const newPhotos = await liveUpload(files);
      if (Array.isArray(newPhotos)) setLivePhotos(prev => [...prev, ...newPhotos]);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDeleted = (photoId) => {
    setLivePhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('El nombre es obligatorio');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      google_maps_url: form.google_maps_url.trim() || null,
      social_url: form.social_url.trim() || null,
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
          placeholder={variant === 'trip' ? 'Ej: Zanzibar, Italia...' : 'Ej: Monti'}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Descripción / por qué queremos ir</label>
        <textarea
          className="form-textarea"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={variant === 'trip' ? 'Ej: porque siempre quise ir, vimos reels re lindos...' : 'Ej: vimos un reel, tienen mucha pinta las papas...'}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Ubicación en el mapa</label>
        <LocationPickerMap
          lat={form.latitude}
          lng={form.longitude}
          onChange={handleLocationChange}
          initialBounds={initialBounds}
          variant={variant}
        />
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

      <div className="form-group">
        <label className="form-label">Fotos <span style={{ fontWeight: 400, color: 'var(--color-text-light)' }}>(opcional)</span></label>
        {isEdit ? (
          <PhotoSection
            photos={livePhotos}
            onUpload={handleLiveUpload}
            onDelete={() => {}}
            onCoverSet={() => {}}
            onPhotoDeleted={handlePhotoDeleted}
            uploading={uploading}
          />
        ) : (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
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
          </>
        )}
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
