import apiFetch from './client';

const BASE = '/recipes';

export const getRecipes = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  const qs = new URLSearchParams(clean).toString();
  return apiFetch(`${BASE}${qs ? '?' + qs : ''}`);
};

export const getRecipe = (id) => apiFetch(`${BASE}/${id}`);

export const createRecipe = (data) =>
  apiFetch(BASE, { method: 'POST', body: JSON.stringify(data) });

export const updateRecipe = (id, data) =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteRecipe = (id) =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export async function uploadRecipePhoto(recipeId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`${BASE}/${recipeId}/photo`, { method: 'POST', body: formData });
}

export const deleteRecipePhoto = (recipeId) =>
  apiFetch(`${BASE}/${recipeId}/photo`, { method: 'DELETE' });

export const addComment = (recipeId, data) =>
  apiFetch(`${BASE}/${recipeId}/comments`, { method: 'POST', body: JSON.stringify(data) });

export const deleteComment = (recipeId, commentId) =>
  apiFetch(`${BASE}/${recipeId}/comments/${commentId}`, { method: 'DELETE' });
