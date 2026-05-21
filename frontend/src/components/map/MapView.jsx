/**
 * Mapa interactivo con React Leaflet.
 *
 * IMPORTANTE: Leaflet necesita un fix especial con Vite para los íconos de marcadores.
 * Este fix se aplica al inicio de este archivo.
 */
import { useEffect, useRef, useMemo } from 'react';
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
const heartSvg = (colorClass, delayMs = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" class="map-heart ${colorClass}" style="animation-delay:${delayMs}ms"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>`;

const makeIcon = (colorClass, delayMs = 0) => L.divIcon({
  html: heartSvg(colorClass, delayMs),
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 30],
  popupAnchor: [0, -34],
});

// Helper: volar a un pin y abrir su popup
function FlyToPin({ pin, onDone, markersRef }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.flyTo([pin.lat, pin.lon], 16, { duration: 1 });
    const timer = setTimeout(() => {
      const key = `${pin._type}-${pin.id}`;
      const marker = markersRef?.current?.[key];
      if (marker) marker.openPopup();
      onDone?.();
    }, 1100);
    return () => clearTimeout(timer);
  }, [pin, map, onDone, markersRef]);
  return null;
}

// Helper: exponer la instancia del mapa al padre vía ref
function MapRefCapture({ mapRef }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

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

function AutoPlayVideo({ src, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // IntersectionObserver: play cuando el popup es visible, pause cuando se cierra/oculta
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.1 },
    );
    observer.observe(video);

    // Reanudar tras cambio de pestaña / bloqueo de pantalla
    const resume = () => { if (!document.hidden && !video.paused) return; if (!document.hidden) video.play().catch(() => {}); };
    document.addEventListener('visibilitychange', resume);

    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', resume); };
  }, []);

  return <video ref={ref} src={src} className={className} muted loop playsInline preload="metadata" />;
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
      <span className="map-popup__type map-popup__type--visited">Ya hicimos</span>
      {pin.first_photo && (
        /\/video\/upload\//.test(pin.first_photo)
          ? <AutoPlayVideo src={pin.first_photo} className="map-popup__photo" />
          : <img src={pin.first_photo} alt="" className="map-popup__photo" />
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

// Marker con popup que:
// - se abre al hacer hover sobre el corazón
// - se mantiene abierto si el mouse pasa a la tarjeta
// - se cierra al sacar el mouse de la tarjeta (o del corazón sin ir a la tarjeta)
// - se fija con un clic; un segundo clic lo cierra
function HoverMarker({ position, icon, children, markerKey, markersRef }) {
  const pinned    = useRef(false);
  const closeTimer = useRef(null);
  const markerRef  = useRef(null);

  // Registrar la instancia del marker para poder abrir su popup desde fuera
  useEffect(() => {
    if (markerKey && markersRef && markerRef.current) {
      markersRef.current[markerKey] = markerRef.current;
      return () => { delete markersRef.current[markerKey]; };
    }
  }, [markerKey, markersRef]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const cancelClose = () => clearTimeout(closeTimer.current);

    const scheduleClose = () => {
      cancelClose();
      closeTimer.current = setTimeout(() => {
        if (!pinned.current) marker.closePopup();
      }, 150);
    };

    marker.on('mouseover', () => {
      cancelClose();
      if (!marker.isPopupOpen()) {
        const map = marker._map;
        const popup = marker.getPopup();
        if (map && popup) {
          const pt = map.latLngToContainerPoint(marker.getLatLng());
          const mapSize = map.getSize();
          const PW = 300;

          // Horizontal: evitar borde izquierdo/derecho
          let offsetX = 0;
          if (pt.x > mapSize.x - PW / 2) offsetX = -(pt.x - (mapSize.x - PW / 2));
          else if (pt.x < PW / 2)        offsetX = PW / 2 - pt.x;

          // Vertical: si está cerca del borde superior, abrir abajo
          // Usamos offset grande provisorio; popupopen lo corrige con la altura real
          const openBelow = pt.y < 220;
          popup._openBelow = openBelow;
          popup.options.offset = L.point(offsetX, openBelow ? 450 : 0);
        }
        marker.openPopup();
      }
    });

    marker.on('mouseout', scheduleClose);

    // Remover el binding de click interno de Leaflet y reemplazar con el nuestro
    marker.off('click');
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e.originalEvent);
      if (pinned.current) {
        pinned.current = false;
        cancelClose();
        marker.closePopup();
      } else {
        pinned.current = true;
        cancelClose();
      }
    });

    // Cuando el popup abre: corregir posición con altura real + registrar hover/clic
    marker.on('popupopen', (e) => {
      const popup = e.popup;

      // Si abre abajo: corregir offset con la altura real del popup
      if (popup._openBelow) {
        const el = popup.getElement();
        if (el) {
          const h = el.offsetHeight;
          // tip por defecto está a popupAnchor.y = -34 sobre el marker
          // queremos que la parte superior del popup quede 10px bajo el corazón (iconBottom ≈ 4px)
          // offset = h + 34 + 4 + 10 = h + 48
          popup.options.offset = L.point(popup.options.offset.x, h + 72);
          popup.update();
        }
      }

      const el = popup?.getElement();
      if (!el) return;

      const pinFromCard = () => { pinned.current = true; cancelClose(); };

      el.removeEventListener('mouseenter', cancelClose);
      el.removeEventListener('mouseleave', scheduleClose);
      el.removeEventListener('mousedown',  pinFromCard);
      el.addEventListener('mouseenter', cancelClose);
      el.addEventListener('mouseleave', scheduleClose);
      el.addEventListener('mousedown',  pinFromCard);
    });

    marker.on('popupclose', () => {
      pinned.current = false;
      cancelClose();
    });

    return () => {
      cancelClose();
      marker.off('mouseover');
      marker.off('mouseout');
      marker.off('click');
      marker.off('popupopen');
      marker.off('popupclose');
    };
  }, []);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
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
export default function MapView({ visitedPins = [], wishlistPins = [], filter = 'all', onConvert, flyToPin, onFlyToDone, mapRef }) {
  const allPins = useMemo(() => [...visitedPins, ...wishlistPins], [visitedPins, wishlistPins]);
  const markersRef = useRef({});
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

      {/* Capturar la instancia del mapa */}
      {mapRef && <MapRefCapture mapRef={mapRef} />}

      {/* Ajustar el mapa a los pines visibles */}
      {allPins.length > 0 && <MapFitter pins={allPins} />}

      {/* Volar al pin seleccionado desde el buscador */}
      {flyToPin && <FlyToPin pin={flyToPin} onDone={onFlyToDone} markersRef={markersRef} />}

      {/* Pines de lugares visitados */}
      {showVisited &&
        visitedPins.map((pin, i) => (
          <HoverMarker key={`v-${pin.id}`} position={[pin.lat, pin.lon]} icon={makeIcon('map-heart--visited', i * 35)} markerKey={`visited-${pin.id}`} markersRef={markersRef}>
            <Popup minWidth={240} maxWidth={300} autoPan={false}>
              <VisitedPopup pin={pin} />
            </Popup>
          </HoverMarker>
        ))}

      {/* Pines de lugares por visitar */}
      {showWishlist &&
        wishlistPins.map((pin, i) => (
          <HoverMarker key={`w-${pin.id}`} position={[pin.lat, pin.lon]} icon={makeIcon('map-heart--wishlist', i * 35)} markerKey={`wishlist-${pin.id}`} markersRef={markersRef}>
            <Popup minWidth={240} maxWidth={300} autoPan={false}>
              <WishlistPopup pin={pin} onConvert={onConvert} />
            </Popup>
          </HoverMarker>
        ))}
    </MapContainer>
  );
}
