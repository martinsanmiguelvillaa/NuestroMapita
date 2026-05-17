const API_BASE = import.meta.env.VITE_API_URL || '';

export async function getVapidPublicKey() {
  const res = await fetch(`${API_BASE}/push/vapid-public-key`, { credentials: 'include' });
  const data = await res.json();
  return data.publicKey;
}

export async function subscribePush(subscription) {
  const keys = subscription.toJSON().keys;
  await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }),
  });
}

export async function unsubscribePush(subscription) {
  const keys = subscription.toJSON().keys;
  await fetch(`${API_BASE}/push/unsubscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }),
  });
}
