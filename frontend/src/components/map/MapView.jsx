/**
 * Mapa interactivo con React Leaflet.
 *
 * IMPORTANTE: Leaflet necesita un fix especial con Vite para los íconos de marcadores.
 * Este fix se aplica al inicio de este archivo.
 */
import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import StarRating from '../places/StarRating';
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

// Íconos de corazón con SVG inline
const heartSvg = (colorClass) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" class="map-heart ${colorClass}"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>`;

const visitedIcon = L.divIcon({
  html: heartSvg('map-heart--visited'),
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 30],
  popupAnchor: [0, -34],
});

const wishlistIcon = L.divIcon({
  html: heartSvg('map-heart--wishlist'),
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 30],
  popupAnchor: [0, -34],
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

function photoPreviewUrl(url) {
  if (!url) return null;
  if (/\/video\/upload\//.test(url)) {
    return url
      .replace('/video/upload/', '/video/upload/so_0,w_400,q_auto/')
      .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
  }
  return url;
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
        /\/video\/upload\//.test(pin.first_photo) ? (
          <video
            src={pin.first_photo}
            className="map-popup__photo"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img src={pin.first_photo} alt="" className="map-popup__photo" />
        )
      )}
      <h3 className="map-popup__name">{pin.name}</h3>
      {pin.visit_date && <p className="map-popup__info">📅 {formatDate(pin.visit_date)}</p>}
      {pin.address && <p className="map-popup__info">📍 {pin.address}</p>}
      {pin.rating && (
        <div className="map-popup__info"><StarRating value={pin.rating} readOnly small /></div>
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
      <span className="map-popup__type map-popup__type--wishlist">Por hacer</span>
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

// Marker que abre el popup en hover y lo cierra al salir,
// salvo que el usuario lo haya fijado con un clic.
function HoverMarker({ position, icon, children }) {
  const pinned = useRef(false);

  const handlers = useCallback(() => ({
    mouseover:  (e) => e.target.openPopup(),
    mouseout:   (e) => { if (!pinned.current) e.target.closePopup(); },
    click:      (e) => {
      pinned.current = true;
      // setTimeout para ejecutarse después del toggle nativo de Leaflet
      setTimeout(() => e.target.openPopup(), 0);
    },
    popupclose: () => { pinned.current = false; },
  }), []);

  return (
    <Marker position={position} icon={icon} eventHandlers={handlers()}>
      {children}
    </Marker>
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
          <HoverMarker key={`v-${pin.id}`} position={[pin.lat, pin.lon]} icon={visitedIcon}>
            <Popup minWidth={240} maxWidth={300}>
              <VisitedPopup pin={pin} />
            </Popup>
          </HoverMarker>
        ))}

      {/* Pines de lugares por visitar */}
      {showWishlist &&
        wishlistPins.map((pin) => (
          <HoverMarker key={`w-${pin.id}`} position={[pin.lat, pin.lon]} icon={wishlistIcon}>
            <Popup minWidth={240} maxWidth={300}>
              <WishlistPopup pin={pin} onConvert={onConvert} />
            </Popup>
          </HoverMarker>
        ))}
    </MapContainer>
  );
}
