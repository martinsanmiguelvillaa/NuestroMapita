/**
 * Mapa interactivo para elegir una ubicación tocando/clickeando.
 * Reutiliza react-leaflet (ya instalado en el proyecto).
 */
import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix de íconos para Vite
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const pickerIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" class="map-heart map-heart--visited"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 30],
});

// Componente interno: escucha clicks y mueve la vista cuando se busca
function MapController({ onMapClick, flyTo }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  // flyTo se actualiza cuando el usuario busca un lugar por nombre.
  // Moverlo a useEffect evita ejecutar side-effects durante el render.
  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], 15, { duration: 1 });
    }
  }, [flyTo, map]);

  return null;
}

const DEFAULT_CENTER = [-34.6037, -58.3816]; // Buenos Aires
const DEFAULT_ZOOM = 12;

export default function LocationPickerMap({ lat, lng, onChange, initialCenter }) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // 'notfound' | null
  const [flyTo, setFlyTo] = useState(null);

  const hasPin = lat != null && lng != null;
  const center = hasPin ? [lat, lng] : (initialCenter ?? DEFAULT_CENTER);

  const handleMapClick = useCallback(
    (newLat, newLng) => {
      onChange({ lat: newLat, lng: newLng });
      setFlyTo(null); // limpiar flyTo después del click para no interferir
    },
    [onChange],
  );

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchStatus(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`,
        { headers: { 'User-Agent': 'NuestroMapita/1.0' } },
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setFlyTo({ lat: newLat, lng: newLng });
        onChange({ lat: newLat, lng: newLng });
        setSearchStatus(null);
      } else {
        setSearchStatus('notfound');
      }
    } catch {
      setSearchStatus('notfound');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="location-picker">
      <div className="location-picker__search">
        <input
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          placeholder="Buscar lugar en el mapa..."
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleSearch}
          disabled={searching}
          style={{ whiteSpace: 'nowrap' }}
        >
          {searching ? '...' : 'Buscar'}
        </button>
      </div>
      {searchStatus === 'notfound' && (
        <p className="form-hint" style={{ color: 'var(--color-error)', marginTop: '4px' }}>
          No se encontró ese lugar. Probá con otro nombre o tocá el mapa directamente.
        </p>
      )}

      <div className="location-picker__map">
        <MapContainer
          center={center}
          zoom={hasPin ? 15 : DEFAULT_ZOOM}
          style={{ width: '100%', height: '100%' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapController onMapClick={handleMapClick} flyTo={flyTo} />
          {hasPin && <Marker position={[lat, lng]} icon={pickerIcon} />}
        </MapContainer>

        {!hasPin && (
          <div className="location-picker__hint">
            Tocá el mapa para marcar el lugar
          </div>
        )}
        {hasPin && (
          <button
            type="button"
            className="location-picker__clear"
            onClick={() => onChange({ lat: null, lng: null })}
            title="Quitar ubicación"
          >
            ✕ Quitar ubicación
          </button>
        )}
      </div>
    </div>
  );
}
