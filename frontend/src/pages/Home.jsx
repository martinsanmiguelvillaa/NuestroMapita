/**
 * Home - Página principal
 *
 * Muestra:
 * - Hero romántico con título
 * - Contador de lugares y cartitas
 * - Accesos rápidos a secciones
 * - Álbum de fotos recientes (polaroids)
 * - Acceso destacado a cartitas
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVisited } from '../api/placesVisited';
import { getWishlist } from '../api/placesWishlist';
import { getLetters } from '../api/letters';
import '../styles/home.css';

export default function Home() {
  const [stats, setStats] = useState({ visited: 0, wishlist: 0, letters: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [visited, wishlist, letters] = await Promise.all([
          getVisited({ sort: 'newest' }),
          getWishlist(),
          getLetters(),
        ]);

        setStats({
          visited: visited.length,
          wishlist: wishlist.length,
          letters: letters.length,
        });

        // Juntar todas las fotos de todos los lugares visitados, tomar las últimas 8
        const photos = visited
          .flatMap((p) => p.photos.map((ph) => ({ ...ph, placeName: p.name })))
          .slice(0, 8);
        setRecentPhotos(photos);
      } catch (err) {
        console.error('Error cargando home:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const navCards = [
    { to: '/visitados',   icon: '✓', name: 'Visitados',   desc: `${stats.visited} lugar${stats.visited !== 1 ? 'es' : ''}` },
    { to: '/por-visitar', icon: '★', name: 'Por visitar', desc: `${stats.wishlist} pendiente${stats.wishlist !== 1 ? 's' : ''}` },
    { to: '/mapa',        icon: '🗺️', name: 'Mapa',       desc: 'Ver todos en el mapa' },
    { to: '/cartitas',    icon: '💌', name: 'Cartitas',    desc: `${stats.letters} guardada${stats.letters !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="home fade-in">
      {/* Hero */}
      <section className="home__hero">
        <p className="home__hero-subtitle">solo para nosotros</p>
        <h1 className="home__hero-title">
          <em>Nuestro</em> Mapita
        </h1>
        <p className="home__hero-desc">
          Todos nuestros recuerdos, planes y cartitas en un solo lugar.
        </p>
      </section>

      {/* Stats */}
      {!loading && (
        <div className="home__stats">
          <div className="home__stat">
            <div className="home__stat-number">{stats.visited}</div>
            <div className="home__stat-label">visitados</div>
          </div>
          <div className="home__stat">
            <div className="home__stat-number">{stats.wishlist}</div>
            <div className="home__stat-label">por visitar</div>
          </div>
          <div className="home__stat">
            <div className="home__stat-number">{stats.letters}</div>
            <div className="home__stat-label">cartitas</div>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <section className="home__sections">
        <h2 className="home__section-title">Nuestro espacio</h2>
        <div className="home__nav-cards">
          {navCards.map(({ to, icon, name, desc }) => (
            <Link key={to} to={to} className="home__nav-card">
              <span className="home__nav-card-icon">{icon}</span>
              <span className="home__nav-card-name">{name}</span>
              <span className="home__nav-card-desc">{desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Cartitas destacadas */}
      <section className="home__recent" style={{ paddingBottom: '0' }}>
        <h2 className="home__section-title">Cartitas</h2>
        <Link to="/cartitas" className="home__letters-btn">
          💌 Ver nuestras cartitas
          {stats.letters > 0 && (
            <span className="home__letters-count">{stats.letters}</span>
          )}
        </Link>
      </section>

      {/* Álbum de fotos recientes */}
      {recentPhotos.length > 0 && (
        <section className="home__recent">
          <h2 className="home__section-title" style={{ marginTop: '40px' }}>Recuerdos recientes</h2>
          <div className="home__polaroids">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="polaroid">
                <img
                  src={photo.cloudinary_url}
                  alt={photo.placeName}
                  className="polaroid__img"
                  loading="lazy"
                />
                <p className="polaroid__caption">{photo.placeName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && recentPhotos.length === 0 && (
        <section className="home__recent">
          <h2 className="home__section-title" style={{ marginTop: '40px' }}>Recuerdos</h2>
          <div className="empty-state">
            <p>Todavía no hay fotos.</p>
            <Link to="/visitados" className="btn btn-rose">
              Agregar el primer lugar
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
