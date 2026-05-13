import apiFetch from './client';

const BASE = '/places/wishlist';

export const getWishlist = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`${BASE}${qs ? '?' + qs : ''}`);
};

export const getWishlistById = (id) => apiFetch(`${BASE}/${id}`);

export const createWishlist = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateWishlist = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteWishlist = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export const reorderWishlist = (id, direction) =>
  apiFetch(`${BASE}/${id}/order?direction=${direction}`, { method: 'PATCH' });

export const convertToVisited = (id, data) =>
  apiFetch(`${BASE}/${id}/convert`, { method: 'POST', body: JSON.stringify(data) });

export const getRandomWishlist = () => apiFetch(`${BASE}/random`);
