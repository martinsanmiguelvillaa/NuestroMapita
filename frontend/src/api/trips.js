import apiFetch from './client';

const BASE = '/trips';

export const getTrips = (params = {}, signal) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`${BASE}${qs ? '?' + qs : ''}`, { signal });
};

export const getTripById = (id) => apiFetch(`${BASE}/${id}`);

export const createTrip = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateTrip = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteTrip = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export const reorderTripsBulk = (orderedIds) =>
  apiFetch(`${BASE}/reorder`, { method: 'PUT', body: JSON.stringify({ ordered_ids: orderedIds }) });

export const convertTripToVisited = (id, data) =>
  apiFetch(`${BASE}/${id}/convert`, { method: 'POST', body: JSON.stringify(data) });

export const getRandomTrip = (excludeId) =>
  apiFetch(`${BASE}/random${excludeId ? `?exclude_id=${excludeId}` : ''}`);
