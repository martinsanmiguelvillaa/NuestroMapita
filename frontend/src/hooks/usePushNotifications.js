/**
 * usePushNotifications
 *
 * Hook para manejar la suscripción push "global" (cartitas, calendario).
 * Usa device_subscriptions con user_key="ambos".
 *
 * - subscribe(): pide permisos, crea suscripción en el navegador y registra el dispositivo
 * - unsubscribe(): deshabilita el dispositivo en la tabla (no cancela el PushManager)
 */
import { useEffect, useState } from 'react';
import { getVapidPublicKey, registerDevice, updateDeviceSettings, getDeviceStatus } from '../api/push';
import { getOrCreateDeviceId } from '../utils/deviceId';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function detectDeviceLabel() {
  const ua = navigator.userAgent;
  let browser = 'Navegador';
  let device = 'dispositivo';
  if (/Chrome/.test(ua) && !/Edg/.test(ua) && !/OPR/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edg/.test(ua)) browser = 'Edge';
  if (/iPhone|iPad/.test(ua)) device = 'iPhone/iPad';
  else if (/Android/.test(ua)) device = 'Android';
  else if (/Macintosh/.test(ua)) device = 'Mac';
  else if (/Windows/.test(ua)) device = 'Windows';
  return `${browser} en ${device}`;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const supported = 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (!supported) return;
    const deviceId = getOrCreateDeviceId();
    getDeviceStatus(deviceId, 'ambos')
      .then((data) => setSubscribed(data.exists && data.enabled))
      .catch(() => {});
  }, [supported]);

  const subscribe = async () => {
    if (!supported) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const publicKey = await getVapidPublicKey();
    const pushSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const deviceId = getOrCreateDeviceId();
    await registerDevice({
      device_id: deviceId,
      user_key: 'ambos',
      subscription: pushSub,
      device_label: detectDeviceLabel(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
    });
    setSubscribed(true);
  };

  const unsubscribe = async () => {
    const deviceId = getOrCreateDeviceId();
    await updateDeviceSettings({ device_id: deviceId, user_key: 'ambos', enabled: false }).catch(() => {});
    setSubscribed(false);
  };

  return { supported, permission, subscribed, subscribe, unsubscribe };
}
