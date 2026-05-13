/**
 * Página de Lugares Visitados.
 * CRUD completo + upload de fotos + búsqueda + ordenamiento.
 */
import { useState, useEffect, useCallback } from 'react';
import { getVisited, createVisited, updateVisited, deleteVisited } from '../api/placesVisited';
import { uploadPhotos } from '../api/photos';
import Modal from '../components/ui/Modal';
import PlaceForm from '../components/places/PlaceForm';
import PhotoGallery from '../components/photos/PhotoGallery';
import SearchBar from '../components/ui/SearchBar';
import StarRating from '../components/places/StarRating';
import '../styles/places.css';
import '../styles/photos.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Tarjeta individual de lugar visitado
function PlaceCard({ place, onEdit, onDelete, onPhotosChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async () => {
    if (!photoFiles.length) return;
    setUploading(true);
    try {
      await uploadPhotos(place.id, photoFiles);
      setPhotoFiles([]);
      onPhotosChanged?.();
    } catch (err) {
      alert('Error al subir fotos: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${place.name}"? También se borrarán sus fotos.`)) return;
    setDeleting(true);
    try {
      await deleteVisited(place.id);
      onDelete?.();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
      setDeleting(false);
    }
  };

  const coverPhoto = place.photos?.[0]?.cloudinary_url;

  return (
    <div className="place-card fade-in">
      {/* Foto de portada */}
      {coverPhoto ? (
        <img src={coverPhoto} alt={place.name} className="place-card__photo" />
      ) : (
        <div className="place-card__photo-placeholder">📍</div>
      )}

      <div className="place-card__body">
        <h3 className="place-card__name">{place.name}</h3>
        <p className="place-card__date">{formatDate(place.visit_date)}</p>
        <p className="place-card__address">📍 {place.address}</p>
        {place.rating && <StarRating value={place.rating} readOnly small />}
        {place.comment && <p className="place-card__comment">"{place.comment}"</p>}

        {/* Expandir para ver más */}
        {expanded && (
          <div style={{ marginTop: '12px' }}>
            {place.google_maps_url && (
              <a href={place.google_maps_url} target="_blank" rel="noreferrer" className="wish-card__link">
                Ver en Google Maps
              </a>
            )}
            {/* Galería de fotos */}
            {place.photos?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '8px' }}>
                  {place.photos.length} foto{place.photos.length !== 1 ? 's' : ''}
                </p>
                <PhotoGallery photos={place.photos} onDelete={onPhotosChanged} />
              </div>
            )}
            {/* Upload de fotos */}
            <div style={{ marginTop: '12px' }}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
                style={{ fontSize: '12px', marginBottom: '8px' }}
              />
              {photoFiles.length > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo...' : `Subir ${photoFiles.length} foto${photoFiles.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="place-card__footer">
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Menos' : 'Ver más'}
        </button>
        <div className="place-card__actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(place)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Visited() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getVisited({ sort, search: search || undefined });
      setPlaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sort, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createVisited(data);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await updateVisited(editing.id, data);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      {/* Cabecera */}
      <div className="section-header">
        <h1 className="section-header__title">Lugares visitados</h1>
        <div className="section-controls">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar lugar..."
          />
          <select
            className="form-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: 'auto', padding: '8px 12px' }}
          >
            <option value="newest">Más reciente</option>
            <option value="oldest">Más antiguo</option>
            <option value="rating">Mejor rating</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Agregar lugar
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="loading-state">Cargando...</div>
      ) : places.length === 0 ? (
        <div className="empty-state">
          <p>Todavía no hay lugares visitados.</p>
          <button className="btn btn-rose" onClick={() => setShowForm(true)}>
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onEdit={setEditing}
              onDelete={load}
              onPhotosChanged={load}
            />
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo lugar visitado">
        <PlaceForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      </Modal>

      {/* Modal editar */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar lugar">
        {editing && (
          <PlaceForm
            initialData={{
              ...editing,
              visit_date: editing.visit_date || '',
              latitude: editing.latitude ? String(editing.latitude) : '',
              longitude: editing.longitude ? String(editing.longitude) : '',
              google_maps_url: editing.google_maps_url || '',
              comment: editing.comment || '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        )}
      </Modal>
    </div>
  );
}
