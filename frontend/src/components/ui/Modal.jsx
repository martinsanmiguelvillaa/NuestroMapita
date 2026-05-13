import { useEffect } from 'react';
import '../../styles/modal.css';

/**
 * Modal reutilizable con overlay.
 * - Se cierra con la tecla Escape o haciendo click fuera.
 * - Bloquea el scroll del body mientras está abierto.
 * - Animación de fade + slide up.
 */
export default function Modal({ isOpen, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Detener propagación para que el click dentro del modal no cierre el overlay */}
      <div
        className={`modal-content${wide ? ' modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
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
