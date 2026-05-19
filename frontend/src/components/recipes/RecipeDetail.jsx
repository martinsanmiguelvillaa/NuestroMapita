import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import StarRating from '../places/StarRating';
import { getRecipe, addComment, deleteComment } from '../../api/recipes';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/recipes.css';

/**
 * Modal de detalle completo de una receta, con comentarios.
 */
export default function RecipeDetail({ recipeId, onClose, onEdit }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRecipe = useCallback(async () => {
    try {
      const data = await getRecipe(recipeId);
      setRecipe(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  return (
    <Modal isOpen onClose={onClose} title={recipe?.title || '...'} wide fullscreen>
      {loading ? (
        <div className="loading-state">Cargando receta...</div>
      ) : recipe ? (
        <RecipeDetailContent recipe={recipe} onEdit={onEdit} onCommentChanged={fetchRecipe} />
      ) : (
        <div className="empty-state">No se pudo cargar la receta.</div>
      )}
    </Modal>
  );
}

function RecipeDetailContent({ recipe, onEdit, onCommentChanged }) {
  const ingredients = recipe.ingredients
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="recipe-detail">
      {/* Imagen */}
      {recipe.image_url && (
        <img src={recipe.image_url} alt={recipe.title} className="recipe-detail__image" />
      )}

      {/* Meta */}
      <div className="recipe-detail__meta">
        <span className={`recipe-badge recipe-badge--${recipe.category}`}>
          {recipe.category === 'dulce' ? '🍰 Dulce' : '🧂 Salado'}
        </span>
        {recipe.avg_rating && (
          <span className="recipe-detail__avg">
            <StarRating value={Math.round(recipe.avg_rating)} readOnly small />
            <span>{recipe.avg_rating} / 5</span>
          </span>
        )}
        {recipe.video_url && (
          <a
            href={recipe.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            ▶ Ver video
          </a>
        )}
      </div>

      {/* Ingredientes */}
      <section className="recipe-detail__section">
        <h4 className="recipe-detail__section-title">Ingredientes</h4>
        <ul className="recipe-detail__ingredients">
          {ingredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
        </ul>
      </section>

      {/* Preparación */}
      <section className="recipe-detail__section">
        <h4 className="recipe-detail__section-title">Preparación</h4>
        <p className="recipe-detail__steps">{recipe.steps}</p>
      </section>

      {/* Notas */}
      {recipe.notes && (
        <section className="recipe-detail__section">
          <h4 className="recipe-detail__section-title">Notas</h4>
          <p className="recipe-detail__notes">{recipe.notes}</p>
        </section>
      )}

      {/* Botón editar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button className="btn btn-outline btn-sm" onClick={onEdit}>
          Editar receta
        </button>
      </div>

      {/* Comentarios */}
      <RecipeComments recipe={recipe} onUpdated={onCommentChanged} />
    </div>
  );
}

function RecipeComments({ recipe, onUpdated }) {
  const confirm = useConfirm();
  const toast = useToast();
  const EMPTY = { author: '', text: '', rating: null };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.text.trim()) return setError('El comentario no puede estar vacío');
    setSaving(true);
    try {
      await addComment(recipe.id, {
        author: form.author.trim() || null,
        text: form.text.trim(),
        rating: form.rating,
      });
      setForm(EMPTY);
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId) => {
    const ok = await confirm({ title: '¿Eliminar este comentario?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await deleteComment(recipe.id, commentId);
      onUpdated?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className="recipe-comments">
      <h4 className="recipe-comments__title">💬 Comentarios</h4>

      {/* Lista de comentarios */}
      {recipe.comments.length === 0 ? (
        <p className="recipe-comments__empty">Todavía no hay comentarios.</p>
      ) : (
        <div className="recipe-comments__list">
          {recipe.comments.map((c) => (
            <div key={c.id} className="recipe-comment">
              <div className="recipe-comment__top">
                {c.rating && <StarRating value={c.rating} readOnly small />}
                {c.author && <span className="recipe-comment__author">— {c.author}</span>}
                <button
                  className="btn btn-ghost btn-sm recipe-comment__delete"
                  onClick={() => handleDelete(c.id)}
                  title="Eliminar comentario"
                >
                  ×
                </button>
              </div>
              <p className="recipe-comment__text">"{c.text}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario nuevo comentario */}
      <form className="recipe-comment-form" onSubmit={handleSubmit}>
        <h5 className="recipe-comment-form__title">Dejar un comentario</h5>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="recipe-comment-form__row">
          <div className="form-group">
            <label className="form-label">Puntaje</label>
            <div className="recipe-comment-form__stars">
              <StarRating
                value={form.rating}
                onChange={(v) => setField('rating', v === form.rating ? null : v)}
              />
              {form.rating && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setField('rating', null)}
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Comentario *</label>
          <textarea
            className="form-textarea"
            value={form.text}
            onChange={(e) => setField('text', e.target.value)}
            placeholder="Me encantó, la volvería a comer..."
            rows={3}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Dejar comentario'}
        </button>
      </form>
    </section>
  );
}
