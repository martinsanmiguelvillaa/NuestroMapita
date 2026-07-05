import apiFetch from './client';

export const getRecentPhotos = (limit = 20, offset = 0) =>
  apiFetch(`/photos/recent?limit=${limit}&offset=${offset}`);

export const getStats = () => apiFetch('/photos/stats');

async function uploadWithTimeout(url, files, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  try {
    return await apiFetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('La subida tardó demasiado. Verificá tu conexión e intentá de nuevo.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const uploadLoosePhotos = (files) =>
  uploadWithTimeout('/photos/loose', files);

export const uploadPhotos = (placeId, files) =>
  uploadWithTimeout(`/places/visited/${placeId}/photos`, files);

export const uploadWishlistPhotos = (placeId, files) =>
  uploadWithTimeout(`/places/wishlist/${placeId}/photos`, files);

export const uploadTripPhotos = (tripId, files) =>
  uploadWithTimeout(`/trips/${tripId}/photos`, files);

export const deletePhoto = (photoId) =>
  apiFetch(`/photos/${photoId}`, { method: 'DELETE' });

export const updatePhotoPosition = (photoId, x, y) =>
  apiFetch(`/photos/${photoId}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ x, y }),
  });

export const setCoverPhoto = (photoId) =>
  apiFetch(`/photos/${photoId}/set-cover`, { method: 'PATCH' });
