import { useState, useEffect, useCallback, useRef } from 'react';
import { getVisited, createVisited, updateVisited, deleteVisited } from '../api/placesVisited';
import { uploadPhotos } from '../api/photos';
import Modal from '../components/ui/Modal';
import PlaceForm from '../components/places/PlaceForm';
import PhotoSection from '../components/photos/PhotoSection';
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

function PlaceCard({ place, onEdit, onDelete, onPhotosChanged }) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverIndex, setCoverIndex] = useState(0);
  const galleryRef = useRef(null);
  const pendingOpen = useRef(null);

  const photos = place.photos ?? [];
  const photoCount = photos.length;

  // When showPhotos becomes true after a cover click, trigger the lightbox
  useEffect(() => {
    if (showPhotos && pendingOpen.current != null) {
      galleryRef.current?.openAt(pendingOpen.current);
      pendingOpen.current = null;
    }
  }, [showPhotos]);

  const handleCoverClick = () => {
    pendingOpen.current = coverIndex;
    setShowPhotos(true);
  };

  const prevCover = (e) => {
    e.stopPropagation();
    setCoverIndex((i) => (i - 1 + photoCount) % photoCount);
  };

  const nextCover = (e) => {
    e.stopPropagation();
    setCoverIndex((i) => (i + 1) % photoCount);
  };

  const handleUpload = async (files) => {
    setUploading(true);
    try {
      await uploadPhotos(place.id, files);
      onPhotosChanged?.();
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

  const safeIndex = photoCount > 0 ? Math.min(coverIndex, photoCount - 1) : 0;
  const coverUrl = photos[safeIndex]?.cloudinary_url;

  return (
    <div className="place-card fade-in">
      {/* Foto de portada con flechas */}
      <div className="place-card__photo-wrapper">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={place.name}
            className="place-card__photo"
            onClick={handleCoverClick}
          />
        ) : (
          <div className="place-card__photo-placeholder">📍</div>
        )}
        {photoCount > 1 && (
          <>
            <button className="place-card__cover-arrow place-card__cover-arrow--prev" onClick={prevCover}>‹</button>
            <button className="place-card__cover-arrow place-card__cover-arrow--next" onClick={nextCover}>›</button>
            <span className="place-card__photo-counter">{safeIndex + 1}/{photoCount}</span>
          </>
        )}
      </div>

      <div className="place-card__body">
        <h3 className="place-card__name">{place.name}</h3>
        <p className="place-card__date">{formatDate(place.visit_date)}</p>
        {place.address && <p className="place-card__address">📍 {place.address}</p>}
        {place.rating && <StarRating value={place.rating} readOnly small />}
        {place.comment && <p className="place-card__comment">"{place.comment}"</p>}

        {place.google_maps_url && (
          <a
            href={place.google_maps_url}
            target="_blank"
            rel="noreferrer"
            className="wish-card__link"
            style={{ marginTop: '6px', display: 'inline-block' }}
          >
            🗺 Ver en Google Maps
          </a>
        )}

        {/* Sección fotos */}
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowPhotos(!showPhotos)}
            style={{ fontSize: '12px' }}
          >
            📷 {photoCount > 0 ? `${photoCount} foto${photoCount !== 1 ? 's' : ''}` : 'Fotos'}
            {showPhotos ? ' ▲' : ' ▼'}
          </button>

          {showPhotos && (
            <div style={{ marginTop: '8px' }}>
              <PhotoSection
                photos={photos}
                onUpload={handleUpload}
                onDelete={onPhotosChanged}
                uploading={uploading}
                galleryRef={galleryRef}
              />
            </div>
          )}
        </div>
      </div>

      <div className="place-card__footer">
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

  const handleCreate = async (data, files) => {
    setSaving(true);
    try {
      const newPlace = await createVisited(data);
      if (files?.length) {
        await uploadPhotos(newPlace.id, files);
      }
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
      <div className="section-header">
        <h1 className="section-header__title">Lugares visitados</h1>
        <div className="section-controls">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar lugar..." />
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

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo lugar visitado">
        <PlaceForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar lugar">
        {editing && (
          <PlaceForm
            initialData={{
              ...editing,
              visit_date: editing.visit_date || '',
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
