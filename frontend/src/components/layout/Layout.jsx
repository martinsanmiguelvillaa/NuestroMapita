/**
 * Layout: envuelve todas las páginas protegidas.
 *
 * En mobile, detecta arrastre horizontal táctil sobre <main> y mueve
 * el contenido con el dedo en tiempo real (useMotionValue). Al soltar:
 *  - Si superó el umbral → completa la salida con la velocidad del gesto
 *    y desliza la nueva sección desde el lado opuesto.
 *  - Si no llegó al umbral → rebota de vuelta al centro (spring).
 *
 * En desktop: sin animación de gesto, solo cambia el contenido.
 */
import { useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, animate } from 'framer-motion';
import Navbar from './Navbar';
import ClipboardImportBanner from '../ui/ClipboardImportBanner';
import '../../styles/layout.css';

// Config de fondo + overlay por ruta
// La imagen usa CSS custom properties (resuelven mobile/desktop automáticamente via variables.css)
const ROUTE_BG = {
  '/':            { img: 'var(--bg-home)',       overlay: 'var(--color-cream-overlay)',         pos: 'center' },
  '/visitados':   { img: 'var(--bg-visited)',    overlay: 'var(--color-cream-overlay)',         pos: 'center' },
  '/por-visitar': { img: 'var(--bg-wishlist)',   overlay: 'var(--color-cream-overlay)',         pos: 'center' },
  '/viajecitos':  { img: 'var(--bg-trips)',      overlay: 'var(--color-cream-overlay)',         pos: 'center' },
  '/cartitas':    { img: 'var(--bg-letters)',    overlay: 'rgba(253, 246, 236, 0.75)',          pos: 'center 65%' },
  '/recetas':     { img: 'var(--bg-recipes)',    overlay: 'var(--color-cream-overlay)',         pos: 'center' },
  '/cine':        { img: 'var(--bg-cine)',       overlay: 'var(--color-cream-overlay-strong)', pos: 'center' },
  '/outfits':     { img: 'var(--bg-outfits)',    overlay: 'var(--color-cream-overlay)',         pos: 'center top' },
  '/nombres':     { img: 'var(--bg-nombres)',    overlay: 'var(--color-cream-overlay)',         pos: 'center top' },
  '/emocionario': { img: 'var(--bg-emocionario)', overlay: 'var(--color-cream-overlay)',       pos: 'center' },
};

// Orden de navegación horizontal (Mapa queda a la izquierda de Inicio)
const SWIPE_ROUTES = [
  '/mapa', '/', '/visitados', '/por-visitar', '/viajecitos',
  '/cartitas', '/recetas', '/cine', '/outfits', '/nombres', '/emocionario',
];

// Selectores de elementos que manejan su propio gesto táctil
const BLOCKED = [
  '.leaflet-container',
  '.photo-gallery',
  '.home__polaroids',
  '.lightbox__thumbs',
  '.lightbox',
];

// Fracción del ancho de pantalla para confirmar el swipe
const COMMIT_THRESHOLD = 0.28;

export default function Layout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const bg = ROUTE_BG[location.pathname];
  // MotionValue: actualiza el transform del DOM sin re-renders
  const x = useMotionValue(0);
  const mainRef = useRef(null);

  // Estado del gesto en ref → sin re-renders durante el arrastre
  const g = useRef({
    active:    false,  // hay un toque activo
    locked:    false,  // dirección horizontal confirmada
    startX:    0,
    startY:    0,
    animating: false,  // hay una animación de transición en curso
  });

  // Siempre disponemos del pathname actual dentro de los listeners
  const pathnameRef = useRef(location.pathname);
  useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);

  // ── Rebote al centro ────────────────────────────────────────────
  const snapBack = useCallback(() => {
    animate(x, 0, {
      type:      'spring',
      stiffness: 500,
      damping:   42,
      velocity:  x.getVelocity(),
    });
  }, [x]);

  // ── Confirmar swipe: completar salida → navegar → deslizar entrada ─
  const commitSwipe = useCallback(async (dir) => {
    g.current.animating = true;

    const idx     = SWIPE_ROUTES.indexOf(pathnameRef.current);
    const nextIdx = idx + (dir < 0 ? 1 : -1);

    if (idx === -1 || nextIdx < 0 || nextIdx >= SWIPE_ROUTES.length) {
      g.current.animating = false;
      snapBack();
      return;
    }

    const exitX = dir < 0 ? -window.innerWidth : window.innerWidth;

    // La sección actual sale con la velocidad del gesto, luego navegación instantánea
    await animate(x, exitX, {
      type:      'spring',
      stiffness: 340,
      damping:   34,
      velocity:  x.getVelocity(),
    });

    navigate(SWIPE_ROUTES[nextIdx]);
    x.set(0);
    g.current.animating = false;
  }, [x, navigate, snapBack]);

  // ── Listeners táctiles ─────────────────────────────────────────
  useEffect(() => {
    if (window.innerWidth > 768) return;

    const el = mainRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (g.current.animating) return;
      if (BLOCKED.some((sel) => e.target.closest(sel))) return;

      g.current.active = true;
      g.current.locked = false;
      g.current.startX = e.touches[0].clientX;
      g.current.startY = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (!g.current.active) return;

      const dx  = e.touches[0].clientX - g.current.startX;
      const dy  = e.touches[0].clientY - g.current.startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (!g.current.locked) {
        if (adx < 10 && ady < 10) return; // esperar suficiente movimiento

        if (ady >= adx) {
          // Gesto vertical → cancelar tracking horizontal
          g.current.active = false;
          return;
        }

        g.current.locked = true;
      }

      // Bloquar scroll vertical mientras se navega horizontalmente
      e.preventDefault();

      const idx    = SWIPE_ROUTES.indexOf(pathnameRef.current);
      const atEdge = (dx > 0 && idx <= 0) || (dx < 0 && idx >= SWIPE_ROUTES.length - 1);

      // Efecto rubber-band en los extremos
      x.set(atEdge ? dx * 0.15 : dx);
    };

    const onTouchEnd = (e) => {
      if (!g.current.active) return;
      g.current.active = false;
      if (!g.current.locked) return;

      const currentX  = x.get();
      const threshold = window.innerWidth * COMMIT_THRESHOLD;

      if (Math.abs(currentX) >= threshold) {
        commitSwipe(currentX < 0 ? -1 : 1);
      } else {
        snapBack();
      }
    };

    el.addEventListener('touchstart',  onTouchStart, { passive: true });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false }); // necesita preventDefault
    el.addEventListener('touchend',    onTouchEnd,   { passive: true });
    el.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [commitSwipe, snapBack, x]);

  return (
    <>
      {bg && (
        <>
          <div
            className="layout__bg"
            style={{ backgroundImage: bg.img, backgroundPosition: bg.pos }}
          />
          <div
            className="layout__overlay"
            style={{ background: bg.overlay }}
          />
        </>
      )}
      <Navbar />
      <ClipboardImportBanner />
      <main ref={mainRef}>
        {/* motion.div sigue el dedo en tiempo real via MotionValue x */}
        <motion.div style={{ x }}>
          <Outlet />
        </motion.div>
      </main>
    </>
  );
}
