import { useState, useEffect, useCallback } from 'react';
import { getRecipes, deleteRecipe } from '../api/recipes';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import RecipeCard from '../components/recipes/RecipeCard';
import RecipeForm from '../components/recipes/RecipeForm';
import RecipeDetail from '../components/recipes/RecipeDetail';
import { useDirtyForm } from '../hooks/useDirtyForm';
import '../styles/recipes.css';

const CATEGORY_TABS = [
  { value: '', label: 'Todas' },
  { value: 'salado', label: '🧂 Salado' },
  { value: 'dulce', label: '🍰 Dulce' },
];

const EMPTY_MESSAGES = {
  '': 'Todavía no agregamos recetas.',
  salado: 'Todavía no hay recetas saladas.',
  dulce: 'Todavía no hay recetas dulces.',
};

export default function Recipes() {
  const confirm = useConfirm();
  const toast = useToast();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);   // recipe obj
  const [detailId, setDetailId] = useState(null); // recipe id
  const [deleting, setDeleting] = useState(null); // recipe id en proceso
  const addForm = useDirtyForm();
  const editForm = useDirtyForm();

  const load = useCallback(async (signal) => {
    try {
      const data = await getRecipes({
        category: category || undefined,
        search: search || undefined,
      }, signal);
      setRecipes(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('No se pudieron cargar las recetas');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleDelete = async (recipe) => {
    const ok = await confirm({ title: `¿Eliminar "${recipe.title}"?`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    setDeleting(recipe.id);
    try {
      await deleteRecipe(recipe.id);
      load();
    } catch (err) {
      toast.error('No se pudo eliminar: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDetailClose = () => {
    setDetailId(null);
    load(); // Refrescar para que los avg_rating de las tarjetas se actualicen
  };

  const openEdit = (recipe) => {
    setDetailId(null);
    setEditing(recipe);
  };

  return (
    <div className="recipes-bg">
    <div className="container">
      {/* Cabecera */}
      <div className="section-header">
        <h1 className="section-header__title">Nuestras Recetas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nueva receta
        </button>
      </div>

      {/* Filtros */}
      <div className="recipe-filters">
        {/* Tabs de categoría */}
        <div className="recipe-tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`recipe-tab${category === tab.value ? ' recipe-tab--active' : ''}`}
              onClick={() => setCategory(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <input
          className="form-input recipe-search"
          placeholder="Buscar receta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="loading-state">Cargando recetas...</div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>{EMPTY_MESSAGES[category]}</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Agregar la primera
          </button>
        </div>
      ) : (
        <div className="letters-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onView={() => setDetailId(recipe.id)}
              onEdit={() => openEdit(recipe)}
              onDelete={() => handleDelete(recipe)}
              disabled={deleting === recipe.id}
            />
          ))}
        </div>
      )}

      {/* Modal: nueva receta */}
      <Modal
        isOpen={showForm}
        onClose={() => addForm.handleAttemptClose(() => setShowForm(false))}
        title="Nueva receta"
        wide
        fullscreen
        isDirty={addForm.isDirty}
      >
        <RecipeForm
          onClose={() => { addForm.setDirty(false); setShowForm(false); }}
          onSaved={() => load()}
          onCancel={() => addForm.handleAttemptClose(() => setShowForm(false))}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
        />
      </Modal>
      {addForm.dialog}

      {/* Modal: editar receta */}
      <Modal
        isOpen={!!editing}
        onClose={() => editForm.handleAttemptClose(() => setEditing(null))}
        title="Editar receta"
        wide
        fullscreen
        isDirty={editForm.isDirty}
      >
        <RecipeForm
          initialData={editing}
          onClose={() => { editForm.setDirty(false); setEditing(null); }}
          onSaved={() => load()}
          onCancel={() => editForm.handleAttemptClose(() => setEditing(null))}
          onDirtyChange={editForm.setDirty}
          submitRef={editForm.submitRef}
        />
      </Modal>
      {editForm.dialog}

      {/* Modal: detalle con comentarios */}
      {detailId && (
        <RecipeDetail
          recipeId={detailId}
          onClose={handleDetailClose}
          onEdit={() => {
            const recipe = recipes.find((r) => r.id === detailId);
            if (recipe) openEdit(recipe);
          }}
        />
      )}
    </div>
    </div>
  );
}
