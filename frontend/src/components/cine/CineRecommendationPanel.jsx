import { useState } from 'react';
import {
  generateRecommendation,
  blockRecommendation,
  getRecommendationHistory,
  getBlockedRecommendations,
  unblockRecommendation,
} from '../../api/recommendations';
import { createCineItem } from '../../api/cine';
import RecommendationCard from './RecommendationCard';
import Modal from '../ui/Modal';

const MOODS = [
  'Romántica ♥',
  'Comedia 😂',
  'Drama 🎭',
  'Suspenso 😱',
  'Acción 💥',
  'Fantasía ✨',
  'Terror 👻',
  'Animación 🎨',
  'Documental 📚',
];

export default function CineRecommendationPanel({ onItemAdded }) {
  const [open, setOpen] = useState(false);
  const [reqType, setReqType] = useState('');
  const [moods, setMoods] = useState(new Set());
  const [extraText, setExtraText] = useState('');
  const [includeWatchlist, setIncludeWatchlist] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);           // { main, similar }
  const [added, setAdded] = useState(new Set());         // set of added titles
  const [blocked, setBlocked] = useState(new Set());     // set of blocked titles (session)
  const [sessionExcluded, setSessionExcluded] = useState(new Set()); // all titles shown so far

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedList, setBlockedList] = useState(null);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const resetSession = () => {
    setSessionExcluded(new Set());
    setResult(null);
    setAdded(new Set());
    setBlocked(new Set());
  };

  const toggleMood = (mood) => {
    resetSession();
    setMoods((prev) => {
      const next = new Set(prev);
      next.has(mood) ? next.delete(mood) : next.add(mood);
      return next;
    });
  };

  const handleGenerate = async (currentExcluded = sessionExcluded) => {
    setLoading(true);
    setError('');
    setAdded(new Set());
    setBlocked(new Set());
    try {
      const data = await generateRecommendation({
        type: reqType || null,
        moods: Array.from(moods),
        extra_text: extraText || null,
        include_watchlist: includeWatchlist,
        session_excluded: Array.from(currentExcluded),
      });
      // Accumulate all shown titles for this session
      const newTitles = [data.main, ...(data.similar || [])].map((r) => r.title);
      setSessionExcluded((prev) => new Set([...prev, ...newTitles]));
      setResult(data);
    } catch (err) {
      setError(err.message || 'No se pudo generar la recomendación');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (rec) => {
    try {
      await createCineItem({
        title: rec.title,
        type: rec.type,
        status: 'to_watch',
        year: rec.year || null,
        genres: rec.genres || [],
        synopsis: rec.synopsis_short || null,
        poster_url: null,
        platform: null,
        trailer_url: null,
        rating: null,
        is_favorite: false,
        external_source: null,
        external_id: null,
      });
      setAdded((prev) => new Set([...prev, rec.title]));
      onItemAdded?.();
    } catch (err) {
      alert('No se pudo agregar: ' + err.message);
    }
  };

  const handleBlock = async (rec) => {
    try {
      await blockRecommendation(rec.title);
      setBlocked((prev) => new Set([...prev, rec.title]));
    } catch (err) {
      alert('No se pudo bloquear: ' + err.message);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getRecommendationHistory();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
      setShowHistory(true);
    }
  };

  const loadBlocked = async () => {
    setLoadingBlocked(true);
    try {
      const data = await getBlockedRecommendations();
      setBlockedList(data);
    } catch {
      setBlockedList([]);
    } finally {
      setLoadingBlocked(false);
      setShowBlocked(true);
    }
  };

  const handleUnblock = async (id) => {
    try {
      await unblockRecommendation(id);
      setBlockedList((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="rec-panel">
      {/* Toggle button */}
      <button
        className={`rec-panel__toggle ${open ? 'rec-panel__toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>✨ Recomendación inteligente</span>
        <span className="rec-panel__toggle-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="rec-panel__body">
          {/* Config */}
          <div className="rec-panel__config">
            {/* Type */}
            <div className="rec-panel__config-row">
              <span className="rec-panel__config-label">¿Qué queremos?</span>
              <div className="rec-panel__type-opts">
                {[['', 'Cualquiera'], ['movie', '🎬 Película'], ['series', '📺 Serie']].map(([val, label]) => (
                  <button
                    key={val}
                    className={`rec-panel__type-btn ${reqType === val ? 'rec-panel__type-btn--active' : ''}`}
                    onClick={() => { setReqType(val); resetSession(); }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div className="rec-panel__config-row">
              <span className="rec-panel__config-label">Estado de ánimo</span>
              <div className="rec-panel__moods">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    className={`rec-panel__mood-chip ${moods.has(mood) ? 'rec-panel__mood-chip--active' : ''}`}
                    onClick={() => toggleMood(mood)}
                    type="button"
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra text */}
            <div className="rec-panel__config-row">
              <span className="rec-panel__config-label">Algo más</span>
              <textarea
                className="form-textarea rec-panel__extra"
                placeholder="Ej: algo para ver en una noche de lluvia, o similar a Fleabag..."
                value={extraText}
                onChange={(e) => setExtraText(e.target.value)}
                rows={2}
              />
            </div>

            {/* Include watchlist */}
            <div className="rec-panel__config-row">
              <label className="rec-panel__checkbox-label">
                <input
                  type="checkbox"
                  checked={includeWatchlist}
                  onChange={(e) => setIncludeWatchlist(e.target.checked)}
                />
                <span>Puede sugerir algo de nuestra lista de pendientes</span>
              </label>
            </div>

            <div className="rec-panel__config-footer">
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? '✨ Pensando...' : '✨ Recomendar'}
              </button>
              <div className="rec-panel__meta-links">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                >
                  {loadingHistory ? 'Cargando...' : 'Ver historial'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={loadBlocked}
                  disabled={loadingBlocked}
                >
                  {loadingBlocked ? 'Cargando...' : 'Bloqueadas'}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <p className="rec-panel__error">{error}</p>}

          {/* Results */}
          {result && (
            <div className="rec-panel__results">
              <p className="rec-panel__results-label">Nuestra recomendación</p>

              {/* Main */}
              <RecommendationCard
                rec={result.main}
                isMain
                onAdd={handleAdd}
                onBlock={handleBlock}
                added={added.has(result.main.title)}
                blocked={blocked.has(result.main.title)}
              />

              {/* Similar */}
              {result.similar?.length > 0 && (
                <>
                  <p className="rec-panel__similar-label">También puede ser...</p>
                  <div className="rec-panel__similar-grid">
                    {result.similar.map((rec) => (
                      <RecommendationCard
                        key={rec.title}
                        rec={rec}
                        isMain={false}
                        onAdd={handleAdd}
                        onBlock={handleBlock}
                        added={added.has(rec.title)}
                        blocked={blocked.has(rec.title)}
                      />
                    ))}
                  </div>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button className="btn btn-outline btn-sm" onClick={handleGenerate} disabled={loading}>
                  🎲 Otra sugerencia
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal: Historial */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Historial de recomendaciones"
      >
        {history === null || history.length === 0 ? (
          <p className="rec-panel__history-empty">Todavía no generaron ninguna.</p>
        ) : (
          <div className="rec-panel__history-list">
            {history.map((entry) => (
              <div key={entry.id} className="rec-panel__history-entry">
                <span className="rec-panel__history-date">
                  {new Date(entry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
                <div className="rec-panel__history-titles">
                  <strong>{entry.main_title}</strong>
                  {entry.recommendations?.similar?.length > 0 && (
                    <span className="rec-panel__history-similar">
                      {' '}· {entry.recommendations.similar.map((s) => s.title).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal: Bloqueadas */}
      <Modal
        isOpen={showBlocked}
        onClose={() => setShowBlocked(false)}
        title="Títulos bloqueados"
      >
        {blockedList === null || blockedList.length === 0 ? (
          <p className="rec-panel__history-empty">No bloqueaste ningún título.</p>
        ) : (
          <div className="rec-panel__blocked-list">
            {blockedList.map((b) => (
              <div key={b.id} className="rec-panel__blocked-item">
                <span>{b.title}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleUnblock(b.id)}
                  title="Desbloquear"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
