import { useEffect, useState, useCallback } from 'react';
import { getVapidPublicKey } from '../api/push';
import {
  subscribeOutfitNotification,
  getOutfitNotificationStatus,
  updateOutfitNotificationSettings,
  unsubscribeOutfitNotification,
  testPushNotification,
} from '../api/outfitNotifications';
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
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null); // 'ok' | 'error'

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

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.userKey === userKey) loadStatus();
    };
    window.addEventListener('outfit-notif-changed', handler);
    return () => window.removeEventListener('outfit-notif-changed', handler);
  }, [userKey, loadStatus]);

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
    } catch {
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
      // El dispositivo permanece registrado para notificaciones globales (calendario, cartitas).
      // Solo se desactivan las notificaciones de outfit para este usuario.
      setStatus('inactive');
    } finally {
      setSaving(false);
    }
  };

  const testPush = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const deviceId = getOrCreateDeviceId();
      await testPushNotification(userKey, deviceId);
      setTestResult('ok');
    } catch {
      setTestResult('error');
      setError('El test falló. Revisá que las claves VAPID estén configuradas en el backend.');
    } finally {
      setTesting(false);
    }
  };

  return {
    status,       // 'loading' | 'unsupported' | 'denied' | 'inactive' | 'active'
    notifTime,
    deviceLabel,
    saving,
    testing,
    error,
    testResult,
    activate,
    updateTime,
    deactivate,
    testPush,
  };
}
