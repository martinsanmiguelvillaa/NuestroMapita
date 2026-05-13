/**
 * AuthContext: maneja la sesión de la app.
 *
 * - El token JWT se guarda en localStorage ('mapita_token').
 * - Al recargar la página, se lee del localStorage automáticamente.
 * - logout() limpia el token y redirige al login.
 */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Inicializar desde localStorage (persiste entre recargas)
  const [token, setToken] = useState(() => localStorage.getItem('mapita_token'));

  const login = (newToken) => {
    localStorage.setItem('mapita_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('mapita_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto fácilmente en cualquier componente
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
