/**
 * Página de Lugares por Visitar.
 * CRUD completo + orden manual + sorteo aleatorio + "Ya fuimos".
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getWishlist, createWishlist, updateWishlist,
  deleteWishlist, reorderWishlist, getRandomWishlist,
} from '../api/placesWishlist';
import Modal from '../components/ui/Modal';
import WishlistForm from '../components/places/WishlistForm';
import ConvertModal from '../components/places/ConvertModal';
import SearchBar from '../components/ui/SearchBar';
import '../styles/places.css';

function WishCard({ place, onEdit, onDelete, onReorder, onConvert }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${place.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteWishlist(place.id);
      onDelete?.();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="wish-card fade-in">
      <div className="wish-card__header">
        <h3 className="wish-card__name">{place.name}</h3>
        {/* Botones de orden */}
        <div className="wish-card__order-controls">
          <button className="order-btn" onClick={() => onReorder(place.id, 'up')} title="Subir">▲</button>
          <button className="order-btn" onClick={() => onReorder(place.id, 'down')} title="Bajar">▼</button>
        </div>
      </div>

      {place.description && <p className="wish-card__desc">{place.description}</p>}
      <p className="wish-card__address">📍 {place.address}</p>

      {/* Links */}
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
        {/* Mover al principio / final */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onReorder(place.id, 'top')} title="Mover al principio">
            ⬆
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onReorder(place.id, 'bottom')} title="Mover al final">
            ⬇
          </button>
        </div>
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

export default function Wishlist() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [convertPlace, setConvertPlace] = useState(null);
  const [randomPlace, setRandomPlace] = useState(null);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getWishlist({ search: search || undefined });
      setPlaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createWishlist(data);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await updateWishlist(editing.id, data);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (id, direction) => {
    try {
      await reorderWishlist(id, direction);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRandom = async () => {
    setRolling(true);
    try {
      const place = await getRandomWishlist();
      setRandomPlace(place);
    } catch (err) {
      alert(err.message);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="container">
      {/* Cabecera */}
      <div className="section-header">
        <h1 className="section-header__title">Por visitar</h1>
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
          <p className="random-card__label">Nuestro próximo plan</p>
          <h2 className="random-card__name">{randomPlace.name}</h2>
          <p style={{ color: 'var(--color-text-mid)', marginBottom: '8px' }}>📍 {randomPlace.address}</p>
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
            <button className="btn btn-ghost btn-sm" onClick={handleRandom}>
              Elegir otro
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRandomPlace(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="loading-state">Cargando...</div>
      ) : places.length === 0 ? (
        <div className="empty-state">
          <p>No hay lugares por visitar todavía.</p>
          <button className="btn btn-rose" onClick={() => setShowForm(true)}>
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {places.map((place) => (
            <WishCard
              key={place.id}
              place={place}
              onEdit={setEditing}
              onDelete={load}
              onReorder={handleReorder}
              onConvert={setConvertPlace}
            />
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo lugar por visitar">
        <WishlistForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      </Modal>

      {/* Modal editar */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar lugar">
        {editing && (
          <WishlistForm
            initialData={{
              ...editing,
              google_maps_url: editing.google_maps_url || '',
              social_url: editing.social_url || '',
              description: editing.description || '',
              latitude: editing.latitude ? String(editing.latitude) : '',
              longitude: editing.longitude ? String(editing.longitude) : '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={saving}
          />
        )}
      </Modal>

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
  );
}
