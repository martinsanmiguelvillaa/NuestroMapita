import apiFetch from './client';

const BASE = '/outfits/notifications';

export const subscribeOutfitNotification = (data) =>
  apiFetch(`${BASE}/subscribe`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getOutfitNotificationStatus = (userKey, deviceId) =>
  apiFetch(`${BASE}/status?user_key=${userKey}&device_id=${encodeURIComponent(deviceId)}`);

export const updateOutfitNotificationSettings = (data) =>
  apiFetch(`${BASE}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const unsubscribeOutfitNotification = (data) =>
  apiFetch(`${BASE}/unsubscribe`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });

export const testPushNotification = (userKey, deviceId) =>
  apiFetch(`${BASE}/test-push?user_key=${userKey}&device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
  });
