import { useState } from 'react';
import { getOutfitByCity, getOutfitByLocation } from '../api/outfits';
import { useToast } from '../context/ToastContext';
import '../styles/outfits.css';

const OUTFIT_ITEMS = [
  { key: 'upper_body', label: 'Parte de arriba' },
  { key: 'lower_body', label: 'Parte de abajo' },
  { key: 'footwear',   label: 'Calzado' },
];

export default function Outfits() {
  const toast = useToast();
  const [city, setCity] = useState('');
  const [outfit, setOutfit] = useState(null);
  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    setOutfit(null);
    try {
      const data = await getOutfitByCity(city.trim());
      setOutfit(data);
      setCityName(city.trim());
    } catch (err) {
      toast.error(err.message || 'No se pudo obtener el outfit');
    } finally {
      setLoading(false);
    }
  }

  function handleLocation() {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }
    setLocating(true);
    setOutfit(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getOutfitByLocation(coords.latitude, coords.longitude);
          setOutfit(data);
          setCityName('tu ubicación');
        } catch (err) {
          toast.error(err.message || 'No se pudo obtener el outfit');
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.error('No se pudo obtener tu ubicación');
        setLocating(false);
      }
    );
  }

  const busy = loading || locating;

  return (
    <div className="outfits-page">
      <div className="outfits-page__inner">
        <header className="outfits-page__header">
          <h1 className="outfits-page__title">¿Qué me pongo?</h1>
          <p className="outfits-page__subtitle">
            Outfit del día según el clima real
          </p>
        </header>

        <div className="outfits-page__search-area">
          <form className="outfits-page__form" onSubmit={handleSearch}>
            <input
              id="outfit-city"
              className="form-input outfits-page__input"
              type="text"
              placeholder="Ingresá una ciudad..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              className="btn btn-primary outfits-page__btn-search"
              disabled={busy || !city.trim()}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="outfits-page__divider">
            <span>o</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary outfits-page__btn-location"
            onClick={handleLocation}
            disabled={busy}
          >
            {locating ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación'}
          </button>
        </div>

        {busy && (
          <div className="outfits-page__loading">
            <div className="outfits-page__spinner" />
            <p>Consultando el clima y armando tu outfit...</p>
          </div>
        )}

        {outfit && !busy && (
          <div className="outfits-page__result">
            <p className="outfits-page__result-city">Outfit para {cityName}</p>

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
        )}
      </div>
    </div>
  );
}
