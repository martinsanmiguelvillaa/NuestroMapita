/**
 * Imagen de portada de receta con ajuste de encuadre por arrastre.
 * Reutiliza el mismo patrón de drag que CoverPhoto.
 */
import { useState, useRef } from 'react';
import { updateRecipePhotoPosition } from '../../api/recipes';
import { toast } from 'sonner';
import '../../styles/photos.css';
import '../../styles/recipes.css';

export default function RecipeCoverImage({
  recipe,
  className = '',
  onClick,
  onPositionSaved,
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);
  const [saving, setSaving] = useState(false);
  const dragState = useRef(null);

  if (!recipe.image_url) return null;

  const storedPos = { x: recipe.image_position_x ?? 50, y: recipe.image_position_y ?? 50 };
  const pos = pendingPos ?? storedPos;

  // ── Drag ────────────────────────────────────────────────────────────
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

  // ── Save / cancel ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRecipePhotoPosition(recipe.id, pos.x, pos.y);
      setAdjusting(false);
      setPendingPos(null);
      onPositionSaved?.();
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setPendingPos(null); setAdjusting(false); };

  return (
    <div className={`recipe-cover ${className}${adjusting ? ' recipe-cover--adjusting' : ''}`}>
      <img
        src={recipe.image_url}
        alt={recipe.title}
        className="recipe-cover__img"
        style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        onClick={!adjusting ? onClick : undefined}
      />

      {/* Overlay de arrastre */}
      {adjusting && (
        <div
          className="cover-photo__adjust-overlay"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
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
