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
import { getVisited } from '../api/placesVisited';
import { getWishlist } from '../api/placesWishlist';
import { getLetters } from '../api/letters';
import { updatePhotoPosition } from '../api/photos';
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
      src={photo.cloudinary_url}
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

// ── Lightbox de la galería home ────────────────────────────────────
function HomeLightbox({ photo, onClose, onPositionSaved }) {
  const [adjusting, setAdjusting] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);
  const [saving, setSaving] = useState(false);
  const dragState = useRef(null);

  const storedPos = { x: photo.position_x ?? 50, y: photo.position_y ?? 50 };
  const pos = pendingPos ?? storedPos;

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Drag ──────────────────────────────────────────────────────────
  const startDrag = (clientX, clientY, rect) => {
    dragState.current = { startX: clientX, startY: clientY, startPos: { ...pos }, rect };
  };
  const moveDrag = (clientX, clientY) => {
    if (!dragState.current) return;
    const { startX, startY, startPos, rect } = dragState.current;
    const newX = Math.round(Math.max(0, Math.min(100, startPos.x - ((clientX - startX) / rect.width) * 100)));
    const newY = Math.round(Math.max(0, Math.min(100, startPos.y - ((clientY - startY) / rect.height) * 100)));
    setPendingPos({ x: newX, y: newY });
  };
  const endDrag = () => { dragState.current = null; };

  const handleMouseDown = (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
    const onMove = (e) => moveDrag(e.clientX, e.clientY);
    const onUp = () => { endDrag(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect());
    const onMove = (e) => { e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY); };
    const onEnd = () => { endDrag(); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  // ── Guardar posición ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePhotoPosition(photo.id, pos.x, pos.y);
      setAdjusting(false);
      setPendingPos(null);
      onPositionSaved?.();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => { setPendingPos(null); setAdjusting(false); };

  // ── Descargar ─────────────────────────────────────────────────────
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
    <div className="lightbox" onClick={!adjusting ? onClose : undefined}>
      <button className="lightbox__close" onClick={onClose}>×</button>

      {/* Contenedor de la imagen/video con drag overlay */}
      <div
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            key={photo.id}
            src={photo.cloudinary_url}
            className="lightbox__img"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={photo.cloudinary_url}
            alt={photo.placeName}
            className="lightbox__img"
            style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
          />
        )}

        {/* Overlay de arrastre */}
        {adjusting && (
          <div
            style={{ position: 'absolute', inset: 0, cursor: 'grab', zIndex: 10 }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
        )}
      </div>

      {/* Acciones */}
      <div className="lightbox__actions" onClick={(e) => e.stopPropagation()}>
        {!adjusting ? (
          <>
            <button className="lightbox__action-btn" onClick={handleDownload}>
              ⬇ Descargar
            </button>
            {!isVideo && (
              <button className="lightbox__action-btn" onClick={() => setAdjusting(true)}>
                ✂ Ajustar marco
              </button>
            )}
          </>
        ) : (
          <>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              Arrastrá la foto para reencuadrar
            </span>
            <button className="lightbox__action-btn lightbox__action-btn--active" onClick={handleSave} disabled={saving}>
              {saving ? '...' : '✓ Guardar'}
            </button>
            <button className="lightbox__action-btn" onClick={handleCancel}>
              Cancelar
            </button>
          </>
        )}
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
      const [visited, wishlist, letters] = await Promise.all([
        getVisited({ sort: 'newest' }),
        getWishlist(),
        getLetters(),
      ]);

      setStats({
        visited: visited.length,
        wishlist: wishlist.length,
        letters: letters.length,
      });

      setPreviewLetters(letters.slice(0, 3));

      const all = visited.flatMap((p) => p.photos.map((ph) => ({ ...ph, placeName: p.name })));
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
    { to: '/visitados',   icon: '✓', name: 'Visitados',   desc: `${stats.visited} lugar${stats.visited !== 1 ? 'es' : ''}` },
    { to: '/por-visitar', icon: '★', name: 'Por visitar', desc: `${stats.wishlist} pendiente${stats.wishlist !== 1 ? 's' : ''}` },
    { to: '/mapa',        icon: '🗺️', name: 'Mapa',       desc: 'Ver todos en el mapa' },
    { to: '/cartitas',    icon: '💌', name: 'Cartitas',    desc: `${stats.letters} guardada${stats.letters !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="home fade-in">
      {/* Hero */}
      <section className="home__hero">
        <p className="home__hero-subtitle">solo para nosotros</p>
        <h1 className="home__hero-title">
          <em>Nuestro</em> Mapita
        </h1>
        <p className="home__hero-desc">
          Todos nuestros recuerdos, planes y cartitas en un solo lugar.
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
                  : <img src={photo.cloudinary_url} alt={photo.placeName} className="polaroid__img" loading="lazy" />
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
          onPositionSaved={() => {
            setLightboxPhoto(null);
            load();
          }}
        />
      )}
    </div>
  );
}
