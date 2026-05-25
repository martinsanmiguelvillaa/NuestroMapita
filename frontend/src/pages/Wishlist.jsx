/**
 * Página de Lugares por Visitar.
 * Orden manual con drag-and-drop (mouse y touch long-press).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getWishlist, createWishlist, updateWishlist,
  deleteWishlist, reorderWishlistBulk, getRandomWishlist,
} from '../api/placesWishlist';
import { thumbUrl } from '../utils/cloudinary';

import { uploadWishlistPhotos } from '../api/photos';
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

function WishCard({ place, onEdit, onDelete, onPhotosChanged, onConvert, dragHandleProps, isDragging }) {
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
      await uploadWishlistPhotos(place.id, files);
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
      await deleteWishlist(place.id);
      onDelete?.();
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className={`wish-card fade-in${isDragging ? ' wish-card--dragging' : ''}`}>
      {/* Foto de portada (solo si hay fotos) */}
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

      {/* Fotos */}
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
            Ya fuimos
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

  // Sincroniza cuando cambia la lista externa (búsqueda, carga)
  useEffect(() => {
    setOrder(items.map((i) => i.id));
  }, [items]);

  // ── Desktop (HTML5 drag) ──
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

  // ── Mobile (touch long-press + drag) ──
  const touchState = useRef({
    id: null,
    startY: 0,
    timer: null,
    active: false,
  });

  const onTouchStart = (id) => (e) => {
    touchState.current.id = id;
    touchState.current.startY = e.touches[0].clientY;
    touchState.current.active = false;

    touchState.current.timer = setTimeout(() => {
      touchState.current.active = true;
      setDraggingId(id);
      // Vibración haptica si disponible
      if (navigator.vibrate) navigator.vibrate(40);
    }, 300);
  };

  const onTouchMove = (e) => {
    if (!touchState.current.active) {
      // Cancelar long press si se mueve antes de los 300ms
      const delta = Math.abs(e.touches[0].clientY - touchState.current.startY);
      if (delta > 8) {
        clearTimeout(touchState.current.timer);
      }
      return;
    }

    e.preventDefault(); // Bloquear scroll mientras arrastra

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

  // Reordena el array moviendo `fromId` a la posición de `toId`
  function reinsert(ids, fromId, toId) {
    const arr = [...ids];
    const fromIdx = arr.indexOf(fromId);
    const toIdx = arr.indexOf(toId);
    arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, fromId);
    return arr;
  }

  // Construye los sorted items según el orden actual
  const sortedItems = order
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean);

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

  const dragHandleProps = {
    style: { touchAction: 'none', cursor: 'grab' },
  };

  return { sortedItems, draggingId, getItemProps, dragHandleProps };
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Wishlist() {
  const toast = useToast();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [convertPlace, setConvertPlace] = useState(null);
  const addForm = useDirtyForm();
  const editForm = useDirtyForm();
  const [randomPlace, setRandomPlace] = useState(null);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const data = await getWishlist({ search: search || undefined }, signal);
      setPlaces(data);
      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('No se pudo cargar la lista');
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
      await reorderWishlistBulk(orderedIds);
    } catch (err) {
      toast.error('No se pudo guardar el orden: ' + err.message);
    }
  };

  const { sortedItems, draggingId, getItemProps, dragHandleProps } = useDragSort({
    items: places,
    onOrderChange: handleOrderChange,
    disabled: !!search,
  });

  const handleCreate = async (data, files) => {
    addForm.setDirty(false);
    setShowForm(false);
    const tid = toast.loading('Guardando lugar...');
    try {
      const newPlace = await createWishlist(data);
      if (files?.length) await uploadWishlistPhotos(newPlace.id, files);
      toast.resolve(tid, 'Lugar agregado a Por hacer');
      load();
    } catch (err) {
      toast.reject(tid, 'No se pudo guardar: ' + err.message);
    }
  };

  const handleUpdate = async (data, files) => {
    const id = editing.id;
    editForm.setDirty(false);
    setEditing(null);
    const tid = toast.loading('Guardando cambios...');
    try {
      await updateWishlist(id, data);
      if (files?.length) await uploadWishlistPhotos(id, files);
      toast.resolve(tid, 'Lugar actualizado');
      load();
    } catch (err) {
      toast.reject(tid, 'No se pudo guardar: ' + err.message);
      load();
    }
  };

  const handleRandom = async () => {
    setRolling(true);
    try {
      const place = await getRandomWishlist(randomPlace?.id);
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
      {/* Cabecera */}
      <div className="section-header">
        <h1 className="section-header__title">Por hacer</h1>
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

      {/* Resultado del sorteo */}
      {randomPlace && (
        <div className="random-card fade-in">
          {randomPlace.photos?.[0]?.cloudinary_url && (
            randomPlace.photos[0].resource_type === 'video' ? (
              <video
                key={randomPlace.id}
                src={randomPlace.photos[0].cloudinary_url}
                className="random-card__photo"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={thumbUrl(randomPlace.photos[0].cloudinary_url)}
                alt={randomPlace.name}
                className="random-card__photo"
              />
            )
          )}
          <p className="random-card__label">Nuestro próximo plan</p>
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

      {/* Lista */}
      {loading ? (
        <div className="loading-state">Cargando...</div>
      ) : places.length === 0 ? (
        <div className="empty-state">
          <p>Todavía no hay nada en la lista.</p>
          <button className="btn btn-rose" onClick={() => setShowForm(true)}>
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {sortedItems.map((place) => (
            <div key={place.id} {...getItemProps(place.id)}>
              <WishCard
                place={place}
                isDragging={draggingId === place.id}
                dragHandleProps={dragHandleProps}
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
        title="Agregar a Por hacer"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <WishlistForm
          onSubmit={handleCreate}
          onCancel={() => addForm.handleAttemptClose(() => setShowForm(false))}
          loading={false}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
          variant="wishlist"
        />
      </Modal>
      {addForm.dialog}

      {/* Modal editar */}
      <Modal
        isOpen={!!editing}
        onClose={() => editForm.handleAttemptClose(() => setEditing(null))}
        title="Editar lugar"
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
            loading={false}
            onDirtyChange={editForm.setDirty}
            submitRef={editForm.submitRef}
            variant="wishlist"
            liveUpload={(files) => uploadWishlistPhotos(editing.id, files)}
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
        />
      )}
    </div>
    </div>
  );
}
