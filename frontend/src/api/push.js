import apiFetch from './client';

export async function getVapidPublicKey() {
  const data = await apiFetch('/push/vapid-public-key', { skipRedirect: true });
  return data.publicKey;
}

/** Registra (o actualiza) un dispositivo en device_subscriptions. */
export async function registerDevice({ device_id, user_key = 'ambos', subscription, device_label, timezone }) {
  const keys = subscription.toJSON ? subscription.toJSON().keys : subscription.keys;
  await apiFetch('/push/register', {
    method: 'POST',
    body: JSON.stringify({
      device_id,
      user_key,
      subscription: {
        endpoint: subscription.endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
      },
      device_label,
      timezone,
    }),
  });
}

/** Elimina la suscripción de un dispositivo. */
export async function unregisterDevice({ device_id, user_key = 'ambos' }) {
  await apiFetch('/push/unregister', {
    method: 'DELETE',
    body: JSON.stringify({ device_id, user_key }),
  });
}

/** Devuelve el estado de la suscripción de un dispositivo. */
export async function getDeviceStatus(device_id, user_key = 'ambos') {
  return apiFetch(`/push/status?device_id=${encodeURIComponent(device_id)}&user_key=${user_key}`);
}

/** Actualiza configuración del dispositivo (enabled, outfit_notif_enabled, outfit_notif_time). */
export async function updateDeviceSettings({ device_id, user_key = 'ambos', ...fields }) {
  await apiFetch('/push/settings', {
    method: 'PATCH',
    body: JSON.stringify({ device_id, user_key, ...fields }),
  });
}

// ── Legacy (backward compat) ──────────────────────────────────────────────────

export async function subscribePush(subscription) {
  const keys = subscription.toJSON().keys;
  await apiFetch('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }),
  });
}

export async function unsubscribePush(subscription) {
  const keys = subscription.toJSON().keys;
  await apiFetch('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }),
  });
}
