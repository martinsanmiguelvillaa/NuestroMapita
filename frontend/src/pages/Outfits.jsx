import { useState, useEffect, useCallback } from 'react';
import {
  USERS,
  ensureSession,
  clearSession,
  getUserOutfit,
  getPreferences,
  addPreference,
  deletePreference,
} from '../api/outfits';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import '../styles/outfits.css';

const OUTFIT_ITEMS = [
  { key: 'upper_body', label: 'Arriba' },
  { key: 'lower_body', label: 'Abajo' },
  { key: 'footwear',   label: 'Calzado' },
];

const SELECTED_USER_KEY = 'outfits_selected_user';

export default function Outfits() {
  const toast = useToast();
  const confirm = useConfirm();

  const [selectedUser, setSelectedUser] = useState(() => localStorage.getItem(SELECTED_USER_KEY));
  const [session, setSession] = useState(null);
  const [outfit, setOutfit] = useState(null);
  const [weather, setWeather] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [occasion, setOccasion] = useState('');
  const [newPref, setNewPref] = useState('');
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [addingPref, setAddingPref] = useState(false);
  const [deletingPrefId, setDeletingPrefId] = useState(null);

  // Inicializar sesión cuando se selecciona un usuario
  const initSession = useCallback(async (userKey) => {
    setLoadingSession(true);
    setOutfit(null);
    setPreferences([]);
    try {
      const s = await ensureSession(userKey);
      setSession(s);
      return s;
    } catch (err) {
      toast.error('No se pudo conectar con la API de outfits');
      return null;
    } finally {
      setLoadingSession(false);
    }
  }, []);

  // Pedir outfit, opcionalmente con una preferencia de ocasión temporal
  const fetchOutfit = useCallback(async (s, prefs, occasionText) => {
    setLoadingOutfit(true);
    let tempPrefId = null;
    try {
      if (occasionText.trim()) {
        await addPreference(s.userId, s.token, `Ocasión: ${occasionText.trim()}`);
        // Obtenemos las prefs actualizadas para conseguir el id de la que acabamos de agregar
        const updated = await getPreferences(s.userId, s.token);
        const temp = updated.find(p => p.preference.startsWith('Ocasión: '));
        tempPrefId = temp?.id ?? null;
      }
      const { outfit: o, weather: w } = await getUserOutfit(s.userId, s.token);
      setOutfit(o);
      setWeather(w);
    } catch (err) {
      // Si el token expiró, limpiar y reintentar una vez
      if (err.message?.toLowerCase().includes('unauthorized') || err.message?.includes('401')) {
        clearSession(selectedUser);
        toast.error('Sesión expirada, recargá la página');
      } else {
        toast.error(err.message || 'No se pudo obtener el outfit');
      }
    } finally {
      // Siempre limpiar la preferencia temporal
      if (tempPrefId) {
        try {
          await deletePreference(s.userId, s.token, tempPrefId);
        } catch {
          // Si falla la limpieza, no es crítico
        }
      }
      setLoadingOutfit(false);
    }
  }, [selectedUser]);

  const loadPreferences = useCallback(async (s) => {
    try {
      const prefs = await getPreferences(s.userId, s.token);
      setPreferences(prefs);
      return prefs;
    } catch {
      return [];
    }
  }, []);

  // Al seleccionar usuario: init sesión → cargar prefs → cargar outfit
  useEffect(() => {
    if (!selectedUser) return;
    let cancelled = false;
    (async () => {
      const s = await initSession(selectedUser);
      if (!s || cancelled) return;
      const prefs = await loadPreferences(s);
      if (cancelled) return;
      await fetchOutfit(s, prefs, '');
    })();
    return () => { cancelled = true; };
  }, [selectedUser]);

  function handleSelectUser(userKey) {
    if (busy || userKey === selectedUser) return;
    setSelectedUser(userKey);
    setLoadingSession(true);
    localStorage.setItem(SELECTED_USER_KEY, userKey);
    setSession(null);
    setOutfit(null);
    setPreferences([]);
    setOccasion('');
  }

  async function handleRefresh() {
    if (!session) return;
    const prefs = await loadPreferences(session);
    await fetchOutfit(session, prefs, occasion);
    setOccasion('');
  }

  async function handleAddPref(e) {
    e.preventDefault();
    if (!newPref.trim() || !session) return;
    setAddingPref(true);
    try {
      await addPreference(session.userId, session.token, newPref.trim());
      setNewPref('');
      await loadPreferences(session);
    } catch (err) {
      toast.error(err.message || 'No se pudo agregar la preferencia');
    } finally {
      setAddingPref(false);
    }
  }

  async function handleDeletePref(pref) {
    confirm('Eliminar preferencia', `¿Eliminar "${pref.preference}"?`, async () => {
      setDeletingPrefId(pref.id);
      try {
        await deletePreference(session.userId, session.token, pref.id);
        setPreferences(prev => prev.filter(p => p.id !== pref.id));
      } catch (err) {
        toast.error(err.message || 'No se pudo eliminar la preferencia');
      } finally {
        setDeletingPrefId(null);
      }
    });
  }

  const busy = loadingSession || loadingOutfit;

  return (
    <div className="outfits-page">
      <div className="outfits-page__inner">

        <header className="outfits-page__header">
          <h1 className="outfits-page__title">¿Qué me pongo?</h1>
          <p className="outfits-page__subtitle">Outfit del día según el clima real</p>
        </header>

        {/* Selector de usuario */}
        <div className="outfits-page__user-selector">
          {Object.values(USERS).map(u => (
            <button
              key={u.key}
              className={`outfits-page__user-btn ${selectedUser === u.key ? 'active' : ''}`}
              onClick={() => handleSelectUser(u.key)}
              disabled={busy}
            >
              {u.name}
            </button>
          ))}
        </div>

        {/* Loading inicial */}
        {busy && (
          <div className="outfits-page__loading">
            <div className="outfits-page__spinner" />
            <p>{loadingSession ? 'Iniciando sesión...' : 'Armando tu outfit...'}</p>
          </div>
        )}

        {/* Resultado */}
        {outfit && !busy && (
          <>
            <div className="outfits-page__result">
              {weather && (
                <p className="outfits-page__weather-meta">
                  {weather.city} · {weather.temperature}°C · {weather.description}
                </p>
              )}

              <p className="outfits-page__summary">{outfit.summary}</p>

              <div className="outfits-page__items">
                {OUTFIT_ITEMS.map(({ key, label }) => (
                  <div key={key} className="outfits-page__item">
                    <span className="outfits-page__item-label">{label}</span>
                    <span className="outfits-page__item-value">{outfit[key]}</span>
                  </div>
                ))}
              </div>

              {outfit.extras?.length > 0 && (
                <div className="outfits-page__extras">
                  <span className="outfits-page__extras-label">Extras</span>
                  <ul className="outfits-page__extras-list">
                    {outfit.extras.map((extra, i) => (
                      <li key={i} className="outfits-page__extra-item">{extra}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Ocasión + actualizar */}
            <div className="outfits-page__refresh-area">
              <input
                className="form-input"
                type="text"
                placeholder="¿Tenés alguna ocasión especial? (opcional)"
                value={occasion}
                onChange={e => setOccasion(e.target.value)}
                disabled={busy}
              />
              <button
                className="btn btn-primary"
                onClick={handleRefresh}
                disabled={busy}
              >
                Actualizar outfit
              </button>
            </div>

            {/* Preferencias */}
            <section className="outfits-page__prefs">
              <h2 className="outfits-page__prefs-title">Tus preferencias</h2>
              <p className="outfits-page__prefs-subtitle">
                Se usan siempre al generar tu outfit
              </p>

              <form className="outfits-page__pref-form" onSubmit={handleAddPref}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ej: prefiero ropa casual, me gustan los colores neutros..."
                  value={newPref}
                  onChange={e => setNewPref(e.target.value)}
                  disabled={addingPref}
                  maxLength={250}
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={addingPref || !newPref.trim()}
                >
                  {addingPref ? 'Guardando...' : 'Agregar'}
                </button>
              </form>

              {preferences.length === 0 ? (
                <p className="outfits-page__prefs-empty">
                  Todavía no tenés preferencias guardadas.
                </p>
              ) : (
                <ul className="outfits-page__prefs-list">
                  {preferences.map(pref => (
                    <li key={pref.id} className="outfits-page__pref-item">
                      <span className="outfits-page__pref-text">{pref.preference}</span>
                      <button
                        className="outfits-page__pref-delete"
                        onClick={() => handleDeletePref(pref)}
                        disabled={deletingPrefId === pref.id}
                        aria-label="Eliminar preferencia"
                      >
                        {deletingPrefId === pref.id ? '...' : '×'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
