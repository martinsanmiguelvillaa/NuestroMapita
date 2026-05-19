import apiFetch from './client';

const BASE = '/letters';

export const getLetters = (signal) => apiFetch(BASE, { signal });

export const createLetter = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateLetter = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteLetter = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export async function uploadLetterPhoto(letterId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`${BASE}/${letterId}/photo`, {
    method: 'POST',
    body: formData,
  });
}

export const deleteLetterPhoto = (letterId) =>
  apiFetch(`${BASE}/${letterId}/photo`, { method: 'DELETE' });
