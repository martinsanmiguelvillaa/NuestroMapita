import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  USERS,
  getUserOutfit,
  getCachedOutfit,
  getPreferences,
  addPreference,
  deletePreference,
} from '../api/outfits';
import { toast } from 'sonner';
import { useConfirm } from '../context/ConfirmContext';
import { useOutfitNotifications } from '../hooks/useOutfitNotifications';
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

const DESCRIPTION_ES = {
  'clear sky': 'Cielo despejado',
  'few clouds': 'Pocas nubes',
  'scattered clouds': 'Nubes dispersas',
  'broken clouds': 'Nublado parcial',
  'overcast clouds': 'Muy nublado',
  'light rain': 'Lluvia leve',
  'moderate rain': 'Lluvia moderada',
  'heavy intensity rain': 'Lluvia intensa',
  'very heavy rain': 'Lluvia muy intensa',
  'light drizzle': 'Llovizna leve',
  'drizzle': 'Llovizna',
  'heavy drizzle': 'Llovizna intensa',
  'thunderstorm': 'Tormenta eléctrica',
  'thunderstorm with light rain': 'Tormenta con lluvia leve',
  'thunderstorm with rain': 'Tormenta con lluvia',
  'thunderstorm with heavy rain': 'Tormenta con lluvia intensa',
  'light snow': 'Nevada leve',
  'snow': 'Nieve',
  'heavy snow': 'Nevada intensa',
  'sleet': 'Aguanieve',
  'mist': 'Neblina',
  'smoke': 'Humo',
  'haze': 'Bruma',
  'sand': 'Arena',
  'dust': 'Polvo',
  'fog': 'Niebla',
  'tornado': 'Tornado',
};

function translateDescription(description = '') {
  return DESCRIPTION_ES[description.toLowerCase()] ?? description;
}

