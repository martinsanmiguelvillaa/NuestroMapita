import { useEffect, useRef } from 'react';
import '../../styles/modal.css';

const DRAG_ZONE_PX = 72;   // px desde el top del sheet donde se activa el drag
const CLOSE_THRESHOLD = 160; // px arrastrados para cerrar

export default function Modal({ isOpen, onClose, title, children, wide = false, fullscreen = false, isDirty = false }) {
  const sheetRef = useRef(null);
  const drag = useRef({ active: false, startY: 0, dy: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ── Drag-to-close (solo en fullscreen) ── */
  const onTouchStart = (e) => {
    if (!fullscreen || !sheetRef.current) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const relY = e.touches[0].clientY - rect.top;
    if (relY > DRAG_ZONE_PX) return; // solo desde el handle/header
    drag.current = { active: true, startY: e.touches[0].clientY, dy: 0 };
    sheetRef.current.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!drag.current.active || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.startY);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
    // Dar feedback de opacidad en el overlay
    const ratio = Math.min(dy / 300, 1);
    sheetRef.current.closest('.modal-overlay').style.opacity = 1 - ratio * 0.4;
  };

  const onTouchEnd = () => {
    if (!drag.current.active || !sheetRef.current) return;
    drag.current.active = false;
    const el = sheetRef.current;
    const overlay = el.closest('.modal-overlay');
    const snap = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

    if (drag.current.dy > CLOSE_THRESHOLD && !isDirty) {
      el.style.transition = snap;
      el.style.transform = 'translateY(110%)';
      if (overlay) { overlay.style.transition = 'opacity 0.3s'; overlay.style.opacity = '0'; }
      setTimeout(onClose, 320);
    } else {
      el.style.transition = snap;
      el.style.transform = 'translateY(0)';
      if (overlay) { overlay.style.transition = 'opacity 0.3s'; overlay.style.opacity = '1'; }
    }
  };

  return (
    <div className={`modal-overlay${fullscreen ? ' modal-overlay--fullscreen' : ''}`} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`modal-content${wide ? ' modal-wide' : ''}${fullscreen ? ' modal-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
