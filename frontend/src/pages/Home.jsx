/**
 * Home - Página principal
 *
 * Muestra:
 * - Hero romántico con título
 * - Contador de lugares y cartitas
 * - Accesos rápidos a secciones
 * - Álbum de fotos recientes (polaroids)
 * - Acceso destacado a cartitas
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getRecentPhotos, getStats } from '../api/photos';
import { getLetters } from '../api/letters';
import { polaroidUrl, fullUrl } from '../utils/cloudinary';
import { useToast } from '../context/ToastContext';
import { EmotionForm } from './Emocionario';
import '../styles/home.css';

// Variable de módulo: vive mientras el módulo JS esté cargado.
// Persiste al cambiar de pestaña y volver (mismo módulo), pero se
// resetea en cada recarga de página (el módulo se re-ejecuta desde cero).
let fabDismissedSession = false;
import '../styles/photos.css';

// ── Polaroid de video con autoplay por visibilidad ─────────────────
function VideoPolaroid({ photo }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(video);

    const resume = () => { if (!document.hidden && isVisible) video.play().catch(() => {}); };
    document.addEventListener('visibilitychange', resume);

    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', resume); };
  }, []);

  return (
    <video
      ref={videoRef}
      src={photo.cloudinary_url}  // videos no se transforman
      className="polaroid__img"
      muted
      loop
      playsInline
      preload="metadata"
      style={{ cursor: 'pointer' }}
    />
  );
}

// ── Reproductor de video con controles custom ──────────────────────
function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setCurrentTime(v.currentTime);
    setProgress(v.currentTime / v.duration);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
  };

  return (
    <div className="home-video-player" onClick={(e) => e.stopPropagation()}>
      <video
        ref={videoRef}
        src={src}
        className="lightbox__img"
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
        style={{ cursor: 'pointer' }}
      />
      <div className="home-video-controls">
        <button className="home-video-controls__play" onClick={togglePlay}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="home-video-controls__time">{fmt(currentTime)}</span>
        <div className="home-video-controls__bar" onClick={handleSeek}>
          <div className="home-video-controls__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="home-video-controls__time">{fmt(duration)}</span>
      </div>
    </div>
  );
}

// ── Lightbox de la galería home ────────────────────────────────────
function HomeLightbox({ photo, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const res = await fetch(photo.cloudinary_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recuerdo-${photo.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.cloudinary_url, '_blank');
    }
  };

  const isVideo = photo.resource_type === 'video';

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox__close" onClick={onClose}>×</button>

      {isVideo ? (
        <VideoPlayer key={photo.id} src={photo.cloudinary_url} />
      ) : (
        <img
          src={fullUrl(photo.cloudinary_url)}
          alt={photo.placeName}
          className="lightbox__img"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div className="lightbox__actions" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox__action-btn" onClick={handleDownload}>
          ⬇ Descargar
        </button>
      </div>
    </div>
  );
}

// ── Botón flotante nube ────────────────────────────────────────────
// layoutId="emoc-cloud" → Framer Motion morfea este botón en el modal al abrirse
function FloatingEmocButton({ onOpen, onDismiss }) {
  const btnRef     = useRef(null);
  const dropZoneRef = useRef(null);
  const [pos, setPos]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [overDrop, setOverDrop] = useState(false);
  const s      = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('emoc-fab-pos')); } catch { return null; }
    })();
    const initial = saved ?? { x: window.innerWidth - 84, y: Math.round(window.innerHeight * 0.55) };
    posRef.current = initial;
    setPos(initial);
  }, []);

  const clamp = (x, y) => ({
    x: Math.max(8, Math.min(window.innerWidth  - 68, x)),
    y: Math.max(72, Math.min(window.innerHeight - 72, y)),
  });

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    btnRef.current.setPointerCapture(e.pointerId);
    s.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY,
                  originX: posRef.current.x, originY: posRef.current.y };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!s.current.active) return;
    const dx = e.clientX - s.current.startX;
    const dy = e.clientY - s.current.startY;
    if (!s.current.moved && Math.hypot(dx, dy) < 8) return;
    s.current.moved = true;
    setDragging(true);
    const next = clamp(s.current.originX + dx, s.current.originY + dy);
    posRef.current = next;
    setPos(next);
    // Detectar si está sobre la drop zone (mobile)
    const dz = dropZoneRef.current;
    if (dz) {
      const r = dz.getBoundingClientRect();
      setOverDrop(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback((e) => {
    if (!s.current.active) return;
    s.current.active = false;
    setDragging(false);
    setOverDrop(false);
    if (!s.current.moved) {
      onOpen();
    } else {
      // Si se soltó sobre la drop zone → descartar
      const dz = dropZoneRef.current;
      if (dz) {
        const r = dz.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          onDismiss();
          return;
        }
      }
      try { localStorage.setItem('emoc-fab-pos', JSON.stringify(posRef.current)); } catch {}
    }
  }, [onOpen, onDismiss]);

  if (!pos) return null;

  return (
    <>
      <motion.button
        ref={btnRef}
        layoutId="emoc-cloud"
        className={`emoc-fab${dragging ? ' emoc-fab--dragging' : ''}`}
        style={{ left: pos.x, top: pos.y }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 28, mass: 1 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Registrar emoción"
      >
        {/* X de descarte — solo en desktop (JS detecta touch por ancho) */}
        {window.innerWidth > 768 && (
          <span
            className="emoc-fab__dismiss"
            role="button"
            aria-label="Ocultar atajo"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          >×</span>
        )}
        <span className="emoc-fab__inner">
          <span className="emoc-fab__cloud">☁️</span>
          <span className="emoc-fab__face">💭</span>
        </span>
      </motion.button>

      {/* Drop zone para mobile: aparece al arrastrar, soltar aquí descarta la nube */}
      <AnimatePresence>
        {dragging && window.innerWidth <= 768 && (
          <motion.div
            ref={dropZoneRef}
            className={`emoc-fab__dropzone${overDrop ? ' emoc-fab__dropzone--over' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <span className="emoc-fab__dropzone-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Modal rápido del emocionario ───────────────────────────────────
// layoutId="emoc-cloud" → Framer Motion morfea desde el botón nube hasta este modal
function EmocQuickModal({ onClose }) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const spring = { type: 'spring', stiffness: 300, damping: 28, mass: 1 };

  return (
    <motion.div
      className="emoc-quick-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClose}
    >
      {/* Este div comparte layoutId con el botón → Framer Motion anima el morph */}
      <motion.div
        layoutId="emoc-cloud"
        className="emoc-quick-modal"
        style={{ borderRadius: 24 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
      >
        {/* El contenido aparece con delay para no verse raro durante el morph */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, delay: prefersReducedMotion ? 0 : 0.15 }}
        >
          <button className="emoc-quick-close" onClick={onClose} aria-label="Cerrar">✕</button>
          <EmotionForm onSaved={onClose} prefill={null} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Página principal ───────────────────────────────────────────────
export default function Home() {
  const toast = useToast();
  const [stats, setStats] = useState({ visited: 0, wishlist: 0, letters: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [previewLetters, setPreviewLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [showEmocModal, setShowEmocModal] = useState(false);
  const [fabDismissed, setFabDismissed]   = useState(fabDismissedSession);
  const openEmoc   = useCallback(() => setShowEmocModal(true), []);
  const closeEmoc  = useCallback(() => setShowEmocModal(false), []);
  const dismissFab = useCallback(() => { fabDismissedSession = true; setFabDismissed(true); }, []);

  const load = async () => {
    try {
      const [stats, photos, letters] = await Promise.all([
        getStats(),
        getRecentPhotos(16),
        getLetters(),
      ]);

      setStats({
        visited: stats.visited,
        wishlist: stats.wishlist,
        letters: stats.letters,
      });

      setPreviewLetters(letters.slice(0, 3));

      // Mezclar aleatoriamente y mostrar 8
      const all = photos.map((p) => ({ ...p, placeName: p.place_name }));
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      setRecentPhotos(all.slice(0, 8));
    } catch (err) {
      toast.error('No se pudo cargar el inicio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const navCards = [
    { to: '/mapa',        icon: '🗺️', name: 'Mapa',       desc: 'Ver todos en el mapa' },
    { to: '/visitados',   icon: '✓', name: 'Ya hicimos',  desc: `${stats.visited} lugar${stats.visited !== 1 ? 'es' : ''}` },
    { to: '/por-visitar', icon: '★', name: 'Por hacer',   desc: `${stats.wishlist} pendiente${stats.wishlist !== 1 ? 's' : ''}` },
    { to: '/recetas',     icon: '🍴', name: 'Recetas',     desc: 'Ver nuestras recetas' },
    { to: '/cine',        icon: '🎬', name: 'Cine',        desc: 'Películas y series' },
    { to: '/viajecitos',  icon: '✈️', name: 'Viajecitos',  desc: 'Nuestros próximos viajes' },
    { to: '/outfits',     icon: '👗', name: 'Outfits',     desc: 'Qué ponerse hoy' },
  ];

  const moreLinks = [
    { to: '/cartitas',    icon: '💌', name: 'Cartitas' },
    { to: '/nombres',     icon: '👶', name: 'Nombres' },
    { to: '/emocionario', icon: '💭', name: 'Emocionario' },
  ];

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!showMore) return;
    const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  return (
    <div className="home fade-in">
      {/* Hero */}
      <section className="home__hero">
        <p className="home__hero-subtitle">Para la princesita preciosa de mi corazon ♡</p>
        <h1 className="home__hero-title">
          <em>Nuestro</em> Mapita
        </h1>
        <p className="home__hero-desc">
          Un lugar para nuestros plancitos, recuerdos y varias cosas mas...
        </p>
      </section>

      {/* Stats */}
      {!loading && (
        <div className="home__stats">
          <div className="home__stat">
            <div className="home__stat-number">{stats.visited}</div>
            <div className="home__stat-label">visitados</div>
          </div>
          <div className="home__stat">
            <div className="home__stat-number">{stats.wishlist}</div>
            <div className="home__stat-label">por hacer</div>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <section className="home__sections">
        <h2 className="home__section-title">Nuestro espacio</h2>
        <div className="home__nav-cards">
          {navCards.map(({ to, icon, name, desc }) => (
            <Link key={to} to={to} className="home__nav-card">
              <span className="home__nav-card-icon">{icon}</span>
              <span className="home__nav-card-name">{name}</span>
              <span className="home__nav-card-desc">{desc}</span>
            </Link>
          ))}

          {/* Botón + con panel de más secciones */}
          <div className="home__nav-card-more" ref={moreRef}>
            <button
              className={`home__nav-card home__nav-card--more-btn${showMore ? ' home__nav-card--more-btn--open' : ''}`}
              onClick={() => setShowMore((v) => !v)}
            >
              <span className="home__nav-card-icon">{showMore ? '✕' : '+'}</span>
              <span className="home__nav-card-name">Más</span>
              <span className="home__nav-card-desc">Otras secciones</span>
            </button>

            {showMore && (
              <div className="home__more-panel">
                {moreLinks.map(({ to, icon, name }) => (
                  <Link key={to} to={to} className="home__more-panel-item" onClick={() => setShowMore(false)}>
                    <span className="home__more-panel-icon">{icon}</span>
                    <span className="home__more-panel-name">{name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cartitas destacadas */}
      <section className="home__recent" style={{ paddingBottom: '0' }}>
        <h2 className="home__section-title">Cartitas</h2>
        <div className="home__letters-grid">
          {previewLetters.map((letter) => (
            <Link key={letter.id} to="/cartitas" className="home__letter-card">
              {letter.photo_url && (
                <img src={letter.photo_url} alt="" className="home__letter-card-img" />
              )}
              <div className="home__letter-card-body">
                <p className="home__letter-card-title">💌 {letter.title}</p>
                <p className="home__letter-card-snippet">
                  {letter.body ? (letter.body.length > 80 ? letter.body.slice(0, 80) + '…' : letter.body) : ''}
                </p>
              </div>
            </Link>
          ))}
          <Link to="/cartitas" className="home__letter-card home__letter-card--more">
            <span className="home__letter-card-more-icon">💌</span>
            <span className="home__letter-card-more-label">Ver todas las cartitas</span>
          </Link>
        </div>
      </section>

      {/* Galería */}
      {recentPhotos.length > 0 && (
        <section className="home__recent">
          <h2 className="home__section-title" style={{ marginTop: '40px' }}>Galería</h2>
          <div className="home__polaroids">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="polaroid" onClick={() => setLightboxPhoto(photo)}>
                {photo.resource_type === 'video'
                  ? <VideoPolaroid photo={photo} />
                  : <img src={polaroidUrl(photo.cloudinary_url)} alt={photo.placeName} className="polaroid__img" loading="lazy" />
                }
                <p className="polaroid__caption">{photo.placeName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && recentPhotos.length === 0 && (
        <section className="home__recent">
          <h2 className="home__section-title" style={{ marginTop: '40px' }}>Recuerdos</h2>
          <div className="empty-state">
            <p>Todavía no hay fotos.</p>
            <Link to="/visitados" className="btn btn-rose">
              Agregar el primer lugar
            </Link>
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <HomeLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}

      {/* Nube flotante — AnimatePresence la desmonta cuando abre el modal,
          permitiendo que Framer Motion capture su posición para el morph */}
      <AnimatePresence>
        {!showEmocModal && !fabDismissed && (
          <FloatingEmocButton key="emoc-btn" onOpen={openEmoc} onDismiss={dismissFab} />
        )}
      </AnimatePresence>

      {/* Modal — comparte layoutId con la nube, Framer Motion morfea entre ambos */}
      <AnimatePresence>
        {showEmocModal && <EmocQuickModal key="emoc-modal" onClose={closeEmoc} />}
      </AnimatePresence>
    </div>
  );
}
