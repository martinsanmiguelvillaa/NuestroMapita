import StarRating from '../places/StarRating';
import '../../styles/recipes.css';

/**
 * Tarjeta compacta de receta para la grilla.
 */
export default function RecipeCard({ recipe, onView, onEdit, onDelete }) {
  const firstIngredients = recipe.ingredients
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);

  const lastComment = recipe.comments?.[recipe.comments.length - 1];

  return (
    <div className="recipe-card fade-in" onClick={onView} style={{ cursor: 'pointer' }}>
      {/* Imagen o placeholder */}
      {recipe.image_url ? (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="recipe-card__image"
        />
      ) : (
        <div className={`recipe-card__placeholder recipe-card__placeholder--${recipe.category}`}>
          <span>{recipe.category === 'dulce' ? '🍰' : '🍳'}</span>
        </div>
      )}

      <div className="recipe-card__body">
        {/* Badge de categoría */}
        <span className={`recipe-badge recipe-badge--${recipe.category}`}>
          {recipe.category === 'dulce' ? '🍰 Dulce' : '🧂 Salado'}
        </span>

        {/* Título */}
        <h3 className="recipe-card__title">{recipe.title}</h3>

        {/* Rating promedio */}
        {recipe.avg_rating && (
          <StarRating value={Math.round(recipe.avg_rating)} readOnly small />
        )}

        {/* Primeros ingredientes */}
        <ul className="recipe-card__ingredients">
          {firstIngredients.map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
          {recipe.ingredients.split('\n').filter(Boolean).length > 3 && (
            <li className="recipe-card__ingredients-more">
              +{recipe.ingredients.split('\n').filter(Boolean).length - 3} más
            </li>
          )}
        </ul>

        {/* Último comentario */}
        {lastComment && (
          <p className="recipe-card__comment">
            "{lastComment.text.length > 70
              ? lastComment.text.slice(0, 70) + '…'
              : lastComment.text}"
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="recipe-card__footer" onClick={(e) => e.stopPropagation()}>
        {recipe.video_url && (
          <a
            href={recipe.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            ▶ Video
          </a>
        )}
        <div className="recipe-card__actions">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            Editar
          </button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
