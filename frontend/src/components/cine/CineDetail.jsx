import { useState, useEffect, useCallback } from 'react';
import StarRating from '../places/StarRating';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import {
  getCineItem,
  updateCineItem,
  deleteCineItem,
  addCineComment,
  deleteCineComment,
} from '../../api/cine';

const TYPE_LABEL = { movie: '🎬 Película', series: '📺 Serie' };
const STATUS_LABEL = { to_watch: 'Por ver', watched: 'Ya vimos' };

export default function CineDetail({ itemId, onClose, onEdit, onDeleted }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [deletingComment, setDeletingComment] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getCineItem(itemId);
      setItem(data);
    } catch (err) {
      toast.error('No se pudo cargar la película');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleFavorite = async () => {
    setSaving(true);
    try {
      await updateCineItem(itemId, { is_favorite: !item.is_favorite });
      await load();
    } catch (err) {
      toast.error('No se pudo actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const next = item.status === 'to_watch' ? 'watched' : 'to_watch';
    setSaving(true);
    try {
      await updateCineItem(itemId, { status: next });
      await load();
    } catch (err) {
      toast.error('No se pudo actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRating = async (val) => {
    try {
      await updateCineItem(itemId, { rating: val });
      await load();
    } catch (err) {
      toast.error('No se pudo guardar el puntaje: ' + err.message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: `¿Eliminar "${item.title}"?`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await deleteCineItem(itemId);
      onDeleted();
    } catch (err) {
      toast.error('No se pudo eliminar: ' + err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSavingComment(true);
    try {
      await addCineComment(itemId, {
        text: commentText.trim(),
        author: commentAuthor.trim() || null,
      });
      setCommentText('');
      setCommentAuthor('');
      await load();
    } catch (err) {
      toast.error('No se pudo guardar el comentario: ' + err.message);
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingComment(commentId);
    try {
      await deleteCineComment(itemId, commentId);
      await load();
    } catch (err) {
      toast.error('No se pudo eliminar: ' + err.message);
    } finally {
      setDeletingComment(null);
    }
  };

  if (loading) {
    return <div className="cine-detail"><p className="loading-state">Cargando...</p></div>;
  }

  if (!item) {
    return <div className="cine-detail"><p>No se encontró este ítem.</p></div>;
  }

  return (
    <div className="cine-detail">
      {/* Hero */}
      <div className="cine-detail__hero">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="cine-detail__poster"
          />
        ) : (
          <div className={`cine-detail__poster-placeholder cine-detail__poster-placeholder--${item.type}`}>
            <span>{item.type === 'movie' ? '🎬' : '📺'}</span>
          </div>
        )}

        <div className="cine-detail__info">
          <div className="cine-detail__badges">
            <span className={`cine-badge cine-badge--${item.type}`}>
              {TYPE_LABEL[item.type]}
            </span>
            <span className={`cine-status cine-status--${item.status}`}>
              {STATUS_LABEL[item.status]}
            </span>
            {item.is_favorite && (
              <span className="cine-detail__fav-indicator">♥ Favorita</span>
            )}
          </div>

          <h2 className="cine-detail__title">{item.title}</h2>

          {item.year && <p className="cine-detail__year">{item.year}</p>}

          {item.genres?.length > 0 && (
            <p className="cine-detail__genres">{item.genres.join(' · ')}</p>
          )}

          {item.platform && (
            <p className="cine-detail__platform">📍 {item.platform}</p>
          )}

          <div className="cine-detail__rating">
            <StarRating value={item.rating} onChange={handleRating} />
            {item.rating && (
              <span className="cine-detail__rating-label">{item.rating}/5</span>
            )}
          </div>

          <div className="cine-detail__quick-actions">
            <button
              className={`btn btn-outline btn-sm ${item.is_favorite ? 'active-fav' : ''}`}
              onClick={handleToggleFavorite}
              disabled={saving}
            >
              {item.is_favorite ? '♥ Favorita' : '♡ Favorita'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleToggleStatus}
              disabled={saving}
            >
              {item.status === 'to_watch' ? '✓ Marcar como vista' : '↩ Pendiente'}
            </button>
          </div>

          {item.trailer_url && (
            <a
              href={item.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm cine-detail__trailer-btn"
            >
              ▶ Ver tráiler
            </a>
          )}
        </div>
      </div>

      {/* Sinopsis */}
      {item.synopsis && (
        <div className="cine-detail__section">
          <h4 className="cine-detail__section-title">Sinopsis</h4>
          <p className="cine-detail__synopsis">{item.synopsis}</p>
        </div>
      )}

      {/* Comentarios */}
      <div className="cine-comments">
        <h4 className="cine-comments__title">Comentarios</h4>

        {item.comments.length === 0 ? (
          <p className="cine-comments__empty">
            Todavía no escribimos nada sobre esta.
          </p>
        ) : (
          <div className="cine-comments__list">
            {item.comments.map((c) => (
              <div key={c.id} className="cine-comment">
                <div className="cine-comment__top">
                  <span className="cine-comment__author">
                    {c.author || 'Nosotros'}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm cine-comment__delete"
                    onClick={() => handleDeleteComment(c.id)}
                    disabled={deletingComment === c.id}
                    title="Eliminar comentario"
                  >
                    ×
                  </button>
                </div>
                <p className="cine-comment__text">"{c.text}"</p>
              </div>
            ))}
          </div>
        )}

        <form className="cine-comment-form" onSubmit={handleAddComment}>
          <p className="cine-comment-form__title">Agregar comentario</p>
          <div className="cine-comment-form__authors">
            {['Martín', 'Van', 'Ambos'].map((name) => (
              <button
                key={name}
                type="button"
                className={`cine-comment-form__author-btn ${commentAuthor === name ? 'active' : ''}`}
                onClick={() => setCommentAuthor(commentAuthor === name ? '' : name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="cine-comment-form__row">
            <textarea
              className="form-textarea"
              placeholder="¿Qué les pareció?"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              style={{ flex: 1 }}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={savingComment}
            >
              {savingComment ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>

      {/* Acciones */}
      <div className="cine-detail__footer">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)}>
          Editar
        </button>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
