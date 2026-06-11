/**
 * App.jsx - Punto de entrada de la aplicación React.
 *
 * Estructura:
 * - AuthProvider: provee el contexto de sesión a toda la app
 * - BrowserRouter: maneja las rutas
 * - ProtectedRoute: si no está autenticado, redirige a /login
 * - Layout: renderiza la navbar + la página actual (via <Outlet>)
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Home from './pages/Home';

/**
 * Lazy loading con auto-recuperación: si un chunk falla al cargar
 * (típicamente porque hubo un deploy y los archivos viejos ya no existen),
 * recarga la página una única vez para tomar la versión nueva.
 */
function lazyPage(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      const key = 'chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      return { default: () => null };
    })
  );
}

const MapPage     = lazyPage(() => import('./pages/Map'));
const Visited     = lazyPage(() => import('./pages/Visited'));
const Wishlist    = lazyPage(() => import('./pages/Wishlist'));
const Letters     = lazyPage(() => import('./pages/Letters'));
const Recipes     = lazyPage(() => import('./pages/Recipes'));
const Cine        = lazyPage(() => import('./pages/Cine'));
const Outfits     = lazyPage(() => import('./pages/Outfits'));
const Trips       = lazyPage(() => import('./pages/Trips'));
const Names       = lazyPage(() => import('./pages/Names'));
const Calendario  = lazyPage(() => import('./pages/Calendario'));
const ShareTarget = lazyPage(() => import('./pages/ShareTarget'));

// Ruta protegida: si no hay sesión, manda al login
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
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
              <Route path="/calendario" element={<Calendario />} />
            </Route>
          </Route>

          {/* Cualquier ruta desconocida va al home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <Toaster
          position={window.matchMedia('(max-width: 768px)').matches ? 'top-center' : 'bottom-right'}
          richColors
          closeButton
        />
      </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}
