import { useState, useEffect, useCallback, useRef } from 'react';
import { getVisited, createVisited, updateVisited, deleteVisited, convertBackToWishlist, convertBackToTrip } from '../api/placesVisited';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { uploadPhotos } from '../api/photos';
import Modal from '../components/ui/Modal';
import PlaceForm from '../components/places/PlaceForm';
import { useDirtyForm } from '../hooks/useDirtyForm';
import PhotoSection from '../components/photos/PhotoSection';
import CoverPhoto from '../components/photos/CoverPhoto';
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
  const confirm = useConfirm();
  const toast = useToast();
  const [showPhotos, setShowPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [convertingBack, setConvertingBack] = useState(false);
  const [coverIndex, setCoverIndex] = useState(0);
  const galleryRef = useRef(null);
  const pendingOpen = useRef(null);

  const photos = place.photos ?? [];
  const photoCount = photos.length;

  useEffect(() => {
    if (showPhotos && pendingOpen.current != null) {
      galleryRef.current?.openAt(pendingOpen.current);
      pendingOpen.current = null;
    }
  }, [showPhotos]);

  const handleCoverClick = (idx) => {
    if (showPhotos) {
      galleryRef.current?.openAt(idx);
    } else {
      pendingOpen.current = idx;
      setShowPhotos(true);
    }
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

  const handleConvertBack = async () => {
    const isTrip = place.source === 'trip';
    const destination = isTrip ? 'Viajecitos' : 'Por hacer';
    const ok = await confirm({
      title: `¿Devolver "${place.name}" a ${destination}?`,
      message: 'Se moverán las fotos pero se perderán el rating y la fecha.',
      confirmLabel: 'Devolver',
    });
    if (!ok) return;
    setConvertingBack(true);
    try {
      if (isTrip) {
        await convertBackToTrip(place.id);
      } else {
        await convertBackToWishlist(place.id);
      }
      onDelete?.();
    } catch (err) {
      toast.error('Error: ' + err.message);
      setConvertingBack(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `¿Eliminar "${place.name}"?`,
      message: 'También se borrarán sus fotos.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteVisited(place.id);
      onDelete?.();
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="place-card fade-in">
      {photos.length > 0 && (
        <CoverPhoto
          photos={photos}
          coverIndex={coverIndex}
          onCoverIndexChange={setCoverIndex}
          onCoverClick={handleCoverClick}
          onPositionSaved={onPhotosChanged}
          aspectRatio="4/3"
        />
      )}

      <div className="place-card__body">
        <h3 className="place-card__name">
          {place.name}
          {place.latitude != null && <span className="card-map-pin" title="Aparece en el mapa">📍</span>}
        </h3>
        <p className="place-card__date">{formatDate(place.visit_date)}</p>
        {place.rating && <StarRating value={place.rating} readOnly small />}
        {place.would_revisit != null && (
          <span className={`place-card__revisit-badge ${place.would_revisit ? 'place-card__revisit-badge--yes' : 'place-card__revisit-badge--no'}`}>
            {place.would_revisit ? '↩ Volvería a hacer' : '↩ No volvería a hacer'}
          </span>
        )}
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
                onCoverSet={onPhotosChanged}
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
        <button
          className="place-card__convert-back"
          onClick={handleConvertBack}
          disabled={convertingBack}
        >
          {convertingBack ? '...' : place.source === 'trip' ? '↩ Mover a Viajecitos' : '↩ Mover a Por hacer'}
        </button>
      </div>
    </div>
  );
}

export default function Visited() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [revisitFilter, setRevisitFilter] = useState(null); // null | true
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const addForm = useDirtyForm();
  const editForm = useDirtyForm();

  const load = useCallback(async (signal) => {
    try {
      const data = await getVisited({
        sort,
        search: search || undefined,
        revisit: revisitFilter ?? undefined,
      }, signal);
      setPlaces(data);
      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('No se pudieron cargar los lugares visitados');
      setLoading(false);
    }
  }, [sort, search, revisitFilter]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleCreate = async (data, files) => {
    setSaving(true);
    try {
      const newPlace = await createVisited(data);
      if (files?.length) {
        await uploadPhotos(newPlace.id, files);
      }
      addForm.setDirty(false);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data, files) => {
    setSaving(true);
    try {
      await updateVisited(editing.id, data);
      if (files?.length) await uploadPhotos(editing.id, files);
      editForm.setDirty(false);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="visited-bg">
    <div className="container">
      <div className="section-header">
        <h1 className="section-header__title">Ya hicimos</h1>
        <div className="section-controls">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar lugar..." />
          <button
            className={`btn btn-sm ${revisitFilter === true ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setRevisitFilter(revisitFilter === true ? null : true)}
          >
            ↩ Volvería a hacer
          </button>
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

      <Modal
        isOpen={showForm}
        onClose={() => addForm.handleAttemptClose(() => setShowForm(false))}
        title="Nuevo lugar visitado"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <PlaceForm
          onSubmit={handleCreate}
          onCancel={() => addForm.handleAttemptClose(() => setShowForm(false))}
          loading={saving}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
        />
      </Modal>
      {addForm.dialog}

      <Modal
        isOpen={!!editing}
        onClose={() => editForm.handleAttemptClose(() => setEditing(null))}
        title="Editar lugar"
        fullscreen
        isDirty={editForm.isDirty}
      >
        {editing && (
          <PlaceForm
            initialData={{
              ...editing,
              visit_date: editing.visit_date || '',
              google_maps_url: editing.google_maps_url || '',
              comment: editing.comment || '',
              would_revisit: editing.would_revisit ?? null,
            }}
            onSubmit={handleUpdate}
            onCancel={() => editForm.handleAttemptClose(() => setEditing(null))}
            loading={saving}
            onDirtyChange={editForm.setDirty}
            submitRef={editForm.submitRef}
          />
        )}
      </Modal>
      {editForm.dialog}
    </div>
    </div>
  );
}
