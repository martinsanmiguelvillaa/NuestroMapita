import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { deletePhoto } from '../../api/photos';
import '../../styles/photos.css';

const PhotoGallery = forwardRef(function PhotoGallery({ photos = [], onDelete, canDelete = true }, ref) {
  const [lightboxIndex, setLightboxIndex] = useState(null); // índice abierto o null

  useImperativeHandle(ref, () => ({
    openAt: (index) => setLightboxIndex(index),
  }), []);
  const [deleting, setDeleting] = useState(null);

  const isOpen = lightboxIndex !== null;
  const current = isOpen ? photos[lightboxIndex] : null;

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const close = () => setLightboxIndex(null);

  // Teclado: flechas + Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, prev, next]);

  const handleDelete = async (photo) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    setDeleting(photo.id);
    try {
      await deletePhoto(photo.id);
      onDelete?.();
      if (lightboxIndex >= photos.length - 1) {
        setLightboxIndex(photos.length > 1 ? photos.length - 2 : null);
      }
    } catch (err) {
      alert('No se pudo eliminar la foto: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (photo) => {
    try {
      const res = await fetch(photo.cloudinary_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foto-${photo.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: abrir en nueva pestaña
      window.open(photo.cloudinary_url, '_blank');
    }
  };

  if (!photos.length) return null;

  return (
    <>
      {/* Grilla de miniaturas */}
      <div className="photo-gallery">
        {photos.map((photo, i) => (
          <div key={photo.id} className="photo-gallery__item">
            <img
              src={photo.cloudinary_url}
              alt="Foto del lugar"
              className="photo-gallery__img"
              onClick={() => setLightboxIndex(i)}
              loading="lazy"
            />
            <div className="photo-gallery__overlay">
              <button
                className="photo-gallery__expand"
                onClick={() => setLightboxIndex(i)}
                title="Ver foto"
              >
                ⤢
              </button>
              {canDelete && (
                <button
                  className="photo-gallery__delete"
                  onClick={() => handleDelete(photo)}
                  disabled={deleting === photo.id}
                  title="Eliminar foto"
                >
                  {deleting === photo.id ? '...' : '✕'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox con navegación */}
      {isOpen && current && (
        <div className="lightbox" onClick={close}>
          {/* Contador */}
          <div className="lightbox__counter" onClick={(e) => e.stopPropagation()}>
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Botón cerrar */}
          <button className="lightbox__close" onClick={close}>×</button>

          {/* Flecha anterior */}
          {photos.length > 1 && (
            <button
              className="lightbox__arrow lightbox__arrow--prev"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              ‹
            </button>
          )}

          {/* Foto */}
          <img
            src={current.cloudinary_url}
            alt="Foto ampliada"
            className="lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Flecha siguiente */}
          {photos.length > 1 && (
            <button
              className="lightbox__arrow lightbox__arrow--next"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              ›
            </button>
          )}

          {/* Acciones: descargar + eliminar */}
          <div className="lightbox__actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox__action-btn"
              onClick={() => handleDownload(current)}
              title="Descargar foto"
            >
              ⬇ Descargar
            </button>
            {canDelete && (
              <button
                className="lightbox__action-btn lightbox__action-btn--danger"
                onClick={() => handleDelete(current)}
                disabled={deleting === current.id}
                title="Eliminar foto"
              >
                {deleting === current.id ? '...' : '🗑 Eliminar'}
              </button>
            )}
          </div>

          {/* Miniaturas en la barra inferior */}
          {photos.length > 1 && (
            <div className="lightbox__thumbs" onClick={(e) => e.stopPropagation()}>
              {photos.map((p, i) => (
                <img
                  key={p.id}
                  src={p.cloudinary_url}
                  alt=""
                  className={`lightbox__thumb${i === lightboxIndex ? ' lightbox__thumb--active' : ''}`}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
});

export default PhotoGallery;
