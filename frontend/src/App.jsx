/**
 * App.jsx - Punto de entrada de la aplicación React.
 *
 * Estructura:
 * - AuthProvider: provee el contexto de sesión a toda la app
 * - BrowserRouter: maneja las rutas
 * - ProtectedRoute: si no está autenticado, redirige a /login
 * - Layout: renderiza la navbar + la página actual (via <Outlet>)
 */
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import MapPage from './pages/Map';
import Visited from './pages/Visited';
import Wishlist from './pages/Wishlist';
import Letters from './pages/Letters';
import Recipes from './pages/Recipes';
import Cine from './pages/Cine';
import Outfits from './pages/Outfits';
import Trips from './pages/Trips';
import Names from './pages/Names';
import Emocionario from './pages/Emocionario';
import ShareTarget from './pages/ShareTarget';

// Ruta protegida: si no hay sesión, manda al login
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <Routes>
          {/* Página de login (sin navbar) */}
          <Route path="/login" element={<Login />} />

          {/* Share target: fuera del Layout para pantalla limpia */}
          <Route element={<ProtectedRoute />}>
            <Route path="/share-target" element={<ShareTarget />} />
          </Route>

          {/* Rutas protegidas: requieren estar autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/mapa" element={<MapPage />} />
              <Route path="/visitados" element={<Visited />} />
              <Route path="/por-visitar" element={<Wishlist />} />
              <Route path="/viajecitos" element={<Trips />} />
              <Route path="/cartitas" element={<Letters />} />
              <Route path="/recetas" element={<Recipes />} />
              <Route path="/cine" element={<Cine />} />
              <Route path="/outfits" element={<Outfits />} />
              <Route path="/nombres" element={<Names />} />
              <Route path="/emocionario" element={<Emocionario />} />
            </Route>
          </Route>

          {/* Cualquier ruta desconocida va al home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
    </ToastProvider>
  );
}
