import apiFetch from './client';

const BASE = '/emocionario';

export const upsertEmotionalEntry = (data) =>
  apiFetch(`${BASE}/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getEmotionalEntries = (month) => {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiFetch(`${BASE}/${qs}`);
};

export const deleteEmotionalEntry = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
