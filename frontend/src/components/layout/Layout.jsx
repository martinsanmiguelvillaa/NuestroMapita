/**
 * Layout: envuelve todas las páginas protegidas.
 * Renderiza la navbar y el contenido de la página actual (<Outlet>).
 *
 * En mobile, el <main> detecta swipes horizontales para navegar
 * entre secciones. La animación de transición usa framer-motion.
 */
import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import ClipboardImportBanner from '../ui/ClipboardImportBanner';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

// Variantes de animación según dirección del swipe.
// swipeDir: -1 = viene de la derecha (swipe izquierda), 1 = viene de la izquierda (swipe derecha)
// En navegación normal (tap en navbar): sin animación de slide.
function getVariants(swipeDir) {
  if (!swipeDir) {
    // Sin dirección → sin animación (tap en navbar)
    return {
      initial:  { opacity: 1 },
      animate:  { opacity: 1 },
      exit:     { opacity: 1 },
    };
  }
  return {
    initial: { x: swipeDir * -30 + '%', opacity: 0 },
    animate: { x: '0%',                  opacity: 1 },
    exit:    { x: swipeDir *  30 + '%',  opacity: 0 },
  };
}

export default function Layout() {
  const mainRef = useRef(null);
  const location = useLocation();

  useSwipeNavigation(mainRef);

  const isMobile   = window.innerWidth <= 768;
  const swipeDir   = isMobile ? (location.state?.swipeDir ?? 0) : 0;
  const variants   = getVariants(swipeDir);

  return (
    <>
      <Navbar />
      <ClipboardImportBanner />
      <main ref={mainRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: 'transform, opacity' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}
