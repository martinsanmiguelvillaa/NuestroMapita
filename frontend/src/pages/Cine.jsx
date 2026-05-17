import { useState, useEffect, useCallback } from 'react';
import { getCineItems, deleteCineItem, updateCineItem } from '../api/cine';
import Modal from '../components/ui/Modal';
import CineCard from '../components/cine/CineCard';
import CineForm from '../components/cine/CineForm';
import CineDetail from '../components/cine/CineDetail';
import '../styles/cine.css';

const TYPE_TABS = [
  { value: 'all',      label: '✦ Todas' },
  { value: 'movie',    label: '🎬 Películas' },
  { value: 'series',   label: '📺 Series' },
  { value: 'favorite', label: '♥ Favoritas' },
];

const STATUS_TABS = [
  { value: 'all',      label: 'Todas' },
  { value: 'watched',  label: '✓ Ya vimos' },
  { value: 'to_watch', label: '⏳ Por ver' },
];

function buildParams(typeFilter, statusFilter, search) {
  const params = {};
  if (search) params.search = search;
  if (typeFilter === 'movie')    params.type = 'movie';
  if (typeFilter === 'series')   params.type = 'series';
  if (typeFilter === 'favorite') params.is_favorite = true;
  if (statusFilter === 'to_watch') params.status = 'to_watch';
  if (statusFilter === 'watched')  params.status = 'watched';
  return params;
}

export default function Cine() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [randomPick, setRandomPick] = useState(null);
  const [showRandom, setShowRandom] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCineItems(buildParams(typeFilter, statusFilter, search));
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.title}"?`)) return;
    setDeleting(item.id);
    try {
      await deleteCineItem(item.id);
      load();
    } catch (err) {
      alert('No se pudo eliminar: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleFavorite = async (item) => {
    try {
      await updateCineItem(item.id, { is_favorite: !item.is_favorite });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (item) => {
    const next = item.status === 'to_watch' ? 'watched' : 'to_watch';
    try {
      await updateCineItem(item.id, { status: next });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDetailClose = () => {
    setDetailId(null);
    load();
  };

  const openEdit = (item) => {
    setDetailId(null);
    setEditing(item);
  };

  const handleRandomPick = async () => {
    try {
      const pendientes = await getCineItems({ status: 'to_watch' });
      if (pendientes.length === 0) {
        setRandomPick(null);
      } else {
        const idx = Math.floor(Math.random() * pendientes.length);
        setRandomPick(pendientes[idx]);
      }
      setShowRandom(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cine-bg">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <h1 className="section-header__title">🎬 Nuestro Cine</h1>
          <div className="cine-header-actions">
            <button
              className="btn btn-outline cine-random-btn"
              onClick={handleRandomPick}
            >
              🎲 ¿Qué miramos hoy?
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Agregar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="cine-filters">
          <div className="cine-filters__row">
            <div className="cine-tabs">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  className={`cine-tab${typeFilter === tab.value ? ' cine-tab--active' : ''}`}
                  onClick={() => setTypeFilter(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              className="form-input cine-search"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="cine-tabs cine-tabs--status">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`cine-tab cine-tab--sm${statusFilter === tab.value ? ' cine-tab--active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="loading-state">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>No hay nada con ese filtro todavía.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Agregar la primera
            </button>
          </div>
        ) : (
          <div className="cine-grid">
            {items.map((item) => (
              <CineCard
                key={item.id}
                item={item}
                onView={() => setDetailId(item.id)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onToggleStatus={() => handleToggleStatus(item)}
                disabled={deleting === item.id}
              />
            ))}
          </div>
        )}

        {/* Modal: Agregar */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Agregar al cine"
          wide
        >
          <CineForm
            onSaved={handleFormSaved}
            onCancel={() => setShowForm(false)}
          />
        </Modal>

        {/* Modal: Editar */}
        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title="Editar"
          wide
        >
          {editing && (
            <CineForm
              initialData={editing}
              onSaved={handleFormSaved}
              onCancel={() => setEditing(null)}
            />
          )}
        </Modal>

        {/* Modal: Detalle */}
        {detailId && (
          <Modal isOpen onClose={handleDetailClose} title="" wide>
            <CineDetail
              itemId={detailId}
              onClose={handleDetailClose}
              onEdit={(item) => {
                setDetailId(null);
                setEditing(item);
              }}
              onDeleted={() => {
                setDetailId(null);
                load();
              }}
            />
          </Modal>
        )}

        {/* Modal: Elección aleatoria */}
        <Modal
          isOpen={showRandom}
          onClose={() => setShowRandom(false)}
          title="¿Qué miramos hoy? 🎲"
        >
          {randomPick ? (
            <div className="cine-random-result">
              {randomPick.poster_url && (
                <img
                  src={randomPick.poster_url}
                  alt={randomPick.title}
                  className="cine-random-result__poster"
                />
              )}
              <div className="cine-random-result__info">
                <h3>{randomPick.title}</h3>
                {randomPick.year && <p>{randomPick.year}</p>}
                {randomPick.genres?.length > 0 && (
                  <p>{randomPick.genres.join(' · ')}</p>
                )}
                {randomPick.platform && <p>📍 {randomPick.platform}</p>}
                {randomPick.synopsis && (
                  <p className="cine-random-result__synopsis">
                    {randomPick.synopsis.slice(0, 200)}
                    {randomPick.synopsis.length > 200 ? '…' : ''}
                  </p>
                )}
                {randomPick.trailer_url && (
                  <a
                    href={randomPick.trailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    ▶ Ver tráiler
                  </a>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRandomPick}
              >
                🎲 Otra opción
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <p>No tenemos nada pendiente por ver.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowRandom(false);
                  setShowForm(true);
                }}
              >
                Agregar algo
              </button>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
