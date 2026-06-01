import { useState, useEffect, useCallback } from 'react';
import { getCineItems, deleteCineItem, updateCineItem } from '../api/cine';
import { toast } from 'sonner';
import { scheduleDeletion, cancelDeletion } from '../utils/pendingDeletions';
import Modal from '../components/ui/Modal';
import CineCard from '../components/cine/CineCard';
import CineForm from '../components/cine/CineForm';
import CineDetail from '../components/cine/CineDetail';
import CineRecommendationPanel from '../components/cine/CineRecommendationPanel';
import { useDirtyForm } from '../hooks/useDirtyForm';
import '../styles/cine.css';

const TYPE_TABS = [
  { value: 'all',      label: '✦ Todas' },
  { value: 'movie',    label: '🎬 Películas' },
  { value: 'series',   label: '📺 Series' },
  { value: 'favorite', label: '♥ Favoritas' },
];

const STATUS_TABS = [
  { value: 'all',      label: 'Todas' },
  { value: 'watching', label: '▶ Viendo' },
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
  if (statusFilter === 'watching') params.status = 'watching';
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
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [randomPick, setRandomPick] = useState(null);
  const [showRandom, setShowRandom] = useState(false);
  const addForm = useDirtyForm();
  const editForm = useDirtyForm();

  const load = useCallback(async (signal) => {
    try {
      const data = await getCineItems(buildParams(typeFilter, statusFilter, search), signal);
      setItems(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('No se pudo cargar el cine');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleDelete = (item) => {
    setHiddenIds(prev => new Set([...prev, item.id]));
    const key = `cine-${item.id}`;
    scheduleDeletion(key, async () => {
      await deleteCineItem(item.id);
      setHiddenIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
      load();
    });
    toast.success('Eliminado del cine', {
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: () => {
          if (cancelDeletion(key)) {
            setHiddenIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
          }
        },
      },
    });
  };

  const handleToggleFavorite = async (item) => {
    try {
      await updateCineItem(item.id, { is_favorite: !item.is_favorite });
      load();
    } catch (err) {
      toast.error('No se pudo actualizar: ' + err.message);
    }
  };

  const handleToggleStatus = async (item, nextStatus) => {
    try {
      await updateCineItem(item.id, { status: nextStatus });
      load();
    } catch (err) {
      toast.error('No se pudo actualizar: ' + err.message);
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
      toast.error('No se pudo elegir: ' + err.message);
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

        {/* Recomendación inteligente */}
        <CineRecommendationPanel onItemAdded={load} />

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
            {items.filter(i => !hiddenIds.has(i.id)).map((item) => (
              <CineCard
                key={item.id}
                item={item}
                onView={() => setDetailId(item.id)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onToggleStatus={(nextStatus) => handleToggleStatus(item, nextStatus)}
              />
            ))}
          </div>
        )}

        {/* Modal: Agregar */}
        <Modal
          isOpen={showForm}
          onClose={() => addForm.handleAttemptClose(() => setShowForm(false))}
          title="Agregar al cine"
          wide
          fullscreen
          isDirty={addForm.isDirty}
        >
          <CineForm
            onClose={() => { addForm.setDirty(false); setShowForm(false); }}
            onSaved={() => load()}
            onCancel={() => addForm.handleAttemptClose(() => setShowForm(false))}
            onDirtyChange={addForm.setDirty}
            submitRef={addForm.submitRef}
          />
        </Modal>
        {addForm.dialog}

        {/* Modal: Editar */}
        <Modal
          isOpen={!!editing}
          onClose={() => editForm.handleAttemptClose(() => setEditing(null))}
          title="Editar"
          wide
          fullscreen
          isDirty={editForm.isDirty}
        >
          {editing && (
            <CineForm
              initialData={editing}
              onClose={() => { editForm.setDirty(false); setEditing(null); }}
              onSaved={() => load()}
              onCancel={() => editForm.handleAttemptClose(() => setEditing(null))}
              onDirtyChange={editForm.setDirty}
              submitRef={editForm.submitRef}
            />
          )}
        </Modal>
        {editForm.dialog}

        {/* Modal: Detalle */}
        {detailId && (
          <Modal isOpen onClose={handleDetailClose} title="" wide fullscreen>
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
