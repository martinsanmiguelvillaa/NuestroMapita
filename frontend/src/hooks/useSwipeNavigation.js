/**
 * useSwipeNavigation
 *
 * Detecta swipes horizontales sobre un elemento y navega entre
 * secciones con React Router. Solo activo en mobile (≤768px).
 *
 * Uso:
 *   const ref = useRef(null);
 *   useSwipeNavigation(ref);
 *   <main ref={ref}>...</main>
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Orden de navegación horizontal. Mapa queda a la izquierda de Inicio.
export const SWIPE_ROUTES = [
  '/mapa',
  '/',
  '/visitados',
  '/por-visitar',
  '/viajecitos',
  '/cartitas',
  '/recetas',
  '/cine',
  '/outfits',
  '/nombres',
  '/emocionario',
];

const MIN_HORIZONTAL_PX = 55;   // distancia mínima horizontal para considerar swipe
const MAX_ANGLE_DEG     = 30;   // ángulo máximo desde el eje horizontal

export function useSwipeNavigation(ref) {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Guardamos pathname en ref para evitar stale closures en los listeners
  const pathnameRef = useRef(location.pathname);
  useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    if (window.innerWidth > 768) return;

    const el = ref.current;
    if (!el) return;

    let startX   = 0;
    let startY   = 0;
    let tracking = true; // se cancela si el gesto resulta ser vertical

    const onTouchStart = (e) => {
      // Si el touch empieza dentro del mapa de Leaflet, no interferimos
      if (e.target.closest('.leaflet-container')) {
        tracking = false;
        return;
      }
      startX   = e.touches[0].clientX;
      startY   = e.touches[0].clientY;
      tracking = true;
    };

    const onTouchMove = (e) => {
      if (!tracking) return;
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);

      // Si el movimiento vertical supera al horizontal antes de alcanzar
      // el umbral, es scroll vertical — cancelamos.
      if (dy > dx && dy > 10) {
        tracking = false;
      }
    };

    const onTouchEnd = (e) => {
      if (!tracking) return;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      // Umbral mínimo de distancia horizontal
      if (Math.abs(dx) < MIN_HORIZONTAL_PX) return;

      // El gesto debe ser suficientemente horizontal
      const angleDeg = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI));
      if (angleDeg > MAX_ANGLE_DEG) return;

      const pathname = pathnameRef.current;
      const idx = SWIPE_ROUTES.findIndex((r) => r === pathname);
      if (idx === -1) return;

      if (dx < 0 && idx < SWIPE_ROUTES.length - 1) {
        // Swipe izquierda → siguiente sección
        navigate(SWIPE_ROUTES[idx + 1], { state: { swipeDir: -1 } });
      } else if (dx > 0 && idx > 0) {
        // Swipe derecha → sección anterior
        navigate(SWIPE_ROUTES[idx - 1], { state: { swipeDir: 1 } });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [navigate, ref]);
}
