import apiFetch from './client';

export async function getVapidPublicKey() {
  const data = await apiFetch('/push/vapid-public-key', { skipRedirect: true });
  return data.publicKey;
}

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
