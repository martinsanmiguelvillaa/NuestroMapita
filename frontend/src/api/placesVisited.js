import apiFetch from './client';

const BASE = '/places/visited';

export const getVisited = (params = {}, signal) => {
  // Filtrar valores undefined/null para no mandar "search=undefined" en la URL
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`${BASE}${qs ? '?' + qs : ''}`, { signal });
};

export const getVisitedById = (id) => apiFetch(`${BASE}/${id}`);

export const createVisited = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateVisited = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteVisited = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export const convertBackToWishlist = (id) =>
  apiFetch(`${BASE}/${id}/convert-back`, { method: 'POST' });

export const convertBackToTrip = (id) =>
  apiFetch(`${BASE}/${id}/convert-back-to-trip`, { method: 'POST' });
