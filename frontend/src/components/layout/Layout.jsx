/**
 * Layout: envuelve todas las páginas protegidas.
 * Renderiza la navbar y el contenido de la página actual (<Outlet>).
 */
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ClipboardImportBanner from '../ui/ClipboardImportBanner';

export default function Layout() {
  return (
    <>
      <Navbar />
      <ClipboardImportBanner />
      <main>
        <Outlet />
      </main>
    </>
  );
}
