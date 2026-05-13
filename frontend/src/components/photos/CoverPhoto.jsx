/**
 * Foto de portada con navegación prev/next y ajuste de encuadre.
 * En modo ajuste: arrastrá la imagen para reencuadrar en tiempo real.
 */
import { useState, useRef } from 'react';
import { updatePhotoPosition } from '../../api/photos';

// Genera URL del primer frame de un video de Cloudinary como imagen estática
function videoThumbnailUrl(videoUrl) {
  return videoUrl
    .replace('/video/upload/', '/video/upload/so_0,w_800/')
    .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
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
  const dragState = useRef(null); // { startX, startY, startPos, rect }

  const photoCount = photos.length;
  const safeIndex = photoCount > 0 ? Math.min(coverIndex, photoCount - 1) : 0;
  const photo = photos[safeIndex];

  const storedPos = { x: photo?.position_x ?? 50, y: photo?.position_y ?? 50 };
  const pos = pendingPos ?? storedPos;

  // ── Drag (mouse) ──────────────────────────────────────────────────
  const startDrag = (clientX, clientY, rect) => {
    dragState.current = { startX: clientX, startY: clientY, startPos: { ...pos }, rect };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragState.current) return;
    const { startX, startY, startPos, rect } = dragState.current;
    const dx = clientX - startX;
    const dy = clientY - startY;
    // Sensitivity: dragging the full container width goes from 0→100%
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
    e.stopPropagation(); // evita activar el drag de reordenar en wishlist
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

  return (
    <div className={`cover-photo${adjusting ? ' cover-photo--adjusting' : ''}`} style={{ aspectRatio }}>
      {photo.resource_type === 'video' ? (
        <>
          <img
            src={videoThumbnailUrl(photo.cloudinary_url)}
            alt=""
            className="cover-photo__img"
            style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
            onClick={!adjusting ? () => onCoverClick?.(safeIndex) : undefined}
          />
          <span className="cover-photo__video-badge">▶</span>
        </>
      ) : (
        <img
          src={photo.cloudinary_url}
          alt=""
          className="cover-photo__img"
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
            onClick={(e) => { e.stopPropagation(); onCoverIndexChange((safeIndex - 1 + photoCount) % photoCount); }}
          >‹</button>
          <button
            className="cover-photo__arrow cover-photo__arrow--next"
            onClick={(e) => { e.stopPropagation(); onCoverIndexChange((safeIndex + 1) % photoCount); }}
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
