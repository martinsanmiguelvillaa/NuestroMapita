import apiFetch from './client';

export const globalSearch = (q) => apiFetch(`/search?q=${encodeURIComponent(q)}`);
