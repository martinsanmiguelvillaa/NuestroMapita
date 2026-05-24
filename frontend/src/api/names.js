import apiFetch from './client';

const BASE = '/names';

export const getNames = (gender) => {
  const qs = gender && gender !== 'all' ? `?gender=${gender}` : '';
  return apiFetch(`${BASE}${qs}`);
};

export const createName = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateName = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteName = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export const rateName = (id, person, rating) =>
  apiFetch(`${BASE}/${id}/rate`, {
    method: 'POST',
    body: JSON.stringify({ person, rating }),
  });
