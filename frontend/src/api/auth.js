import apiFetch from './client';

export async function login(password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

export async function checkAuth() {
  return apiFetch('/auth/me', { skipRedirect: true });
}
