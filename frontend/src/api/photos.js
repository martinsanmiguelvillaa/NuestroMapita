import apiFetch from './client';

/**
 * Sube una o varias fotos a un lugar visitado.
 * @param {number} placeId - ID del lugar visitado
 * @param {FileList|File[]} files - Archivos de imagen
 */
export async function uploadPhotos(placeId, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return apiFetch(`/places/visited/${placeId}/photos`, {
    method: 'POST',
    body: formData,
    // No setear Content-Type, el browser lo pone automáticamente con el boundary
  });
}

export const deletePhoto = (photoId) =>
  apiFetch(`/photos/${photoId}`, { method: 'DELETE' });
