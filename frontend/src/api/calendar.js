import apiFetch from './client';

const BASE = '/calendario';

// ─── Event Types ──────────────────────────────────────────────────────────────

export const getEventTypes = () => apiFetch(`${BASE}/types`);

export const createEventType = (data) =>
  apiFetch(`${BASE}/types`, { method: 'POST', body: JSON.stringify(data) });

export const updateEventType = (id, data) =>
  apiFetch(`${BASE}/types/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteEventType = (id) =>
  apiFetch(`${BASE}/types/${id}`, { method: 'DELETE' });

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const getEvents = (month) => {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiFetch(`${BASE}/events${qs}`);
};

export const createEvent = (data) =>
  apiFetch(`${BASE}/events`, { method: 'POST', body: JSON.stringify(data) });

export const updateEvent = (id, data) =>
  apiFetch(`${BASE}/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteEvent = (id, deleteSeries = false, instanceDate = null) => {
  const params = new URLSearchParams({ delete_series: deleteSeries });
  if (!deleteSeries && instanceDate) params.append('instance_date', instanceDate);
  return apiFetch(`${BASE}/events/${id}?${params}`, { method: 'DELETE' });
};