function weatherIcon(description = '') {
  const d = description.toLowerCase();
  if (d.includes('thunderstorm')) return '⛈️';
  if (d.includes('drizzle')) return '🌦️';
  if (d.includes('rain')) return '🌧️';
  if (d.includes('snow') || d.includes('sleet')) return '❄️';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
  if (d.includes('overcast') || d.includes('broken')) return '☁️';
  if (d.includes('scattered') || d.includes('few clouds')) return '🌤️';
  if (d.includes('clear')) return '☀️';
  return '🌡️';
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Card de notificaciones ─────────────────────────────────────────
function OutfitNotificationCard({ userKey }) {
  const { status, notifTime, deviceLabel, saving, testing, error, testResult, activate, updateTime, deactivate, testPush } =
    useOutfitNotifications(userKey);

  const [editingTime, setEditingTime] = useState(false);
  const [pendingTime, setPendingTime] = useState('09:00');
  const [setupTime, setSetupTime] = useState('09:00');

  if (status === 'loading') return null;

  if (status === 'unsupported') {
    return (
      <div className="outfit-notif-card outfit-notif-card--muted">
        <p className="outfit-notif-card__title">🔔 Notificaciones</p>
        <p className="outfit-notif-card__msg">
          Este navegador no permite notificaciones web. Probá desde otro navegador o dispositivo.
        </p>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="outfit-notif-card outfit-notif-card--muted">
        <p className="outfit-notif-card__title">🔔 Notificaciones bloqueadas</p>
        <p className="outfit-notif-card__msg">
          Las notificaciones están bloqueadas en este navegador. Para activarlas, tenés que habilitarlas
          desde la configuración del navegador.
        </p>
      </div>
    );
  }

  if (status === 'active') {
    return (
      <div className="outfit-notif-card outfit-notif-card--active">
        <div className="outfit-notif-card__header">
          <p className="outfit-notif-card__title">🔔 Notificaciones activas</p>
          <span className="outfit-notif-card__badge">Activo en este dispositivo</span>
        </div>
        <p className="outfit-notif-card__device">
          📱 {deviceLabel || 'Este dispositivo'}
        </p>

        {editingTime ? (
          <div className="outfit-notif-card__time-row">
            <input
              type="time"
              className="form-input outfit-notif-card__time-input"
              value={pendingTime}
              onChange={e => setPendingTime(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={async () => {
                try {
                  await updateTime(pendingTime);
                  setEditingTime(false);
                } catch {
                  // error ya seteado en el hook, no cerramos el editor
                }
              }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingTime(false)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="outfit-notif-card__time-row">
            <span className="outfit-notif-card__time-display">⏰ Todos los días a las {notifTime} hs</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setPendingTime(notifTime); setEditingTime(true); }}
            >
              Cambiar horario
            </button>
          </div>
        )}

        <div className="outfit-notif-card__actions-row">
          <button
            className="btn btn-ghost btn-sm"
            disabled={saving || testing}
            onClick={testPush}
          >
            {testing ? 'Enviando...' : 'Probar ahora'}
          </button>
          <button
            className="btn btn-ghost btn-sm outfit-notif-card__deactivate"
            disabled={saving || testing}
            onClick={deactivate}
          >
            Desactivar en este dispositivo
          </button>
        </div>
        {testResult === 'ok' && (
          <p className="outfit-notif-card__test-ok">✓ Notificación enviada — fijate en las notificaciones del sistema</p>
        )}
        {error && <p className="outfit-notif-card__error">{error}</p>}
      </div>
    );
  }

  // status === 'inactive'
  return (
    <div className="outfit-notif-card">
      <p className="outfit-notif-card__title">🔔 Notificaciones</p>
      <p className="outfit-notif-card__desc">
        Activá las notificaciones en este dispositivo para que te llegue tu outfit del día
        justo cuando lo necesitás.
      </p>

      <div className="outfit-notif-card__setup">
        <div className="outfit-notif-card__time-row">
          <label className="outfit-notif-card__time-label">Horario</label>
          <input
            type="time"
            className="form-input outfit-notif-card__time-input"
            value={setupTime}
            onChange={e => setSetupTime(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={saving}
          onClick={() => activate(setupTime)}
        >
          {saving ? 'Activando...' : 'Activar notificaciones en este dispositivo'}
        </button>
        {error && <p className="outfit-notif-card__error">{error}</p>}
      </div>

      <p className="outfit-notif-card__hint">
        Solo vas a recibir notificaciones en este celu o compu. Si querés recibirlas en otro
        dispositivo, activálas desde ahí también.
      </p>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────
export default function Outfits() {
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();

  const [selectedUser, setSelectedUser] = useState(() => {
    const fromUrl = searchParams.get('user');
    if (fromUrl && USERS[fromUrl]) return fromUrl;
    return localStorage.getItem(SELECTED_USER_KEY);
  });
  const [outfit, setOutfit] = useState(null);
  const [weather, setWeather] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [occasion, setOccasion] = useState('');
  const [newPref, setNewPref] = useState('');
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [addingPref, setAddingPref] = useState(false);
  const [deletingPrefId, setDeletingPrefId] = useState(null);

  const fetchOutfit = useCallback(async (userKey, occasionText, { forceRefresh = false } = {}) => {
    setLoadingOutfit(true);
    let tempPrefId = null;
    try {
      // Si no hay ocasión especial y no se fuerza refresco, intentar caché primero
      if (!occasionText.trim() && !forceRefresh) {
        try {
          const cached = await getCachedOutfit(userKey);
          setOutfit(cached.outfit);
          setWeather(cached.weather);
          setLoadingOutfit(false);
          return;
        } catch {
          // No hay caché válido, seguir con la API normal
        }
      }

      if (occasionText.trim()) {
        await addPreference(userKey, `Ocasión: ${occasionText.trim()}`);
        const updated = await getPreferences(userKey);
        const temp = updated.find(p => p.preference.startsWith('Ocasión: '));
        tempPrefId = temp?.id ?? null;
      }
      const { outfit: o, weather: w } = await getUserOutfit(userKey);
      setOutfit(o);
      setWeather(w);
    } catch (err) {
      toast.error(err.message || 'No se pudo obtener el outfit');
    } finally {
      if (tempPrefId) {
        try { await deletePreference(userKey, tempPrefId); } catch { /* no crítico */ }
      }
      setLoadingOutfit(false);
    }
  }, []);

  const loadPreferences = useCallback(async (userKey) => {
    try {
      const prefs = await getPreferences(userKey);
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
      await loadPreferences(selectedUser);
      if (cancelled) return;
      await fetchOutfit(selectedUser, '');
    })();
    return () => { cancelled = true; };
  }, [selectedUser]);

  function handleSelectUser(userKey) {
    if (busy || userKey === selectedUser) return;
    setSelectedUser(userKey);
    setLoadingOutfit(true);
    localStorage.setItem(SELECTED_USER_KEY, userKey);
    setOutfit(null);
    setPreferences([]);
    setOccasion('');
  }

  async function handleRefresh() {
    if (!selectedUser) return;
    await loadPreferences(selectedUser);
    await fetchOutfit(selectedUser, occasion, { forceRefresh: true });
    setOccasion('');
  }

  async function handleAddPref(e) {
    e.preventDefault();
    if (!newPref.trim() || !selectedUser) return;
    setAddingPref(true);
    try {
      await addPreference(selectedUser, newPref.trim());
      setNewPref('');
      await loadPreferences(selectedUser);
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
      await deletePreference(selectedUser, pref.id);
      setPreferences(prev => prev.filter(p => p.id !== pref.id));
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la preferencia');
    } finally {
      setDeletingPrefId(null);
    }
  }

  const busy = loadingOutfit;

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
              <img src={`/icons/icono-${u.key}.webp`} alt={u.name} className="outfits-page__user-icon" />
              {u.name}
            </button>
          ))}
        </div>

        {busy && (
          <div className="outfits-page__loading">
            <div className="outfits-page__spinner" />
            <p>Armando tu outfit...</p>
          </div>
        )}

        {outfit && weather && !busy && (
          <>
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
                  <div className="weather-card__temp">
                    <span className="weather-card__temp-num">{Math.round(weather.temperature)}</span>
                    <span className="weather-card__temp-unit">°C</span>
                  </div>
                  <div className="weather-card__meta">
                    <span>Sensación térmica: {Math.round(weather.feels_like)}°C</span>
                    <span className="weather-card__desc">{translateDescription(weather.description)}</span>
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

            {/* Notificaciones */}
            <OutfitNotificationCard key={selectedUser} userKey={selectedUser} />
          </>
        )}
      </div>
    </div>
  );
}
