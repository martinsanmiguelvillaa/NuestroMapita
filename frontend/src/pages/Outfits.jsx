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

const SELECTED_USER_KEY = 'outfits_selected_user';

const OUTFIT_ITEMS = [
  { key: 'upper_body', label: 'Parte superior', icon: '👕' },
  { key: 'lower_body', label: 'Parte inferior', icon: '👖' },
  { key: 'footwear',   label: 'Calzado',         icon: '👟' },
];

const WEATHER_STATS = [
  { key: 'humidity',     label: 'Humedad',    icon: '💧', format: v => `${Math.round(v)}%` },
  { key: 'wind_speed',   label: 'Viento',     icon: '💨', format: v => `${Math.round(v * 3.6)} km/h` },
  { key: 'pop',          label: 'Lluvia',     icon: '🌧️', format: v => `${Math.round(v * 100)}%` },
  { key: 'cloudiness',   label: 'Nubosidad',  icon: '☁️', format: v => `${Math.round(v)}%` },
  { key: 'max_uv_index', label: 'Índice UV',  icon: '🔆', format: v => v != null ? Number(v).toFixed(1) : '—' },
  { key: 'sunset',       label: 'Atardecer',  icon: '🌅', format: v => v ? new Date(v * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—' },
];

function weatherIcon(description = '') {
  const d = description.toLowerCase();
  if (d.includes('thunderstorm')) return '⛈️';
  if (d.includes('drizzle') || d.includes('llovizna')) return '🌦️';
  if (d.includes('rain') || d.includes('lluvia')) return '🌧️';
  if (d.includes('snow') || d.includes('nieve')) return '❄️';
  if (d.includes('mist') || d.includes('fog') || d.includes('niebla')) return '🌫️';
  if (d.includes('overcast') || d.includes('broken')) return '☁️';
  if (d.includes('scattered') || d.includes('few clouds')) return '🌤️';
  if (d.includes('clear') || d.includes('despejado')) return '☀️';
  return '🌡️';
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

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

  const initSession = useCallback(async (userKey) => {
    setLoadingSession(true);
    setOutfit(null);
    setPreferences([]);
    try {
      const s = await ensureSession(userKey);
      setSession(s);
      return s;
    } catch {
      toast.error('No se pudo conectar con la API de outfits');
      return null;
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const fetchOutfit = useCallback(async (s, prefs, occasionText) => {
    setLoadingOutfit(true);
    let tempPrefId = null;
    try {
      if (occasionText.trim()) {
        await addPreference(s.userId, s.token, `Ocasión: ${occasionText.trim()}`);
        const updated = await getPreferences(s.userId, s.token);
        const temp = updated.find(p => p.preference.startsWith('Ocasión: '));
        tempPrefId = temp?.id ?? null;
      }
      const { outfit: o, weather: w } = await getUserOutfit(s.userId, s.token);
      setOutfit(o);
      setWeather(w);
    } catch (err) {
      if (err.message?.toLowerCase().includes('unauthorized') || err.message?.includes('401')) {
        clearSession(selectedUser);
        toast.error('Sesión expirada, recargá la página');
      } else {
        toast.error(err.message || 'No se pudo obtener el outfit');
      }
    } finally {
      if (tempPrefId) {
        try { await deletePreference(s.userId, s.token, tempPrefId); } catch { /* no crítico */ }
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
    const confirmed = await confirm({
      title: 'Eliminar preferencia',
      message: `¿Eliminar "${pref.preference}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    setDeletingPrefId(pref.id);
    try {
      await deletePreference(session.userId, session.token, pref.id);
      setPreferences(prev => prev.filter(p => p.id !== pref.id));
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la preferencia');
    } finally {
      setDeletingPrefId(null);
    }
  }

  const busy = loadingSession || loadingOutfit;

  return (
    <div className="outfits-page">
      <div className="outfits-page__inner">

        <header className="outfits-page__header">
          <h1 className="outfits-page__title">¿Qué me pongo?</h1>
          <p className="outfits-page__subtitle">Outfit del día según el clima real</p>
        </header>

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

        {busy && (
          <div className="outfits-page__loading">
            <div className="outfits-page__spinner" />
            <p>{loadingSession ? 'Iniciando sesión...' : 'Armando tu outfit...'}</p>
          </div>
        )}

        {outfit && weather && !busy && (
          <>
            {/* Tarjetas clima + outfit */}
            <div className="outfits-page__cards">

              {/* Tarjeta clima */}
              <div className="weather-card">
                <div className="weather-card__header">
                  <div>
                    <p className="weather-card__city">📍 {weather.city}</p>
                    <p className="weather-card__date">{formatDate(weather.checked_at)}</p>
                  </div>
                  <span className="weather-card__icon">{weatherIcon(weather.description)}</span>
                </div>

                <div className="weather-card__main">
                  <span className="weather-card__temp">{Math.round(weather.temperature)}°C</span>
                  <div className="weather-card__meta">
                    <span>Sensación térmica: {Math.round(weather.feels_like)}°C</span>
                    <span className="weather-card__desc">{weather.description}</span>
                  </div>
                </div>

                <div className="weather-card__grid">
                  {WEATHER_STATS.map(({ key, label, icon, format }) => (
                    <div key={key} className="weather-card__stat">
                      <span className="weather-card__stat-icon">{icon}</span>
                      <span className="weather-card__stat-value">{format(weather[key])}</span>
                      <span className="weather-card__stat-label">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta outfit */}
              <div className="outfit-card">
                <h2 className="outfit-card__title">Tu outfit de hoy</h2>

                <div className="outfit-card__items">
                  {OUTFIT_ITEMS.map(({ key, label, icon }) => (
                    <div key={key} className="outfit-card__item">
                      <span className="outfit-card__item-icon">{icon}</span>
                      <div className="outfit-card__item-body">
                        <span className="outfit-card__item-label">{label}</span>
                        <span className="outfit-card__item-value">{outfit[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {outfit.extras?.length > 0 && (
                  <div className="outfit-card__extras">
                    {outfit.extras.map((extra, i) => (
                      <span key={i} className="outfit-card__extra-pill">{extra}</span>
                    ))}
                  </div>
                )}

                <p className="outfit-card__summary">{outfit.summary}</p>
              </div>
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
              <button className="btn btn-primary" onClick={handleRefresh} disabled={busy}>
                Actualizar outfit
              </button>
            </div>

            {/* Preferencias */}
            <section className="outfits-page__prefs">
              <h2 className="outfits-page__prefs-title">Tus preferencias</h2>
              <p className="outfits-page__prefs-subtitle">Se usan siempre al generar tu outfit</p>

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
                <button type="submit" className="btn btn-secondary" disabled={addingPref || !newPref.trim()}>
                  {addingPref ? 'Guardando...' : 'Agregar'}
                </button>
              </form>

              {preferences.length === 0 ? (
                <p className="outfits-page__prefs-empty">Todavía no tenés preferencias guardadas.</p>
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
