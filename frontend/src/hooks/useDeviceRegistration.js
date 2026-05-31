/**
 * useDeviceRegistration
 *
 * Registra automáticamente este dispositivo en device_subscriptions al montar,
 * si el usuario ya otorgó permisos de notificación. De esta forma, cualquier
 * dispositivo que aceptó push en algún momento queda en la tabla unificada y
 * recibe todas las notificaciones globales (calendario, cartitas).
 *
 * Uso: llamar una sola vez en Layout.jsx (solo para sesiones autenticadas).
 */
import { useEffect, useRef } from 'react';
import { getVapidPublicKey, registerDevice, unregisterDevice, updateDeviceSettings, getDeviceStatus } from '../api/push';
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

export function useDeviceRegistration() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    attempted.current = true;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let pushSub = await reg.pushManager.getSubscription();

        if (!pushSub) {
          // El navegador tiene permiso pero no hay suscripción activa: crear una
          const publicKey = await getVapidPublicKey().catch(() => null);
          if (!publicKey) return;
          pushSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        const deviceId = getOrCreateDeviceId();
        await registerDevice({
          device_id: deviceId,
          user_key: 'ambos',
          subscription: pushSub,
          device_label: detectDeviceLabel(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
        });
      } catch {
        // Registro silencioso — no afecta la UX si falla
      }
    })();
  }, []);
}
