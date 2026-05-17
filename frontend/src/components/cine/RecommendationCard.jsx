const TYPE_LABEL = { movie: '🎬 Película', series: '📺 Serie' };

export default function RecommendationCard({ rec, isMain, onAdd, onBlock, added, blocked }) {
  return (
    <div className={`rec-card ${isMain ? 'rec-card--main' : 'rec-card--similar'} ${blocked ? 'rec-card--blocked' : ''}`}>
      {/* Poster */}
      {rec.poster_url ? (
        <img
          src={rec.poster_url}
          alt={rec.title}
          className="rec-card__poster"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className={`rec-card__poster-placeholder rec-card__poster-placeholder--${rec.type}`}>
          <span>{rec.type === 'movie' ? '🎬' : '📺'}</span>
        </div>
      )}

      <div className="rec-card__body">
        <div className="rec-card__meta">
          <span className={`cine-badge cine-badge--${rec.type}`}>
            {TYPE_LABEL[rec.type] || rec.type}
          </span>
          {rec.year && <span className="rec-card__year">{rec.year}</span>}
        </div>

        <h4 className="rec-card__title">{rec.title}</h4>

        {rec.genres?.length > 0 && (
          <p className="rec-card__genres">{rec.genres.slice(0, 3).join(' · ')}</p>
        )}

        {rec.synopsis_short && (
          <p className="rec-card__synopsis">{rec.synopsis_short}</p>
        )}

        {rec.reason && (
          <p className="rec-card__reason">✨ {rec.reason}</p>
        )}

        <div className="rec-card__actions">
          <button
            className={`btn btn-primary btn-sm ${added ? 'rec-card__btn--added' : ''}`}
            onClick={() => !added && onAdd(rec)}
            disabled={added || blocked}
          >
            {added ? '✓ Agregada' : '+ Agregar a la lista'}
          </button>
          {!blocked && (
            <button
              className="btn btn-ghost btn-sm rec-card__block-btn"
              onClick={() => onBlock(rec)}
              title="No la banco, no volver a sugerir"
            >
              ✕ No banco
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
