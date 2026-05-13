/**
 * Sección de fotos reutilizable: galería + botón para subir más.
 * Se usa dentro de las tarjetas de visitados y por visitar.
 */
import { useState, useRef } from 'react';
import PhotoGallery from './PhotoGallery';
import '../../styles/photos.css';

export default function PhotoSection({ photos = [], onUpload, onDelete, onCoverSet, uploading, galleryRef }) {
  const [pendingFiles, setPendingFiles] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFiles = (e) => {
    setError('');
    setPendingFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    setError('');
    try {
      await onUpload(pendingFiles);
      setPendingFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Error al subir. Intentá de nuevo.');
    }
  };

  return (
    <div className="photo-section">
      {photos.length > 0 && (
        <PhotoGallery ref={galleryRef} photos={photos} onDelete={onDelete} onCoverSet={onCoverSet} />
      )}

      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', margin: '4px 0' }}>
          ⚠ {error}
        </p>
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
