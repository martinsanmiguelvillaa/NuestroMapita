import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/navbar.css';

const links = [
  { to: '/',           label: 'Inicio',      icon: '🏠' },
  { to: '/mapa',       label: 'Mapa',        icon: '🗺️' },
  { to: '/visitados',  label: 'Ya hicimos',  icon: '✓' },
  { to: '/por-visitar',label: 'Por hacer',   icon: '★' },
  { to: '/cartitas',   label: 'Cartitas',    icon: '💌' },
  { to: '/recetas',    label: 'Recetas',     icon: '🍴' },
];

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <nav className="navbar">
      {/* Marca / título (solo visible en desktop) */}
      <Link to="/" className="navbar__brand">
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

        {/* Cerrar sesión */}
        <li>
          <button className="navbar__logout" onClick={() => window.confirm('¿Salir?') && logout()} title="Cerrar sesión">
            <span className="navbar__link-icon">↩</span>
            <span>Salir</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
