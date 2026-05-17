import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import '../../styles/navbar.css';

const links = [
  { to: '/',           label: 'Inicio',      icon: '🏠' },
  { to: '/mapa',       label: 'Mapa',        icon: '🗺️' },
  { to: '/visitados',  label: 'Ya hicimos',  icon: '✓' },
  { to: '/por-visitar',label: 'Por hacer',   icon: '★' },
  { to: '/cartitas',   label: 'Cartitas',    icon: '💌' },
  { to: '/recetas',    label: 'Recetas',     icon: '🍴' },
  { to: '/cine',       label: 'Cine',        icon: '🎬' },
];

export default function Navbar() {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications();

  return (
    <>
      <nav className="navbar">
        {/* Marca / título (solo visible en desktop) */}
        <Link to="/" className="navbar__brand">
          <img src="/icons/icono-app.png" alt="" className="navbar__brand-icon" />
          Nuestro Mapita
        </Link>

        {/* Links de navegación */}
        <ul className="navbar__links">
          {links.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
              >
                <span className="navbar__link-icon">{icon}</span>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}

          {/* Config */}
          <li className="navbar__config-wrap">
            <button
              className="navbar__logout"
              onClick={() => setConfigOpen((v) => !v)}
              title="Configuración"
            >
              <span className="navbar__link-icon">⚙️</span>
              <span>Config</span>
            </button>
            {configOpen && (
              <>
                <div className="navbar__config-backdrop" onClick={() => setConfigOpen(false)} />
                <div className="navbar__config-menu">
                {supported && permission !== 'denied' && (
                  <button
                    className="navbar__config-item"
                    onClick={subscribed ? unsubscribe : subscribe}
                  >
                    <span>{subscribed ? '🔔' : '🔕'}</span>
                    <span>{subscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'}</span>
                  </button>
                )}
                <button
                  className="navbar__config-item navbar__config-item--danger"
                  onClick={() => setConfirming(true)}
                >
                  <span>↩</span>
                  <span>Cerrar sesión</span>
                </button>
              </div>
              </>
            )}
          </li>
        </ul>
      </nav>

      {confirming && (
        <div className="logout-overlay" onClick={() => setConfirming(false)}>
          <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="logout-dialog__text">¿Salir de la app?</p>
            <div className="logout-dialog__actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button className="btn btn-rose btn-sm" onClick={logout}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
