/**
 * Mapa interactivo para elegir una ubicación tocando/clickeando.
 * Reutiliza react-leaflet (ya instalado en el proyecto).
 */
import { useState, useCallback } from 'react';
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
  html: `<div class="map-pin map-pin--visited"><div class="map-pin__inner"></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Componente interno: escucha clicks y mueve la vista cuando se busca
function MapController({ onMapClick, flyTo }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  // flyTo se actualiza cuando el usuario busca un lugar por nombre
  if (flyTo) {
    map.flyTo([flyTo.lat, flyTo.lng], 15, { duration: 1 });
  }

  return null;
}

const DEFAULT_CENTER = [-34.6037, -58.3816]; // Buenos Aires
const DEFAULT_ZOOM = 12;

export default function LocationPickerMap({ lat, lng, onChange }) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // 'notfound' | null
  const [flyTo, setFlyTo] = useState(null);

  const hasPin = lat != null && lng != null;
  const center = hasPin ? [lat, lng] : DEFAULT_CENTER;

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
      </div>
    </div>
  );
}
