import { useState, useRef, useEffect } from 'react';
import StarRating from '../places/StarRating';
import { searchTmdb, getTmdbDetail, createCineItem, updateCineItem } from '../../api/cine';

const EMPTY_FORM = {
  title: '',
  type: 'movie',
  status: 'to_watch',
  poster_url: '',
  synopsis: '',
  genres: '',        // string separada por comas en el form
  platform: '',
  trailer_url: '',
  year: '',
  rating: null,
  is_favorite: false,
  external_source: null,
  external_id: null,
};

function itemToForm(item) {
  return {
    title: item.title || '',
    type: item.type || 'movie',
    status: item.status || 'to_watch',
    poster_url: item.poster_url || '',
    synopsis: item.synopsis || '',
    genres: (item.genres || []).join(', '),
    platform: item.platform || '',
    trailer_url: item.trailer_url || '',
    year: item.year || '',
    rating: item.rating ?? null,
    is_favorite: item.is_favorite || false,
    external_source: item.external_source || null,
    external_id: item.external_id ? String(item.external_id) : null,
  };
}

export default function CineForm({ initialData, onSaved, onCancel, onDirtyChange, submitRef }) {
  const isEdit = !!initialData;
  const formRef = useRef();

  useEffect(() => {
    if (submitRef) submitRef.current = () => formRef.current?.requestSubmit();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState(null); // null = todavía no buscó
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showManual, setShowManual] = useState(isEdit);
  const [form, setForm] = useState(isEdit ? itemToForm(initialData) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setTmdbResults(null);
    try {
      const results = await searchTmdb(searchQuery.trim());
      setTmdbResults(results);
      if (results.length === 0) {
        setSearchError('No encontramos ese título. Podés cargarlo manualmente.');
      }
    } catch (err) {
      setSearchError(err.message || 'Error al buscar. Podés cargar los datos manualmente.');
      setTmdbResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (result) => {
    setIsLoadingDetail(true);
    try {
      const detail = await getTmdbDetail(result.type, result.tmdb_id);
      setForm({
        ...EMPTY_FORM,
        title: detail.title || result.title || '',
        type: detail.type || result.type,
        status: 'to_watch',
        poster_url: detail.poster_url || result.poster_url || '',
        synopsis: detail.synopsis || result.overview || '',
        genres: (detail.genres || []).join(', '),
        trailer_url: detail.trailer_url || '',
        year: detail.year || result.year || '',
        external_source: 'tmdb',
        external_id: String(result.tmdb_id),
      });
    } catch {
      // Si falla el detalle, usar la info básica del search
      setForm({
        ...EMPTY_FORM,
        title: result.title || '',
        type: result.type,
        poster_url: result.poster_url || '',
        synopsis: result.overview || '',
        year: result.year || '',
        external_source: 'tmdb',
        external_id: String(result.tmdb_id),
      });
    } finally {
      setIsLoadingDetail(false);
      setShowManual(true);
      onDirtyChange?.(true);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    onDirtyChange?.(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('El título es obligatorio'); return; }

    setSaving(true);
    const payload = {
      ...form,
      genres: form.genres
        ? form.genres.split(',').map((g) => g.trim()).filter(Boolean)
        : [],
      poster_url: form.poster_url || null,
      synopsis: form.synopsis || null,
      platform: form.platform || null,
      trailer_url: form.trailer_url || null,
      year: form.year || null,
    };

    try {
      if (isEdit) {
        await updateCineItem(initialData.id, payload);
      } else {
        await createCineItem(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Pantalla de búsqueda TMDB (solo en create mode antes de seleccionar) ──
  if (!isEdit && !showManual) {
    return (
      <div className="cine-form">
        <div className="cine-form__search-section">
          <p className="cine-form__search-hint">
            Buscá el título para autocompletar la información.
          </p>

          <form className="cine-form__search-row" onSubmit={handleSearch}>
            <input
              className="form-input"
              placeholder="Ej: Interstellar, La La Land..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={isSearching}>
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {searchError && <p className="cine-form__search-error">{searchError}</p>}
          {isLoadingDetail && <p className="cine-form__loading">Cargando información...</p>}

          {tmdbResults !== null && tmdbResults.length > 0 && (
            <div className="cine-form__tmdb-results">
              {tmdbResults.map((r) => (
                <button
                  key={r.tmdb_id}
                  className="cine-form__tmdb-result"
                  onClick={() => handleSelectResult(r)}
                  type="button"
                  disabled={isLoadingDetail}
                >
                  {r.poster_url ? (
                    <img
                      src={r.poster_url}
                      alt={r.title}
                      className="cine-form__tmdb-result-poster"
                    />
                  ) : (
                    <div className="cine-form__tmdb-result-poster cine-form__tmdb-result-poster--empty">
                      {r.type === 'movie' ? '🎬' : '📺'}
                    </div>
                  )}
                  <div className="cine-form__tmdb-result-info">
                    <strong>{r.title}</strong>
                    <span>
                      {r.type === 'movie' ? 'Película' : 'Serie'}
                      {r.year ? ` · ${r.year}` : ''}
                    </span>
                    {r.overview && (
                      <span className="cine-form__tmdb-result-overview">
                        {r.overview}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="cine-form__manual-link">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowManual(true)}
            >
              Cargar manualmente →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario de datos (edición o tras seleccionar de TMDB) ──────────────
  return (
    <form ref={formRef} className="cine-form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Tipo */}
      <div className="form-group">
        <label className="form-label">Tipo *</label>
        <div className="cine-form__type-options">
          {[['movie', '🎬 Película'], ['series', '📺 Serie']].map(([val, label]) => (
            <label
              key={val}
              className={`cine-form__type-btn ${form.type === val ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="type"
                value={val}
                checked={form.type === val}
                onChange={() => handleChange('type', val)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Estado */}
      <div className="form-group">
        <label className="form-label">Estado *</label>
        <div className="cine-form__type-options">
          {[['to_watch', '⏳ Por ver'], ['watched', '✓ Ya vimos']].map(([val, label]) => (
            <label
              key={val}
              className={`cine-form__type-btn ${form.status === val ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="status"
                value={val}
                checked={form.status === val}
                onChange={() => handleChange('status', val)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Título */}
      <div className="form-group">
        <label className="form-label">Título *</label>
        <input
          className="form-input"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Nombre de la película o serie"
          required
          autoFocus={isEdit}
        />
      </div>

      {/* Año — solo editable en carga manual */}
      {form.external_source !== 'tmdb' && (
        <div className="form-group">
          <label className="form-label">Año</label>
          <input
            className="form-input"
            value={form.year}
            onChange={(e) => handleChange('year', e.target.value)}
            placeholder="2024"
            maxLength={4}
            style={{ maxWidth: '120px' }}
          />
        </div>
      )}

      {/* Géneros */}
      <div className="form-group">
        <label className="form-label">
          Géneros{' '}
          <span className="form-hint">(separados por coma)</span>
        </label>
        <input
          className="form-input"
          value={form.genres}
          onChange={(e) => handleChange('genres', e.target.value)}
          placeholder="Drama, Romance, Comedia"
        />
      </div>

      {/* Sinopsis */}
      <div className="form-group">
        <label className="form-label">Sinopsis</label>
        <textarea
          className="form-textarea"
          value={form.synopsis}
          onChange={(e) => handleChange('synopsis', e.target.value)}
          placeholder="Breve descripción..."
          rows={3}
        />
      </div>

      {/* URL póster */}
      <div className="form-group">
        <label className="form-label">URL del póster</label>
        <input
          className="form-input"
          value={form.poster_url}
          onChange={(e) => handleChange('poster_url', e.target.value)}
          placeholder="https://..."
        />
        {form.poster_url && (
          <img
            src={form.poster_url}
            alt="Preview"
            className="cine-form__poster-preview"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>

      {/* Plataforma */}
      <div className="form-group">
        <label className="form-label">Plataforma</label>
        <input
          className="form-input"
          value={form.platform}
          onChange={(e) => handleChange('platform', e.target.value)}
          placeholder="Netflix, Disney+, Cine..."
          list="cine-platform-options"
        />
        <datalist id="cine-platform-options">
          {['Netflix', 'Disney+', 'Prime Video', 'Max', 'Star+', 'Apple TV+', 'Paramount+', 'Cine', 'Otra'].map(
            (p) => <option key={p} value={p} />,
          )}
        </datalist>
      </div>

      {/* Tráiler */}
      <div className="form-group">
        <label className="form-label">Link del tráiler</label>
        <input
          className="form-input"
          value={form.trailer_url}
          onChange={(e) => handleChange('trailer_url', e.target.value)}
          placeholder="https://youtube.com/..."
        />
      </div>

      {/* Puntaje */}
      <div className="form-group">
        <label className="form-label">Puntaje</label>
        <StarRating
          value={form.rating}
          onChange={(val) => handleChange('rating', val)}
        />
      </div>

      {/* Favorita */}
      <div className="form-group cine-form__favorite-row">
        <label className="cine-form__favorite-label">
          <input
            type="checkbox"
            checked={form.is_favorite}
            onChange={(e) => handleChange('is_favorite', e.target.checked)}
          />
          <span>Marcar como favorita ♥</span>
        </label>
      </div>

      <div className="cine-form__footer">
        {!isEdit && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setShowManual(false); setTmdbResults(null); setSearchError(''); }}
          >
            ← Volver a buscar
          </button>
        )}
        <div className="cine-form__footer-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    </form>
  );
}
