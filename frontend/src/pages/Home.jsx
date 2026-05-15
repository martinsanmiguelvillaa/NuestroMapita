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
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getRecentPhotos, getStats } from '../api/photos';
import { getLetters } from '../api/letters';
import { polaroidUrl, fullUrl } from '../utils/cloudinary';
import '../styles/home.css';
import '../styles/photos.css';

// ── Polaroid de video con autoplay por visibilidad ─────────────────
function VideoPolaroid({ photo, onClick }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={photo.cloudinary_url}  // videos no se transforman
      className="polaroid__img"
      muted
      loop
      playsInline
      preload="none"
      onClick={onClick}
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

// ── Página principal ───────────────────────────────────────────────
export default function Home() {
  const [stats, setStats] = useState({ visited: 0, wishlist: 0, letters: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [previewLetters, setPreviewLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

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
      console.error('Error cargando home:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const navCards = [
    { to: '/visitados',   icon: '✓', name: 'Ya hicimos',  desc: `${stats.visited} lugar${stats.visited !== 1 ? 'es' : ''}` },
    { to: '/por-visitar', icon: '★', name: 'Por hacer',   desc: `${stats.wishlist} pendiente${stats.wishlist !== 1 ? 's' : ''}` },
    { to: '/mapa',        icon: '🗺️', name: 'Mapa',       desc: 'Ver todos en el mapa' },
    { to: '/cartitas',    icon: '💌', name: 'Cartitas',    desc: `${stats.letters} guardada${stats.letters !== 1 ? 's' : ''}` },
    { to: '/recetas',     icon: '🍴', name: 'Recetas',     desc: 'Ver nuestras recetas' },
  ];

  return (
    <div className="home fade-in">
      {/* Hero */}
      <section className="home__hero">
        <h1 className="home__hero-title">
          <em>Nuestro</em> Mapita
        </h1>
        <p className="home__hero-desc">
          Un lugar para nuestros plancitos, recuerdos y varias cosas mas..
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
            <div className="home__stat-label">por visitar</div>
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
                  {letter.body.length > 80 ? letter.body.slice(0, 80) + '…' : letter.body}
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
                  ? <VideoPolaroid photo={photo} onClick={() => setLightboxPhoto(photo)} />
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
    </div>
  );
}
