import apiFetch from './client';

export const getRecentPhotos = (limit = 16) =>
  apiFetch(`/photos/recent?limit=${limit}`);

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

export const uploadPhotos = (placeId, files) =>
  uploadWithTimeout(`/places/visited/${placeId}/photos`, files);

export const uploadWishlistPhotos = (placeId, files) =>
  uploadWithTimeout(`/places/wishlist/${placeId}/photos`, files);

export const deletePhoto = (photoId) =>
  apiFetch(`/photos/${photoId}`, { method: 'DELETE' });

export const updatePhotoPosition = (photoId, x, y) =>
  apiFetch(`/photos/${photoId}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ x, y }),
  });

export const setCoverPhoto = (photoId) =>
  apiFetch(`/photos/${photoId}/set-cover`, { method: 'PATCH' });

export async function fetchThumbnailAsFile(sharedUrl) {
  const token = localStorage.getItem('mapita_token');
  const API_BASE = import.meta.env.VITE_API_URL || '';
  try {
    const response = await fetch(
      `${API_BASE}/utils/thumbnail?url=${encodeURIComponent(sharedUrl)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], 'thumbnail.jpg', { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}
