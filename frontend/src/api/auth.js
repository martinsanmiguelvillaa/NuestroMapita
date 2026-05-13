import apiFetch from './client';

export async function login(password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
