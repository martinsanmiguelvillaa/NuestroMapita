import { useState } from 'react';
import { deletePhoto } from '../../api/photos';
import '../../styles/photos.css';

/**
 * Galería de fotos con lightbox y opción de eliminar.
 *
 * Props:
 * - photos: array de { id, cloudinary_url }
 * - onDelete: función llamada cuando se elimina una foto (para refrescar la lista)
 * - canDelete: si es false, no muestra el botón de eliminar
 */
export default function PhotoGallery({ photos = [], onDelete, canDelete = true }) {
  const [lightbox, setLightbox] = useState(null); // URL de la foto ampliada
  const [deleting, setDeleting] = useState(null); // ID de foto que se está borrando

  const handleDelete = async (photo) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    setDeleting(photo.id);
    try {
      await deletePhoto(photo.id);
      onDelete?.();
    } catch (err) {
      alert('No se pudo eliminar la foto: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (!photos.length) return null;

  return (
    <>
      <div className="photo-gallery">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-gallery__item">
            <img
              src={photo.cloudinary_url}
              alt="Foto del lugar"
              className="photo-gallery__img"
              onClick={() => setLightbox(photo.cloudinary_url)}
              loading="lazy"
            />
            <div className="photo-gallery__overlay">
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

      {/* Lightbox: foto ampliada */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto ampliada" className="lightbox__img" />
          <button className="lightbox__close" onClick={() => setLightbox(null)}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
