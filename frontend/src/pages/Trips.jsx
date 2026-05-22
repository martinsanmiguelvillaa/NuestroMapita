/**
 * Página de Viajecitos.
 * Orden manual con drag-and-drop (mouse y touch long-press).
 * Al marcar un viaje como hecho, pasa a Ya hicimos.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTrips, createTrip, updateTrip,
  deleteTrip, reorderTripsBulk, getRandomTrip,
} from '../api/trips';
import { thumbUrl } from '../utils/cloudinary';

import { uploadTripPhotos } from '../api/photos';
import { convertTripToVisited } from '../api/trips';
import Modal from '../components/ui/Modal';
import WishlistForm from '../components/places/WishlistForm';
import { useDirtyForm } from '../hooks/useDirtyForm';
import ConvertModal from '../components/places/ConvertModal';
import PhotoSection from '../components/photos/PhotoSection';
import CoverPhoto from '../components/photos/CoverPhoto';
import SearchBar from '../components/ui/SearchBar';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import '../styles/places.css';
import '../styles/photos.css';

// ─── Tarjeta individual ──────────────────────────────────────────────────────

function TripCard({ place, onEdit, onDelete, onPhotosChanged, onConvert, isDragging }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      await uploadTripPhotos(place.id, files);
      onPhotosChanged?.();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: `¿Eliminar "${place.name}"?`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteTrip(place.id);
      onDelete?.();
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className={`wish-card fade-in${isDragging ? ' wish-card--dragging' : ''}`}>
      {photos.length > 0 && (
        <CoverPhoto
          photos={photos}
          coverIndex={coverIndex}
          onCoverIndexChange={setCoverIndex}
          onCoverClick={handleCoverClick}
          onPositionSaved={onPhotosChanged}
          aspectRatio="16/9"
        />
      )}

      <div className="wish-card__header">
        <h3 className="wish-card__name">
          {place.name}
          {place.latitude != null && <span className="card-map-pin" title="Aparece en el mapa">📍</span>}
        </h3>
      </div>

      {place.description && <p className="wish-card__desc">{place.description}</p>}

      <div style={{ margin: '8px 0' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowPhotos(!showPhotos)}
          style={{ fontSize: '12px' }}
        >
          📷 {photoCount > 0
            ? `${photoCount} foto${photoCount !== 1 ? 's' : ''}`
            : 'Fotos'}
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

      <div className="wish-card__links">
        {place.google_maps_url && (
          <a href={place.google_maps_url} target="_blank" rel="noreferrer" className="wish-card__link">
            🗺 Google Maps
          </a>
        )}
        {place.social_url && (
          <a href={place.social_url} target="_blank" rel="noreferrer" className="wish-card__link">
            📱 Ver reel
          </a>
        )}
      </div>

      <div className="wish-card__footer">
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(place)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '...' : 'Eliminar'}
          </button>
          <button className="btn-went" onClick={() => onConvert(place)}>
            ¡Ya fuimos!
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hook de drag-and-drop nativo (mouse + touch) ────────────────────────────

function useDragSort({ items, onOrderChange, disabled = false }) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);

  useEffect(() => {
    setOrder(items.map((i) => i.id));
  }, [items]);

  const onDragStart = (id) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const onDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggingId) setOverId(id);
  };

  const onDrop = (id) => (e) => {
    e.preventDefault();
    if (draggingId == null || draggingId === id) return;
    const newOrder = reinsert(order, draggingId, id);
    setOrder(newOrder);
    setDraggingId(null);
    setOverId(null);
    onOrderChange(newOrder);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const touchState = useRef({
    id: null, startY: 0, timer: null, active: false,
  });

  const onTouchStart = (id) => (e) => {
    touchState.current.id = id;
    touchState.current.startY = e.touches[0].clientY;
    touchState.current.active = false;
    touchState.current.timer = setTimeout(() => {
      touchState.current.active = true;
      setDraggingId(id);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 300);
  };

  const onTouchMove = (e) => {
    if (!touchState.current.active) {
      const delta = Math.abs(e.touches[0].clientY - touchState.current.startY);
      if (delta > 8) clearTimeout(touchState.current.timer);
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-drag-id]');
    if (card) {
      const targetId = parseInt(card.dataset.dragId, 10);
      if (targetId !== touchState.current.id) setOverId(targetId);
    }
  };

  const onTouchEnd = () => {
    clearTimeout(touchState.current.timer);
    if (touchState.current.active && touchState.current.id != null && overId != null) {
      const newOrder = reinsert(order, touchState.current.id, overId);
      setOrder(newOrder);
      onOrderChange(newOrder);
    }
    touchState.current.active = false;
    touchState.current.id = null;
    setDraggingId(null);
    setOverId(null);
  };

  function reinsert(ids, fromId, toId) {
    const arr = [...ids];
    const fromIdx = arr.indexOf(fromId);
    const toIdx = arr.indexOf(toId);
    arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, fromId);
    return arr;
  }

  const sortedItems = order.map((id) => items.find((item) => item.id === id)).filter(Boolean);

  const getItemProps = (id) => ({
    draggable: !disabled,
    'data-drag-id': id,
    onDragStart: disabled ? undefined : onDragStart(id),
    onDragOver: disabled ? undefined : onDragOver(id),
    onDrop: disabled ? undefined : onDrop(id),
    onDragEnd: disabled ? undefined : onDragEnd,
    onTouchStart: disabled ? undefined : onTouchStart(id),
    onTouchMove: disabled ? undefined : onTouchMove,
    onTouchEnd: disabled ? undefined : onTouchEnd,
    style: {
      opacity: draggingId === id ? 0.4 : 1,
      outline: overId === id && overId !== draggingId ? '2px dashed var(--color-brown)' : 'none',
      transition: 'opacity 0.15s, outline 0.1s',
    },
  });

  const dragHandleProps = { style: { touchAction: 'none', cursor: 'grab' } };

  return { sortedItems, draggingId, getItemProps, dragHandleProps };
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Trips() {
  const toast = useToast();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [convertPlace, setConvertPlace] = useState(null);
  const addForm = useDirtyForm();
  const editForm = useDirtyForm();
  const [randomPlace, setRandomPlace] = useState(null);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const data = await getTrips({ search: search || undefined }, signal);
      setPlaces(data);
      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleOrderChange = async (orderedIds) => {
    try {
      await reorderTripsBulk(orderedIds);
    } catch (err) {
      toast.error('No se pudo guardar el orden: ' + err.message);
    }
  };

  const { sortedItems, draggingId, getItemProps } = useDragSort({
    items: places,
    onOrderChange: handleOrderChange,
    disabled: !!search,
  });

  const handleCreate = async (data, files) => {
    setSaving(true);
    try {
      const newPlace = await createTrip(data);
      if (files?.length) await uploadTripPhotos(newPlace.id, files);
      addForm.setDirty(false);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await updateTrip(editing.id, data);
      editForm.setDirty(false);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleRandom = async () => {
    setRolling(true);
    try {
      const place = await getRandomTrip(randomPlace?.id);
      setRandomPlace(place);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="wishlist-bg">
    <div className="container">
      <div className="section-header">
        <h1 className="section-header__title">Viajecitos</h1>
        <div className="section-controls">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar..." />
          <button className="btn btn-rose" onClick={handleRandom} disabled={rolling || places.length === 0}>
            {rolling ? 'Eligiendo...' : 'Elegir al azar'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Agregar
          </button>
        </div>
      </div>

      {randomPlace && (
        <div className="random-card fade-in">
          {randomPlace.photos?.[0]?.cloudinary_url && (
            randomPlace.photos[0].resource_type === 'video' ? (
              <video
                key={randomPlace.id}
                src={randomPlace.photos[0].cloudinary_url}
                className="random-card__photo"
                autoPlay muted loop playsInline
              />
            ) : (
              <img
                src={thumbUrl(randomPlace.photos[0].cloudinary_url)}
                alt={randomPlace.name}
                className="random-card__photo"
              />
            )
          )}
          <p className="random-card__label">Nuestro próximo viajecito</p>
          <h2 className="random-card__name">{randomPlace.name}</h2>
          {randomPlace.address && (
            <p style={{ color: 'var(--color-text-mid)', marginBottom: '8px' }}>📍 {randomPlace.address}</p>
          )}
          {randomPlace.description && (
            <p style={{ fontStyle: 'italic', color: 'var(--color-text-mid)', marginBottom: '12px' }}>
              {randomPlace.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {randomPlace.google_maps_url && (
              <a href={randomPlace.google_maps_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                Ver en Maps
              </a>
            )}
            {randomPlace.social_url && (
              <a href={randomPlace.social_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                Ver reel
              </a>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleRandom}>Elegir otro</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRandomPlace(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Cargando...</div>
      ) : places.length === 0 ? (
        <div className="empty-state">
          <p>Todavía no hay viajecitos en la lista.</p>
          <button className="btn btn-rose" onClick={() => setShowForm(true)}>
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {sortedItems.map((place) => (
            <div key={place.id} {...getItemProps(place.id)}>
              <TripCard
                place={place}
                isDragging={draggingId === place.id}
                onEdit={setEditing}
                onDelete={load}
                onPhotosChanged={load}
                onConvert={setConvertPlace}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Modal
        isOpen={showForm}
        onClose={() => addForm.handleAttemptClose(() => setShowForm(false))}
        title="Agregar viajecito"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <WishlistForm
          onSubmit={handleCreate}
          onCancel={() => addForm.handleAttemptClose(() => setShowForm(false))}
          loading={saving}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
          variant="trip"
        />
      </Modal>
      {addForm.dialog}

      {/* Modal editar */}
      <Modal
        isOpen={!!editing}
        onClose={() => editForm.handleAttemptClose(() => setEditing(null))}
        title="Editar viajecito"
        fullscreen
        isDirty={editForm.isDirty}
      >
        {editing && (
          <WishlistForm
            initialData={{
              ...editing,
              google_maps_url: editing.google_maps_url || '',
              social_url: editing.social_url || '',
              description: editing.description || '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => editForm.handleAttemptClose(() => setEditing(null))}
            loading={saving}
            onDirtyChange={editForm.setDirty}
            submitRef={editForm.submitRef}
            variant="trip"
          />
        )}
      </Modal>
      {editForm.dialog}

      {/* Modal "Ya fuimos" */}
      {convertPlace && (
        <ConvertModal
          place={convertPlace}
          isOpen={!!convertPlace}
          onClose={() => setConvertPlace(null)}
          onConverted={() => { setConvertPlace(null); load(); }}
          convertFn={convertTripToVisited}
        />
      )}
    </div>
    </div>
  );
}
