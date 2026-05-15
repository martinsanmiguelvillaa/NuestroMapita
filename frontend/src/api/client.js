/**
 * Cliente HTTP base para todas las llamadas al backend.
 *
 * - Usa credentials: 'include' para enviar la HttpOnly cookie en cada request.
 * - Si el servidor devuelve 401 (sesión expirada), redirige al login.
 * - Lanza un Error con el mensaje del backend si la respuesta no es exitosa.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    signal: options.signal,
  });

  if (response.status === 401) {
    window.location.href = '/login';
    return;
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
