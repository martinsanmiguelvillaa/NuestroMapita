const API = 'https://clima-en-outfits.up.railway.app';

export const USERS = {
  van: {
    key: 'van',
    name: 'Van',
    last_name: 'Mapita',
    mail: 'van@nuestromapita.app',
    password: 'VanMapita2024!',
    gender: 'femenino',
    phone_number: '1100000001',
    city: 'Buenos Aires',
  },
  martin: {
    key: 'martin',
    name: 'Martín',
    last_name: 'Mapita',
    mail: 'martin@nuestromapita.app',
    password: 'MartinMapita2024!',
    gender: 'masculino',
    phone_number: '1100000002',
    city: 'Buenos Aires',
  },
};

async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail || `Error ${response.status}`;
    throw new Error(Array.isArray(message) ? message[0]?.msg || 'Error' : message);
  }
  return data;
}

async function registerUser(userKey) {
  const u = USERS[userKey];
  try {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: u.name,
        last_name: u.last_name,
        gender: u.gender,
        mail: u.mail,
        phone_number: u.phone_number,
        password: u.password,
        preferred_channel: 'mail',
        city: u.city,
      }),
    });
  } catch (err) {
    if (!err.message.includes('ya existe')) throw err;
  }
}

async function loginUser(userKey) {
  const u = USERS[userKey];
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ mail: u.mail, password: u.password }),
  });
  return { token: data.access_token, userId: data.user.id };
}

// Devuelve { token, userId } — crea la cuenta si no existe, renueva token si expiró
export async function ensureSession(userKey) {
  const key = `outfits_session_${userKey}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    const session = JSON.parse(stored);
    const sixDays = 6 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.createdAt < sixDays) return session;
  }
  await registerUser(userKey);
  const session = { ...(await loginUser(userKey)), createdAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(session));
  return session;
}

export function clearSession(userKey) {
  localStorage.removeItem(`outfits_session_${userKey}`);
}

export async function getUserOutfit(userId, token) {
  const data = await apiFetch(`/users/${userId}/outfit`, {}, token);
  return { outfit: data.outfit, weather: data.weather };
}

export async function getPreferences(userId, token) {
  const data = await apiFetch(`/preferences/${userId}/preferences`, {}, token);
  return data.preferences;
}

export async function addPreference(userId, token, text) {
  return apiFetch(`/preferences/${userId}/outfit_preferences`, {
    method: 'POST',
    body: JSON.stringify({ preferences: text }),
  }, token);
}

export async function deletePreference(userId, token, prefId) {
  return apiFetch(`/preferences/${userId}/preference/${prefId}`, {
    method: 'DELETE',
  }, token);
}
