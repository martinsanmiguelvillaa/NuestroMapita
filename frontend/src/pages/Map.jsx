/**
 * Página del Mapa.
 * Muestra todos los pines con filtros por tipo y buscador.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { getMapPins } from '../api/map';
import MapView from '../components/map/MapView';
import ConvertModal from '../components/places/ConvertModal';
import '../styles/map.css';

function MapSearch({ visited, wishlist, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all = [
      ...visited.map((p) => ({ ...p, _type: 'visited' })),
      ...wishlist.map((p) => ({ ...p, _type: 'wishlist' })),
    ];
    return all.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, visited, wishlist]);

  // Cerrar al hacer clic afuera
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
  const [visited, setVisited] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [convertPlace, setConvertPlace] = useState(null);
  const [flyToPin, setFlyToPin] = useState(null);

  const load = async () => {
    try {
      const data = await getMapPins();
      setVisited(data.visited || []);
      setWishlist(data.wishlist || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalPins = visited.length + wishlist.length;

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

  if (loading) {
    return (
      <div className="map-page">
        <div className="loading-state">Cargando mapa...</div>
      </div>
    );
  }

  return (
    <div className="map-page">
      {/* Controles del mapa */}
      <div className="map-page__controls">
        {/* Filtros */}
        <div className="map-filter">
          {[
            { value: 'all',      label: 'Todos' },
            { value: 'visited',  label: 'Ya hicimos' },
            { value: 'wishlist', label: 'Por hacer' },
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

        {/* Buscador */}
        {totalPins > 0 && (
          <MapSearch
            visited={visited}
            wishlist={wishlist}
            onSelect={(pin) => setFlyToPin(pin)}
          />
        )}

        {/* Leyenda */}
        <div className="map-legend">
          <div className="map-legend-item">
            <div className="map-legend-dot map-legend-dot--visited" />
            <span>Visitado ({visited.length})</span>
          </div>
          <div className="map-legend-item">
            <div className="map-legend-dot map-legend-dot--wishlist" />
            <span>Por hacer ({wishlist.length})</span>
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
            filter={filter}
            onConvert={handleConvert}
            flyToPin={flyToPin}
            onFlyToDone={() => setFlyToPin(null)}
          />
        )}
      </div>

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
