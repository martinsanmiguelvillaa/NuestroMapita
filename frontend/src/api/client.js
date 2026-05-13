/**
 * Cliente HTTP base para todas las llamadas al backend.
 *
 * - Agrega el token JWT automáticamente desde localStorage.
 * - Si el servidor devuelve 401 (sesión expirada), redirige al login.
 * - Lanza un Error con el mensaje del backend si la respuesta no es exitosa.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('mapita_token');

  const headers = { ...options.headers };

  // Agregar autenticación si tenemos token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Solo setear Content-Type JSON si no estamos subiendo archivos (FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    signal: options.signal,
  });

  // Sesión expirada o token inválido: ir al login
  if (response.status === 401) {
    localStorage.removeItem('mapita_token');
    window.location.href = '/login';
    return;
  }

  // Sin contenido (ej: DELETE exitoso)
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
