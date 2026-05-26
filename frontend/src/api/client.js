/**
 * Cliente HTTP base para todas las llamadas al backend.
 *
 * - Usa credentials: 'include' para enviar la HttpOnly cookie en cada request.
 * - Si el servidor devuelve 401 (sesión expirada), redirige al login.
 * - Lanza un Error con el mensaje del backend si la respuesta no es exitosa.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'mapita_token';

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    headers['Authorization'] = `Bearer ${stored}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    signal: options.signal,
  });

  if (response.status === 401) {
    // Redirigir solo si no es la verificación inicial de sesión
    if (!options.skipRedirect) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail || `Error ${response.status}`;
    throw new Error(Array.isArray(message) ? message[0]?.msg || 'Error de validación' : message);
  }

  return data;
}

export default apiFetch;
