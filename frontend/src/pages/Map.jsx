/**
 * Página del Mapa.
 * Muestra todos los pines con filtros por tipo y buscador.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { getMapPins } from '../api/map';
import { createVisited } from '../api/placesVisited';
import { createWishlist } from '../api/placesWishlist';
import { createTrip } from '../api/trips';
import { uploadPhotos, uploadWishlistPhotos, uploadTripPhotos } from '../api/photos';
import MapView from '../components/map/MapView';
import ConvertModal from '../components/places/ConvertModal';
import Modal from '../components/ui/Modal';
import PlaceForm from '../components/places/PlaceForm';
import WishlistForm from '../components/places/WishlistForm';
import { useDirtyForm } from '../hooks/useDirtyForm.jsx';
import { useToast } from '../context/ToastContext';
import { convertTripToVisited } from '../api/trips';
import '../styles/map.css';

function MapSearch({ visited, wishlist, trips, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all = [
      ...visited.map((p) => ({ ...p, _type: 'visited' })),
      ...wishlist.map((p) => ({ ...p, _type: 'wishlist' })),
      ...trips.map((p) => ({ ...p, _type: 'trip' })),
    ];
    return all.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, visited, wishlist, trips]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (pin) => {
    onSelect(pin);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="map-search" ref={wrapperRef}>
      <div className="map-search__input-wrap">
        <span className="map-search__icon">🔍</span>
        <input
          className="map-search__input"
          placeholder="Buscar lugar en el mapa..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        />
        {query && (
          <button className="map-search__clear" onClick={() => { setQuery(''); setOpen(false); }}>
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="map-search__results">
          {results.map((pin) => (
            <li
              key={`${pin._type}-${pin.id}`}
              className="map-search__result"
              onMouseDown={() => handleSelect(pin)}
            >
              <span className={`map-search__result-dot map-search__result-dot--${pin._type}`} />
              <span className="map-search__result-name">{pin.name}</span>
              {pin.address && (
                <span className="map-search__result-addr">{pin.address}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="map-search__empty">Sin resultados</div>
      )}
    </div>
  );
}

export default function MapPage() {
  const toast = useToast();
  const [visited, setVisited] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [convertPlace, setConvertPlace] = useState(null);
  const [convertTrip, setConvertTrip] = useState(null);
  const [flyToPin, setFlyToPin] = useState(null);
  const [addBounds, setAddBounds] = useState(null); // bounds del mapa al abrir el form

  // Agregar lugar desde el mapa
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addType, setAddType] = useState(null); // 'visited' | 'wishlist'
  const [saving, setSaving] = useState(false);
  const addForm = useDirtyForm();
  const addMenuRef = useRef(null);
  const leafletMapRef = useRef(null);

  const load = async () => {
    try {
      const data = await getMapPins();
      setVisited(data.visited || []);
      setWishlist(data.wishlist || []);
      setTrips(data.trips || []);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const totalPins = visited.length + wishlist.length + trips.length;

  const handleConvert = (pin) => {
    setConvertPlace({
      id: pin.id,
      name: pin.name,
      address: pin.address,
      description: pin.description,
      google_maps_url: pin.google_maps_url,
      latitude: pin.lat,
      longitude: pin.lon,
    });
  };

  const handleConvertTrip = (pin) => {
    setConvertTrip({
      id: pin.id,
      name: pin.name,
      address: pin.address,
      description: pin.description,
      google_maps_url: pin.google_maps_url,
      latitude: pin.lat,
      longitude: pin.lon,
    });
  };

  const handleSelectAddType = (type) => {
    if (leafletMapRef.current) {
      const b = leafletMapRef.current.getBounds();
      setAddBounds([[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]]);
    }
    setShowAddMenu(false);
    setAddType(type);
  };

  const handleCloseAddModal = () => {
    addForm.handleAttemptClose(() => {
      setAddType(null);
      addForm.setDirty(false);
    });
  };

  const handleCreate = async (data, files) => {
    setSaving(true);
    try {
      if (addType === 'visited') {
        const newPlace = await createVisited(data);
        if (files?.length) await uploadPhotos(newPlace.id, files);
        toast.success('Lugar agregado a Ya hicimos');
      } else if (addType === 'trip') {
        const newPlace = await createTrip(data);
        if (files?.length) await uploadTripPhotos(newPlace.id, files);
        toast.success('Viajecito agregado');
      } else {
        const newPlace = await createWishlist(data);
        if (files?.length) await uploadWishlistPhotos(newPlace.id, files);
        toast.success('Lugar agregado a Por hacer');
      }
      addForm.setDirty(false);
      setAddType(null);
      load();
    } catch (err) {
      toast.error('No se pudo guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="map-page">
        <div className="loading-state">Cargando mapa...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-page">
        <div className="empty-state">
          <p>No se pudo cargar el mapa. Revisá tu conexión e intentá de nuevo.</p>
          <button className="btn btn-outline" onClick={() => { setLoadError(false); setLoading(true); load(); }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-page">
      {/* Controles del mapa */}
      <div className="map-page__controls">
        <div className="map-filter">
          {[
            { value: 'all',      label: 'Todos' },
            { value: 'visited',  label: 'Ya hicimos' },
            { value: 'wishlist', label: 'Por hacer' },
            { value: 'trip',     label: '✈️ Viajecitos' },
          ].map(({ value, label }) => (
            <button
              key={value}
              className={`map-filter-btn${filter === value ? ' active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {totalPins > 0 && (
          <MapSearch
            visited={visited}
            wishlist={wishlist}
            trips={trips}
            onSelect={(pin) => setFlyToPin(pin)}
          />
        )}

        <div className="map-legend">
          <div className="map-legend-item">
            <div className="map-legend-dot map-legend-dot--visited" />
            <span>Ya hicimos ({visited.length})</span>
          </div>
          <div className="map-legend-item">
            <div className="map-legend-dot map-legend-dot--wishlist" />
            <span>Por hacer ({wishlist.length})</span>
          </div>
          <div className="map-legend-item">
            <div className="map-legend-dot map-legend-dot--trip" />
            <span>Viajecitos ({trips.length})</span>
          </div>
        </div>

        {totalPins === 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
            Los lugares aparecen en el mapa cuando tengan coordenadas cargadas.
          </span>
        )}
      </div>

      {/* Mapa */}
      <div className="map-page__map">
        {totalPins === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: '12px',
              color: 'var(--color-text-light)',
              fontStyle: 'italic',
            }}
          >
            <span style={{ fontSize: '3rem' }}>🗺️</span>
            <p>Agregá lugares con coordenadas para verlos en el mapa.</p>
            <p style={{ fontSize: '12px' }}>
              Al crear o editar un lugar, usá el botón "Buscar" para obtener coordenadas automáticamente.
            </p>
          </div>
        ) : (
          <MapView
            visitedPins={visited}
            wishlistPins={wishlist}
            tripsPins={trips}
            filter={filter}
            onConvert={handleConvert}
            onConvertTrip={handleConvertTrip}
            flyToPin={flyToPin}
            onFlyToDone={() => setFlyToPin(null)}
            mapRef={leafletMapRef}
          />
        )}

        {/* Botón flotante agregar */}
        <div className="map-add" ref={addMenuRef}>
          {showAddMenu && (
            <div className="map-add__menu">
              <button
                className="map-add__option map-add__option--visited"
                onClick={() => handleSelectAddType('visited')}
              >
                ✓ Ya hicimos
              </button>
              <button
                className="map-add__option map-add__option--wishlist"
                onClick={() => handleSelectAddType('wishlist')}
              >
                ★ Por hacer
              </button>
              <button
                className="map-add__option map-add__option--trip"
                onClick={() => handleSelectAddType('trip')}
              >
                ✈️ Viajecito
              </button>
            </div>
          )}
          <button
            className={`map-add__btn${showAddMenu ? ' map-add__btn--open' : ''}`}
            onClick={() => setShowAddMenu((v) => !v)}
            aria-label="Agregar lugar"
          >
            +
          </button>
        </div>
      </div>

      {/* Modal agregar ya hicimos */}
      <Modal
        isOpen={addType === 'visited'}
        onClose={handleCloseAddModal}
        title="Agregar a Ya hicimos"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <PlaceForm
          onSubmit={handleCreate}
          onCancel={handleCloseAddModal}
          loading={saving}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
          initialBounds={addBounds}
        />
        {addForm.dialog}
      </Modal>

      {/* Modal agregar por hacer */}
      <Modal
        isOpen={addType === 'wishlist'}
        onClose={handleCloseAddModal}
        title="Agregar a Por hacer"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <WishlistForm
          onSubmit={handleCreate}
          onCancel={handleCloseAddModal}
          loading={saving}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
          initialBounds={addBounds}
          variant="wishlist"
        />
        {addForm.dialog}
      </Modal>

      {/* Modal agregar viajecito */}
      <Modal
        isOpen={addType === 'trip'}
        onClose={handleCloseAddModal}
        title="Agregar Viajecito"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <WishlistForm
          onSubmit={handleCreate}
          onCancel={handleCloseAddModal}
          loading={saving}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
          initialBounds={addBounds}
          variant="trip"
        />
        {addForm.dialog}
      </Modal>

      {/* Modal "Ya fuimos" — wishlist */}
      {convertPlace && (
        <ConvertModal
          place={convertPlace}
          isOpen={!!convertPlace}
          onClose={() => setConvertPlace(null)}
          onConverted={() => { setConvertPlace(null); load(); }}
        />
      )}

      {/* Modal "¡Ya fuimos!" — viajecito */}
      {convertTrip && (
        <ConvertModal
          place={convertTrip}
          isOpen={!!convertTrip}
          onClose={() => setConvertTrip(null)}
          onConverted={() => { setConvertTrip(null); load(); }}
          convertFn={convertTripToVisited}
        />
      )}
    </div>
  );
}
