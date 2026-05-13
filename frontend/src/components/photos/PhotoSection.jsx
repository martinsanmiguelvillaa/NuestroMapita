/**
 * Sección de fotos reutilizable: galería + botón para subir más.
 * Se usa dentro de las tarjetas de visitados y por visitar.
 */
import { useState, useRef } from 'react';
import PhotoGallery from './PhotoGallery';
import '../../styles/photos.css';

export default function PhotoSection({ photos = [], onUpload, onDelete, uploading }) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const inputRef = useRef();

  const handleFiles = (e) => {
    setPendingFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    try {
      await onUpload(pendingFiles);
      setPendingFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      alert('Error al subir fotos: ' + err.message);
    }
  };

  return (
    <div className="photo-section">
      {photos.length > 0 && (
        <PhotoGallery photos={photos} onDelete={onDelete} />
      )}

      <div className="photo-section__upload">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm photo-section__add-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          📷 {photos.length > 0 ? 'Agregar fotos' : 'Subir fotos'}
        </button>

        {pendingFiles.length > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? 'Subiendo...'
              : `Subir ${pendingFiles.length} foto${pendingFiles.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
