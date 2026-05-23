import apiFetch from './client';

export const USERS = {
  van:    { key: 'van',    name: 'Van' },
  martin: { key: 'martin', name: 'Martín' },
};

export async function getUserOutfit(userKey) {
  return apiFetch(`/outfits/${userKey}/outfit`);
}

export async function getPreferences(userKey) {
  return apiFetch(`/outfits/${userKey}/preferences`);
}

export async function addPreference(userKey, text) {
  return apiFetch(`/outfits/${userKey}/preferences`, {
    method: 'POST',
    body: JSON.stringify({ preferences: text }),
  });
}

export async function deletePreference(userKey, prefId) {
  return apiFetch(`/outfits/${userKey}/preferences/${prefId}`, {
    method: 'DELETE',
  });
}
