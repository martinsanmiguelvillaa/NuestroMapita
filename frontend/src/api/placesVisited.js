import apiFetch from './client';

const BASE = '/places/visited';

export const getVisited = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`${BASE}?${qs}`);
};

export const getVisitedById = (id) => apiFetch(`${BASE}/${id}`);

export const createVisited = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateVisited = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteVisited = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
