import { useEffect, useState, useCallback } from 'react';
import { getVapidPublicKey } from '../api/push';
import {
  subscribeOutfitNotification,
  getOutfitNotificationStatus,
  updateOutfitNotificationSettings,
  unsubscribeOutfitNotification,
} from '../api/outfitNotifications';

const DEVICE_ID_KEY = 'outfit_notification_device_id';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
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

/**
 * Hook para manejar notificaciones de outfit por usuario y dispositivo.
 *
 * Estados posibles (status):
 *   'loading'      — consultando estado inicial
 *   'unsupported'  — el navegador no soporta Web Push
 *   'denied'       — permiso denegado por el usuario
 *   'inactive'     — soportado, permiso no denegado, pero no activado en este dispositivo
 *   'active'       — activado y enabled=true en este dispositivo
 */
export function useOutfitNotifications(userKey) {
  const [status, setStatus] = useState('loading');
  const [notifTime, setNotifTime] = useState('09:00');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const supported = 'serviceWorker' in navigator && 'PushManager' in window;

  const loadStatus = useCallback(async () => {
    if (!userKey) return;

    if (!supported) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    const deviceId = getOrCreateDeviceId();
    try {
      const data = await getOutfitNotificationStatus(userKey, deviceId);
      if (data.exists && data.enabled) {
        setNotifTime(data.notification_time || '09:00');
        setDeviceLabel(data.device_label || detectDeviceLabel());
        setStatus('active');
      } else {
        setStatus('inactive');
      }
    } catch {
      setStatus('inactive');
    }
  }, [userKey, supported]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const activate = async (time = '09:00') => {
    setSaving(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'denied') {
        setStatus('denied');
        return;
      }
      if (perm !== 'granted') {
        setStatus('inactive');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const publicKey = await getVapidPublicKey();
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const keys = pushSub.toJSON().keys;
      const deviceId = getOrCreateDeviceId();
      const label = detectDeviceLabel();

      await subscribeOutfitNotification({
        user_key: userKey,
        device_id: deviceId,
        subscription: {
          endpoint: pushSub.endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        },
        notification_time: time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
        device_label: label,
      });

      setNotifTime(time);
      setDeviceLabel(label);
      setStatus('active');
    } catch (err) {
      console.error('Error activando notificaciones de outfit:', err);
      setError('No se pudieron activar las notificaciones. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const updateTime = async (newTime) => {
    setSaving(true);
    setError(null);
    try {
      const deviceId = getOrCreateDeviceId();
      await updateOutfitNotificationSettings({
        user_key: userKey,
        device_id: deviceId,
        notification_time: newTime,
      });
      setNotifTime(newTime);
    } catch (err) {
      console.error('Error actualizando horario de notificación:', err);
      setError('No se pudo actualizar el horario. Intentá de nuevo.');
      throw err; // propagar para que el componente pueda cancelar la edición
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    setSaving(true);
    setError(null);
    try {
      const deviceId = getOrCreateDeviceId();
      await unsubscribeOutfitNotification({ user_key: userKey, device_id: deviceId });

      // Cancelar la suscripción push en el navegador SOLO si ningún otro usuario
      // del mismo dispositivo tiene notificaciones activas.
      // (Van y Martín pueden compartir el mismo navegador con endpoints distintos
      // o incluso el mismo endpoint; cancelarlo afectaría al otro usuario.)
      try {
        const otherUserKey = userKey === 'van' ? 'martin' : 'van';
        const otherDeviceId = getOrCreateDeviceId(); // mismo device_id para este navegador
        const otherStatus = await getOutfitNotificationStatus(otherUserKey, otherDeviceId).catch(() => null);
        const otherIsActive = otherStatus?.exists && otherStatus?.enabled;

        if (!otherIsActive) {
          const reg = await navigator.serviceWorker.ready;
          const pushSub = await reg.pushManager.getSubscription();
          if (pushSub) await pushSub.unsubscribe();
        }
      } catch {
        // Si falla la verificación, NO cancelamos el push del navegador para no
        // afectar al otro usuario por error.
      }

      setStatus('inactive');
    } finally {
      setSaving(false);
    }
  };

  return {
    status,       // 'loading' | 'unsupported' | 'denied' | 'inactive' | 'active'
    notifTime,
    deviceLabel,
    saving,
    error,
    activate,
    updateTime,
    deactivate,
  };
}
