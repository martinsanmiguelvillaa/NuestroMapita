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
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getRecentPhotos, getStats, uploadLoosePhotos, deletePhoto } from '../api/photos';
import { getLetters } from '../api/letters';
import { polaroidUrl, fullUrl, videoThumbUrl } from '../utils/cloudinary';
import { toast } from 'sonner';
import { EmotionForm } from './Emocionario';
import { sendPoniPush } from '../api/push';
import '../styles/home.css';
import '../styles/photos.css';

// Variable de módulo: vive mientras el módulo JS esté cargado.
// Persiste al cambiar de pestaña y volver (mismo módulo), pero se
// resetea en cada recarga de página (el módulo se re-ejecuta desde cero).
let fabDismissedSession = false;
let poniModeSession = false;
// Escuchar a nivel de módulo para que funcione aunque el FAB no esté montado
window.addEventListener('poni-mode-changed', () => { poniModeSession = true; });

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
function HomeLightbox({ photos, index, onClose, onDelete }) {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [deleting, setDeleting] = useState(false);
  const photo = photos[currentIndex];

  const prev = useCallback(() => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrentIndex((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

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

      {/* Contador */}
      {photos.length > 1 && (
        <div className="lightbox__counter" onClick={(e) => e.stopPropagation()}>
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Flecha anterior */}
      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox__arrow lightbox__arrow--prev"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >‹</button>
      )}

      {isVideo ? (
        <VideoPlayer key={photo.id} src={photo.cloudinary_url} />
      ) : (
        <img
          key={photo.id}
          src={fullUrl(photo.cloudinary_url)}
          alt={photo.placeName}
          className="lightbox__img"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Flecha siguiente */}
      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox__arrow lightbox__arrow--next"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >›</button>
      )}

      <div className="lightbox__actions" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox__action-btn" onClick={handleDownload}>
          ⬇ Descargar
        </button>
        {photo.is_loose && (
          <button
            className="lightbox__action-btn lightbox__action-btn--delete"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await deletePhoto(photo.id);
                onDelete?.(photo.id);
                if (photos.length <= 1) { onClose(); return; }
                setCurrentIndex((i) => i >= photos.length - 1 ? i - 1 : i);
              } catch { toast.error('No se pudo eliminar'); }
              finally { setDeleting(false); }
            }}
          >
            {deleting ? 'Eliminando...' : '🗑 Eliminar'}
          </button>
        )}
      </div>

      {/* Miniaturas */}
      {photos.length > 1 && (
        <div className="lightbox__thumbs" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, i) => (
            <img
              key={p.id}
              src={p.resource_type === 'video' ? videoThumbUrl(p.cloudinary_url) : polaroidUrl(p.cloudinary_url)}
              alt=""
              className={`lightbox__thumb${i === currentIndex ? ' lightbox__thumb--active' : ''}`}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      )}
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
  const [justDragged, setJustDragged] = useState(false);
  const [overDrop, setOverDrop] = useState(false);
  const s      = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const videoRef = useRef(null);
  const animRef  = useRef(false);
  const [animating, setAnimating] = useState(false);
  const [poniMode, setPoniMode] = useState(poniModeSession);
  const [sendingPoni, setSendingPoni] = useState(false);

  // Sincronizar con la variable de módulo (puede haberse activado antes de montar)
  useEffect(() => {
    if (poniModeSession && !poniMode) setPoniMode(true);
    const onCustom = () => setPoniMode(true);
    window.addEventListener('poni-mode-changed', onCustom);
    return () => window.removeEventListener('poni-mode-changed', onCustom);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reproduce la animación de la nutria al pasar el mouse o tocarla.
  // El <video> tiene dos fuentes: HEVC con alfa (.mov) para Safari/iOS
  // y WebM con alfa para el resto de los navegadores.
  const playNutriaAnim = useCallback(() => {
    const v = videoRef.current;
    if (!v || animRef.current) return;
    animRef.current = true;
    v.currentTime = 0;
    v.play()
      .then(() => setAnimating(true)) // ocultar la imagen solo si arrancó de verdad
      .catch(() => { animRef.current = false; setAnimating(false); });
  }, []);

  const stopNutriaAnim = useCallback(() => {
    animRef.current = false;
    setAnimating(false);
  }, []);

  useEffect(() => {
    const homeTop = btnRef.current?.closest('.home')?.getBoundingClientRect().top ?? 0;
    const isMobile = window.innerWidth <= 768;
    const initial = {
      x: Math.round(window.innerWidth * (isMobile ? 0.78 : 0.84)),
      y: Math.round(window.innerHeight * (isMobile ? 0.18 : 0.22) - homeTop),
    };
    posRef.current = initial;
    setPos(initial);
  }, []);

  const clamp = (x, y) => {
    const homeH = btnRef.current?.closest('.home')?.offsetHeight ?? window.innerHeight;
    return {
      x: Math.max(8, Math.min(window.innerWidth - 68, x)),
      y: Math.max(8, Math.min(homeH - 68, y)),
    };
  };

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    if (e.pointerType !== 'mouse' && !poniMode) playNutriaAnim(); // en táctil no hay hover
    btnRef.current.setPointerCapture(e.pointerId);
    s.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY,
                  originX: posRef.current.x, originY: posRef.current.y };
  }, [playNutriaAnim, poniMode]);

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
      if (poniMode) {
        if (sendingPoni) return;
        setSendingPoni(true);
        sendPoniPush()
          .then(() => toast('¡Quiero un poni!'))
          .catch(() => toast.error('No se pudo enviar'))
          .finally(() => setSendingPoni(false));
      } else {
        onOpen();
      }
    } else {
      const dz = dropZoneRef.current;
      if (dz) {
        const r = dz.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          onDismiss();
          return;
        }
      }
      setJustDragged(true);
    }
  }, [onOpen, onDismiss, poniMode, sendingPoni]);

  if (!pos) return null;

  return (
    <>
      <motion.button
        ref={btnRef}
        layoutId="emoc-cloud"
        className={`emoc-fab${dragging ? ' emoc-fab--dragging' : ''}${justDragged ? ' emoc-fab--just-dragged' : ''}`}
        style={{ left: pos.x, top: pos.y }}
        initial={{ opacity: 0, scale: 0.35, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={dragging ? { duration: 0 } : {
          default: { type: 'spring', stiffness: 300, damping: 28, mass: 1 },
          opacity: { duration: 0.6, ease: 'easeOut', delay: 0.5 },
          scale:   { type: 'spring', stiffness: 180, damping: 20, mass: 0.7, delay: 0.5 },
          y:       { type: 'spring', stiffness: 180, damping: 20, mass: 0.7, delay: 0.5 },
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !poniMode) playNutriaAnim(); }}
        onPointerLeave={() => setJustDragged(false)}
        aria-label="Registrar emoción"
      >
        {window.innerWidth > 768 && (
          <button
            className="emoc-fab__dismiss"
            aria-label="Ocultar atajo"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          >×</button>
        )}
        <span className="emoc-fab__inner">
          {poniMode ? (
            <img
              src="/icons/emocionario/quiero-un-poni.png"
              alt="Quiero un poni"
              className={`emoc-fab__nutria emoc-fab__poni${sendingPoni ? ' emoc-fab__poni--sending' : ''}`}
            />
          ) : (
            <>
              <img
                src="/icons/nutria-emocionario.webp"
                alt=""
                className={`emoc-fab__nutria${animating ? ' emoc-fab__nutria--hidden' : ''}`}
              />
              <video
                ref={videoRef}
                className={`emoc-fab__nutria-video${animating ? ' emoc-fab__nutria-video--visible' : ''}`}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                onEnded={stopNutriaAnim}
                onError={stopNutriaAnim}
              >
                <source src="/icons/animacion-nutria.mov" type='video/quicktime; codecs="hvc1"' />
                <source src="/icons/animacion-nutria.webm" type="video/webm" />
              </video>
            </>
          )}
        </span>
      </motion.button>

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
      <motion.div
        layoutId="emoc-cloud"
        className="emoc-quick-modal"
        style={{ borderRadius: 24 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
      >
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
  const [stats, setStats] = useState({ visited: 0, wishlist: 0, letters: 0, trips: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [previewLetters, setPreviewLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fileInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const seedRef = useRef(Math.round(Math.random() * 1e6) / 1e6);
  const PAGE_SIZE = 20;
  const [showEmocModal, setShowEmocModal] = useState(false);
  const [fabDismissed, setFabDismissed]   = useState(fabDismissedSession);
  const openEmoc   = useCallback(() => setShowEmocModal(true), []);
  const closeEmoc  = useCallback(() => setShowEmocModal(false), []);
  const dismissFab = useCallback(() => { fabDismissedSession = true; setFabDismissed(true); }, []);

  const load = async () => {
    try {
      const [stats, photos, letters] = await Promise.all([
        getStats(),
        getRecentPhotos(PAGE_SIZE, 0, seedRef.current),
        getLetters({ limit: 3 }),
      ]);

      setStats({
        visited: stats.visited,
        wishlist: stats.wishlist,
        letters: stats.letters,
        trips: stats.trips,
      });

      setPreviewLetters(letters);

      const mapped = photos.map((p) => ({ ...p, placeName: p.place_name }));
      setRecentPhotos(mapped);
      setHasMore(photos.length >= PAGE_SIZE);
    } catch (err) {
      toast.error('No se pudo cargar el inicio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const photos = await getRecentPhotos(PAGE_SIZE, recentPhotos.length, seedRef.current);
      const mapped = photos.map((p) => ({ ...p, placeName: p.place_name }));
      setRecentPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPhotos = mapped.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPhotos];
      });
      setHasMore(photos.length >= PAGE_SIZE);
    } catch {
      // silenciar error de carga parcial
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, recentPhotos.length]);

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleLooseUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      await uploadLoosePhotos(files);
      toast.success('Fotos agregadas');
      // Nuevo seed para que las nuevas fotos aparezcan mezcladas
      seedRef.current = Math.round(Math.random() * 1e6) / 1e6;
      const photos = await getRecentPhotos(PAGE_SIZE, 0, seedRef.current);
      setRecentPhotos(photos.map((p) => ({ ...p, placeName: p.place_name })));
      setHasMore(photos.length >= PAGE_SIZE);
    } catch (err) {
      toast.error('No se pudieron subir: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLoose = (photoId) => {
    setRecentPhotos((prev) => prev.filter((p) => p.id !== photoId));
    toast.success('Foto eliminada');
  };

  const S = '/icons/iconos-secciones/';

  const navCards = [
    { to: '/mapa',        iconImg: `${S}mapita.webp`,             name: 'Mapa',       desc: 'Ver todos en el mapa' },
    { to: '/calendario',  iconImg: `${S}calendario.webp`,         name: 'Calendario', desc: 'Nuestros planes' },
    { to: '/visitados',   iconImg: `${S}ya-hicimos.webp`,         name: 'Ya hicimos', desc: `${stats.visited} lugar${stats.visited !== 1 ? 'es' : ''}` },
    { to: '/por-visitar', iconImg: `${S}por-hacer.webp`,          name: 'Por hacer',  desc: `${stats.wishlist} pendiente${stats.wishlist !== 1 ? 's' : ''}` },
    { to: '/recetas',     iconImg: `${S}recetas.webp`,            name: 'Recetas',    desc: 'Ver nuestras recetas' },
    { to: '/cine',        iconImg: `${S}cine.webp`,               name: 'Cine',       desc: 'Películas y series' },
    { to: '/viajecitos',  iconImg: `${S}viajecitos.webp`,         name: 'Viajecitos', desc: 'Nuestros próximos viajes' },
  ];

  const moreLinks = [
    { to: '/cartitas',    iconImg: `${S}cartitas.webp`,              name: 'Cartitas' },
    { to: '/nombres',     iconImg: `${S}nombres.webp`,               name: 'Nombres' },
    { to: '/outfits',     iconImg: `${S}clima-en-outfits.webp`,      name: 'Outfits' },
  ];

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

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
            <div className="home__stat-label">ya hicimos</div>
          </div>
          <div className="home__stat">
            <div className="home__stat-number">{stats.wishlist}</div>
            <div className="home__stat-label">por hacer</div>
          </div>
          <div className="home__stat">
            <div className="home__stat-number">{stats.trips}</div>
            <div className="home__stat-label">viajecitos</div>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <section className="home__sections">
        <h2 className="home__section-title">Nuestro espacio</h2>
        <div className="home__nav-cards">
          {navCards.map(({ to, icon, iconImg, name, desc }) => (
            <Link key={to} to={to} className="home__nav-card">
              <span className="home__nav-card-icon">
                {iconImg
                  ? <img src={iconImg} alt="" className="home__nav-card-icon-img" />
                  : icon}
              </span>
              <span className="home__nav-card-name">{name}</span>
              <span className="home__nav-card-desc">{desc}</span>
            </Link>
          ))}

          {/* Botón + con panel de más secciones */}
          <div className="home__nav-card-more" ref={moreRef}>
            <button
              className={`home__nav-card home__nav-card--more-btn${showMore ? ' home__nav-card--more-btn--open' : ''}`}
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
            >
              <span className={`home__nav-card-icon home__more-icon${showMore ? ' home__more-icon--open' : ''}`}>+</span>
              <span className="home__nav-card-name">Más</span>
              <span className="home__nav-card-desc">Otras secciones</span>
            </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  className="home__more-panel"
                  style={{ x: isMobile ? '0%' : '-50%' }}
                  initial={{ opacity: 0, y: 8, scale: 0.92, transformOrigin: 'center bottom' }}
                  animate={{ opacity: 1, y: 0, scale: 1, transformOrigin: 'center bottom' }}
                  exit={{ opacity: 0, y: 6, scale: 0.94, transformOrigin: 'center bottom' }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {moreLinks.map(({ to, icon, iconImg, name }) => (
                    <Link key={to} to={to} className="home__more-panel-item" onClick={() => setShowMore(false)}>
                      <span className="home__more-panel-icon">
                        {iconImg ? <img src={iconImg} alt="" /> : icon}
                      </span>
                      <span className="home__more-panel-name">{name}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
      {!loading && (
        <section className="home__recent">
          <div className="home__gallery-header" style={{ marginTop: '40px' }}>
            <h2 className="home__section-title" style={{ marginTop: 0 }}>Galería</h2>
            <button
              className="home__gallery-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '...' : '+'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={handleLooseUpload}
            />
          </div>
          {recentPhotos.length > 0 ? (
            <>
              <div className="home__polaroids">
                {recentPhotos.map((photo, i) => (
                  <div key={photo.id} className="polaroid" onClick={() => setLightboxIndex(i)}>
                    {photo.resource_type === 'video'
                      ? <VideoPolaroid photo={photo} />
                      : <img src={polaroidUrl(photo.cloudinary_url)} alt={photo.placeName} className="polaroid__img" loading="lazy" />
                    }
                    <p className="polaroid__caption">{photo.placeName}</p>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="home__gallery-sentinel">
                  {loadingMore && <span className="home__gallery-loading">Cargando...</span>}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Todavía no hay fotos.</p>
            </div>
          )}
        </section>
      )}

      {/* Lightbox — portal para escapar del stacking context del motion.div de Layout */}
      {lightboxIndex !== null && createPortal(
        <HomeLightbox
          photos={recentPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDeleteLoose}
        />,
        document.body
      )}

      <AnimatePresence>
        {!showEmocModal && !fabDismissed && (
          <FloatingEmocButton key="emoc-btn" onOpen={openEmoc} onDismiss={dismissFab} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmocModal && <EmocQuickModal key="emoc-modal" onClose={closeEmoc} />}
      </AnimatePresence>
    </div>
  );
}
