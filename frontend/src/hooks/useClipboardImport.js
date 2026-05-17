/**
 * Detecta si hay una URL en el portapapeles cuando la app vuelve al foco.
 * Útil en iOS donde Web Share Target no está disponible:
 * el usuario copia el link en Instagram, abre la app, y este hook lo detecta.
 *
 * Solo se activa si:
 * - La API de portapapeles está disponible
 * - La URL no fue ya procesada en esta sesión
 * - La URL contiene "http"
 */
import { useEffect, useState } from 'react';

const SESSION_KEY = 'mapita_last_clipboard_url';

export function useClipboardImport() {
  const [clipboardUrl, setClipboardUrl] = useState(null);

  useEffect(() => {
    if (!navigator.clipboard?.readText) return;

    const check = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text?.startsWith('http')) return;
        const already = sessionStorage.getItem(SESSION_KEY);
        if (already === text) return;
        setClipboardUrl(text);
      } catch {
        // El usuario no dio permiso — ignorar silenciosamente
      }
    };

    // Verificar al volver al foco (ej: después de copiar en Instagram)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const dismiss = () => {
    if (clipboardUrl) sessionStorage.setItem(SESSION_KEY, clipboardUrl);
    setClipboardUrl(null);
  };

  const accept = () => {
    if (clipboardUrl) sessionStorage.setItem(SESSION_KEY, clipboardUrl);
    const url = clipboardUrl;
    setClipboardUrl(null);
    return url;
  };

  return { clipboardUrl, dismiss, accept };
}
