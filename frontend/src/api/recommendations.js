import apiFetch from './client';

export async function generateRecommendation({ type, moods, extra_text, include_watchlist }) {
  return apiFetch('/recommendations/generate', {
    method: 'POST',
    body: JSON.stringify({ type: type || null, moods, extra_text: extra_text || null, include_watchlist }),
  });
}

export async function getRecommendationHistory() {
  return apiFetch('/recommendations/history');
}

export async function getBlockedRecommendations() {
  return apiFetch('/recommendations/blocked');
}

export async function blockRecommendation(title) {
  return apiFetch('/recommendations/blocked', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function unblockRecommendation(id) {
  return apiFetch(`/recommendations/blocked/${id}`, { method: 'DELETE' });
}
