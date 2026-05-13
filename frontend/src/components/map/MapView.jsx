/**
 * Mapa interactivo con React Leaflet.
 *
 * IMPORTANTE: Leaflet necesita un fix especial con Vite para los íconos de marcadores.
 * Este fix se aplica al inicio de este archivo.
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/map.css';

// Fix para los íconos de Leaflet con Vite/Webpack
// (Leaflet usa URLs relativas que no funcionan con bundlers)
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

// Íconos personalizados con div HTML y CSS
const visitedIcon = L.divIcon({
  html: `<div class="map-pin map-pin--visited"><div class="map-pin__inner"></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

const wishlistIcon = L.divIcon({
  html: `<div class="map-pin map-pin--wishlist"><div class="map-pin__inner"></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

// Helper: centrar el mapa cuando cambian los pines
function MapFitter({ pins }) {
  const map = useMap();

  useEffect(() => {
    if (!pins || pins.length === 0) return;
    const latLngs = pins.map((p) => [p.lat, p.lon]);
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }
  }, [pins, map]);

  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Popup para un lugar visitado
function VisitedPopup({ pin, onEdit, onDelete }) {
  return (
    <div className="map-popup">
      <span className="map-popup__type map-popup__type--visited">Visitado</span>
      {pin.first_photo && (
        <img src={pin.first_photo} alt="" className="map-popup__photo" />
      )}
      <h3 className="map-popup__name">{pin.name}</h3>
      {pin.visit_date && <p className="map-popup__info">📅 {formatDate(pin.visit_date)}</p>}
      {pin.address && <p className="map-popup__info">📍 {pin.address}</p>}
      {pin.rating && (
        <p className="map-popup__info">{'★'.repeat(pin.rating)}{'☆'.repeat(5 - pin.rating)}</p>
      )}
      {pin.comment && (
        <p className="map-popup__info" style={{ fontStyle: 'italic' }}>"{pin.comment}"</p>
      )}
      <div className="map-popup__actions">
        {pin.google_maps_url && (
          <a href={pin.google_maps_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            Ver en Maps
          </a>
        )}
      </div>
    </div>
  );
}

// Popup para un lugar por visitar
function WishlistPopup({ pin, onConvert }) {
  return (
    <div className="map-popup">
      <span className="map-popup__type map-popup__type--wishlist">Por visitar</span>
      <h3 className="map-popup__name">{pin.name}</h3>
      {pin.address && <p className="map-popup__info">📍 {pin.address}</p>}
      {pin.description && (
        <p className="map-popup__info" style={{ fontStyle: 'italic' }}>"{pin.description}"</p>
      )}
      <div className="map-popup__actions">
        {pin.google_maps_url && (
          <a href={pin.google_maps_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            Ver en Maps
          </a>
        )}
        {pin.social_url && (
          <a href={pin.social_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            Ver reel
          </a>
        )}
        <button className="btn btn-rose btn-sm" onClick={() => onConvert?.(pin)}>
          Ya fuimos
        </button>
      </div>
    </div>
  );
}

/**
 * MapView: componente principal del mapa.
 *
 * Props:
 * - visitedPins: array de pines de lugares visitados
 * - wishlistPins: array de pines de lugares por visitar
 * - filter: 'all' | 'visited' | 'wishlist'
 * - onConvert: callback cuando se toca "Ya fuimos" en el popup
 */
export default function MapView({ visitedPins = [], wishlistPins = [], filter = 'all', onConvert }) {
  const allPins = [...visitedPins, ...wishlistPins];
  const defaultCenter = [-34.6037, -58.3816]; // Buenos Aires como default
  const defaultZoom = 12;

  const showVisited = filter === 'all' || filter === 'visited';
  const showWishlist = filter === 'all' || filter === 'wishlist';

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      />

      {/* Ajustar el mapa a los pines visibles */}
      {allPins.length > 0 && <MapFitter pins={allPins} />}

      {/* Pines de lugares visitados */}
      {showVisited &&
        visitedPins.map((pin) => (
          <Marker key={`v-${pin.id}`} position={[pin.lat, pin.lon]} icon={visitedIcon}>
            <Popup minWidth={240} maxWidth={300}>
              <VisitedPopup pin={pin} />
            </Popup>
          </Marker>
        ))}

      {/* Pines de lugares por visitar */}
      {showWishlist &&
        wishlistPins.map((pin) => (
          <Marker key={`w-${pin.id}`} position={[pin.lat, pin.lon]} icon={wishlistIcon}>
            <Popup minWidth={240} maxWidth={300}>
              <WishlistPopup pin={pin} onConvert={onConvert} />
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
