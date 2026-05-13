/**
 * Layout: envuelve todas las páginas protegidas.
 * Renderiza la navbar y el contenido de la página actual (<Outlet>).
 */
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}
