/**
 * Foto de portada con navegación prev/next y ajuste de encuadre.
 * El ajuste guarda el punto focal (object-position) en el backend.
 */
import { useState } from 'react';
import { updatePhotoPosition } from '../../api/photos';

export default function CoverPhoto({
  photos = [],
  coverIndex,
  onCoverIndexChange,
  onCoverClick,       // (safeIndex) => void — para abrir el lightbox
  onPositionSaved,    // () => void — para recargar los datos del lugar
  aspectRatio = '4/3',
  placeholder = '📍',
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);
  const [saving, setSaving] = useState(false);

  const photoCount = photos.length;
  const safeIndex = photoCount > 0 ? Math.min(coverIndex, photoCount - 1) : 0;
  const photo = photos[safeIndex];

  const storedPos = { x: photo?.position_x ?? 50, y: photo?.position_y ?? 50 };
  const pos = pendingPos ?? storedPos;

  const handleOverlayClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    setPendingPos({ x, y });
  };

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

  const handleCancel = () => {
    setPendingPos(null);
    setAdjusting(false);
  };

  if (!photo) {
    return (
      <div className="cover-photo" style={{ aspectRatio }}>
        <div className="cover-photo__placeholder">{placeholder}</div>
      </div>
    );
  }

  return (
    <div className={`cover-photo${adjusting ? ' cover-photo--adjusting' : ''}`} style={{ aspectRatio }}>
      <img
        src={photo.cloudinary_url}
        alt=""
        className="cover-photo__img"
        style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        onClick={!adjusting ? () => onCoverClick?.(safeIndex) : undefined}
      />

      {/* Overlay clickeable para ajuste */}
      {adjusting && (
        <div className="cover-photo__adjust-overlay" onClick={handleOverlayClick}>
          <div
            className="cover-photo__focal-dot"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          />
        </div>
      )}

      {/* Flechas de navegación (ocultas en modo ajuste) */}
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

      {/* Botón ajustar (aparece al hover) */}
      {!adjusting && (
        <button
          className="cover-photo__adjust-btn"
          onClick={(e) => { e.stopPropagation(); setAdjusting(true); }}
          title="Ajustar encuadre"
        >
          ✂ Ajustar
        </button>
      )}

      {/* Controles del modo ajuste */}
      {adjusting && (
        <div className="cover-photo__adjust-controls" onClick={(e) => e.stopPropagation()}>
          <span className="cover-photo__adjust-hint">Tocá donde querés el enfoque</span>
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
