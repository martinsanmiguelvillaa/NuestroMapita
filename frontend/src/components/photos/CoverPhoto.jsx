/**
 * Foto de portada con navegación prev/next y ajuste de encuadre.
 * En modo ajuste: arrastrá la imagen para reencuadrar en tiempo real.
 */
import { useState, useRef, useEffect } from 'react';
import { updatePhotoPosition } from '../../api/photos';

function videoThumb(url) {
  return url
    .replace('/video/upload/', '/video/upload/so_0,w_800/')
    .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
}

function photoSrc(photo) {
  return photo.resource_type === 'video'
    ? videoThumb(photo.cloudinary_url)
    : photo.cloudinary_url;
}

export default function CoverPhoto({
  photos = [],
  coverIndex,
  onCoverIndexChange,
  onCoverClick,
  onPositionSaved,
  aspectRatio = '4/3',
  placeholder = '📍',
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);
  const [saving, setSaving] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  // Animación: imagen anterior saliendo mientras la nueva entra
  const [prevSlide, setPrevSlide] = useState(null); // { src, pos, dir }
  const [enterDir, setEnterDir] = useState('next');
  const [enterKey, setEnterKey] = useState(0);

  const dragState = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const photoCount = photos.length;
  const safeIndex = photoCount > 0 ? Math.min(coverIndex, photoCount - 1) : 0;
  const photo = photos[safeIndex];

  // Reproduce el video solo cuando la tarjeta es visible en pantalla
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || photo?.resource_type !== 'video') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [photo?.resource_type, photo?.cloudinary_url]);

  const storedPos = { x: photo?.position_x ?? 50, y: photo?.position_y ?? 50 };
  const pos = pendingPos ?? storedPos;

  // ── Navegación con animación de transición ─────────────────────────
  const navigate = (dir, nextIndex) => {
    if (!photo) return;
    setPrevSlide({
      src: photoSrc(photo),
      pos: { x: storedPos.x, y: storedPos.y },
      dir,
    });
    setEnterDir(dir);
    setEnterKey(k => k + 1);
    onCoverIndexChange(nextIndex);
  };

  // ── Drag (mouse) ──────────────────────────────────────────────────
  const startDrag = (clientX, clientY, rect) => {
    dragState.current = { startX: clientX, startY: clientY, startPos: { ...pos }, rect };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragState.current) return;
    const { startX, startY, startPos, rect } = dragState.current;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const newX = Math.round(Math.max(0, Math.min(100, startPos.x - (dx / rect.width) * 100)));
    const newY = Math.round(Math.max(0, Math.min(100, startPos.y - (dy / rect.height) * 100)));
    setPendingPos({ x: newX, y: newY });
  };

  const endDrag = () => { dragState.current = null; };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
    const onMove = (e) => moveDrag(e.clientX, e.clientY);
    const onUp = () => {
      endDrag();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect());
    const onMove = (e) => { e.preventDefault(); const t = e.touches[0]; moveDrag(t.clientX, t.clientY); };
    const onEnd = () => {
      endDrag();
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  // ── Save / cancel ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!photo) { setAdjusting(false); return; }
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

  if (!photo) {
    return (
      <div className="cover-photo" style={{ aspectRatio }}>
        <div className="cover-photo__placeholder">{placeholder}</div>
      </div>
    );
  }

  const enterClass = enterKey > 0 ? `cover-photo__img--enter-${enterDir}` : '';

  return (
    <div
      ref={containerRef}
      className={`cover-photo${adjusting ? ' cover-photo--adjusting' : ''}`}
      style={{ aspectRatio }}
    >
      {/* Imagen anterior saliendo (absoluta, encima, se desvanece) */}
      {prevSlide && (
        <img
          src={prevSlide.src}
          alt=""
          className={`cover-photo__img cover-photo__img--exit cover-photo__img--exit-${prevSlide.dir}`}
          style={{ objectPosition: `${prevSlide.pos.x}% ${prevSlide.pos.y}%` }}
          onAnimationEnd={() => setPrevSlide(null)}
        />
      )}

      {/* Imagen/video entrante */}
      {photo.resource_type === 'video' ? (
        <>
          {!videoPlaying && (
            <img
              key={enterKey}
              src={videoThumb(photo.cloudinary_url)}
              alt=""
              className={`cover-photo__img ${enterClass}`}
              style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
              onClick={!adjusting ? () => onCoverClick?.(safeIndex) : undefined}
            />
          )}
          <video
            key={`v-${enterKey}`}
            ref={videoRef}
            src={photo.cloudinary_url}
            className={`cover-photo__img ${enterClass}`}
            style={{ objectPosition: `${pos.x}% ${pos.y}%`, display: videoPlaying ? 'block' : 'none' }}
            onClick={!adjusting ? () => onCoverClick?.(safeIndex) : undefined}
            muted
            autoPlay
            loop
            playsInline
            preload="none"
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
          />
        </>
      ) : (
        <img
          key={enterKey}
          src={photo.cloudinary_url}
          alt=""
          className={`cover-photo__img ${enterClass}`}
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
          onClick={!adjusting ? () => onCoverClick?.(safeIndex) : undefined}
        />
      )}

      {/* Overlay de arrastre */}
      {adjusting && (
        <div
          className="cover-photo__adjust-overlay"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      )}

      {/* Flechas de navegación */}
      {!adjusting && photoCount > 1 && (
        <>
          <button
            className="cover-photo__arrow cover-photo__arrow--prev"
            onClick={(e) => { e.stopPropagation(); navigate('prev', (safeIndex - 1 + photoCount) % photoCount); }}
          >‹</button>
          <button
            className="cover-photo__arrow cover-photo__arrow--next"
            onClick={(e) => { e.stopPropagation(); navigate('next', (safeIndex + 1) % photoCount); }}
          >›</button>
          <span className="cover-photo__counter">{safeIndex + 1}/{photoCount}</span>
        </>
      )}

      {/* Botón ajustar */}
      {!adjusting && (
        <button
          className="cover-photo__adjust-btn"
          onClick={(e) => { e.stopPropagation(); setAdjusting(true); }}
          title="Ajustar encuadre"
        >
          ✂ Ajustar
        </button>
      )}

      {/* Controles modo ajuste */}
      {adjusting && (
        <div className="cover-photo__adjust-controls" onClick={(e) => e.stopPropagation()}>
          <span className="cover-photo__adjust-hint">Arrastrá la foto para reencuadrar</span>
          <div className="cover-photo__adjust-btns">
            <button className="cover-photo__adjust-save" onClick={handleSave} disabled={saving}>
              {saving ? '...' : '✓ Guardar'}
            </button>
            <button className="cover-photo__adjust-cancel" onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
