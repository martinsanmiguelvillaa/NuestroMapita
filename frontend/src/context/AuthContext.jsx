/**
 * AuthContext: maneja la sesión de la app.
 *
 * - El JWT viaja como HttpOnly cookie (el JS nunca lo toca).
 * - Al cargar la app, verifica la sesión con GET /auth/me.
 * - logout() llama a POST /auth/logout para que el servidor borre la cookie.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { checkAuth, logout as logoutApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  const login = () => setIsAuthenticated(true);

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Si falla el endpoint, igual limpiamos el estado local
    }
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
