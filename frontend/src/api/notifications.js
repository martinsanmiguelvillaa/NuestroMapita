/**
 * API de notificaciones in-app (campanita).
 */
import apiFetch from './client';

export function getNotifications({ unreadOnly = false, limit = 30, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (unreadOnly) params.set('unread_only', 'true');
  return apiFetch(`/notifications?${params}`);
}

export function getUnreadCount() {
  return apiFetch('/notifications/unread-count', { skipRedirect: true });
}

export function markRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllRead() {
  return apiFetch('/notifications/read-all', { method: 'POST' });
}

export function dismissNotification(id) {
  return apiFetch(`/notifications/${id}/dismiss`, { method: 'POST' });
}
