import StarRating from '../places/StarRating';
import '../../styles/cine.css';

const TYPE_LABEL = { movie: '🎬 Película', series: '📺 Serie' };
const STATUS_LABEL = { to_watch: 'Por ver', watched: 'Ya vimos' };

export default function CineCard({ item, onView, onEdit, onDelete, onToggleFavorite, onToggleStatus }) {
  const lastComment = item.comments?.[item.comments.length - 1];

  return (
    <div className="cine-card fade-in">
      {/* Poster */}
      <div
        className="cine-card__poster-wrap"
        onClick={onView}
        style={{ cursor: 'pointer' }}
      >
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="cine-card__poster"
          />
        ) : (
          <div className={`cine-card__poster-placeholder cine-card__poster-placeholder--${item.type}`}>
            <span>{item.type === 'movie' ? '🎬' : '📺'}</span>
          </div>
        )}
        {item.is_favorite && <span className="cine-card__fav-badge">♥</span>}
        <div className="cine-card__status-overlay">
          <span className={`cine-status cine-status--${item.status}`}>
            {STATUS_LABEL[item.status]}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="cine-card__body" onClick={onView} style={{ cursor: 'pointer' }}>
        <span className={`cine-badge cine-badge--${item.type}`}>
          {TYPE_LABEL[item.type]}
        </span>

        <h3 className="cine-card__title">{item.title}</h3>

        {item.genres?.length > 0 && (
          <p className="cine-card__genres">{item.genres.slice(0, 2).join(' · ')}</p>
        )}

        {item.rating ? (
          <div className="cine-card__rating">
            <StarRating value={item.rating} readOnly small />
          </div>
        ) : null}

        {item.platform && (
          <p className="cine-card__platform">📍 {item.platform}</p>
        )}

        {lastComment && (
          <p className="cine-card__comment">
            "{lastComment.text.length > 60
              ? lastComment.text.slice(0, 60) + '…'
              : lastComment.text}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="cine-card__footer" onClick={(e) => e.stopPropagation()}>
        <div className="cine-card__quick-actions">
          <button
            className={`cine-card__fav-btn ${item.is_favorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            title={item.is_favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
          >
            {item.is_favorite ? '♥' : '♡'}
          </button>
          <button
            className="cine-card__status-btn"
            onClick={onToggleStatus}
            title={item.status === 'to_watch' ? 'Marcar como vista' : 'Volver a pendiente'}
          >
            {item.status === 'to_watch' ? '✓' : '↩'}
          </button>
        </div>
        <div className="cine-card__actions">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
