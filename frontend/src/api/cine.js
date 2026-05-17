import apiFetch from './client';

const BASE = '/cine';

export const getCineItems = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`${BASE}${qs ? '?' + qs : ''}`);
};

export const getCineItem = (id) => apiFetch(`${BASE}/${id}`);

export const createCineItem = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateCineItem = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCineItem = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export const addCineComment = (itemId, data) =>
  apiFetch(`${BASE}/${itemId}/comments`, { method: 'POST', body: JSON.stringify(data) });

export const deleteCineComment = (itemId, commentId) =>
  apiFetch(`${BASE}/${itemId}/comments/${commentId}`, { method: 'DELETE' });

export const searchTmdb = (q) =>
  apiFetch(`${BASE}/tmdb/search?q=${encodeURIComponent(q)}`);

export const getTmdbDetail = (type, tmdbId) =>
  apiFetch(`${BASE}/tmdb/detail?type=${type}&tmdb_id=${tmdbId}`);

// ─── Helpers preparados para futura integración con OpenAI ──────────────────
// Permiten construir el perfil de gustos del usuario sin reescribir nada.

export const getWatchedItems = (items) =>
  items.filter((i) => i.status === 'watched');

export const getFavoriteItems = (items) =>
  items.filter((i) => i.is_favorite);

export const getHighRatedItems = (items, minRating = 4) =>
  items.filter((i) => i.rating >= minRating);

export const buildTasteProfile = (items) => {
  const watched = getWatchedItems(items);
  return {
    watched_count: watched.length,
    favorite_ids: getFavoriteItems(watched).map((i) => i.id),
    high_rated_ids: getHighRatedItems(watched).map((i) => i.id),
    genres: [...new Set(watched.flatMap((i) => i.genres || []))],
    titles: watched.map((i) => ({ title: i.title, type: i.type, rating: i.rating })),
  };
};
