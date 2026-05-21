import { useState, useEffect } from 'react';
import { getOutfitByLocation } from '../api/outfits';
import { useToast } from '../context/ToastContext';
import '../styles/outfits.css';

const OUTFIT_ITEMS = [
  { key: 'upper_body', label: 'Parte de arriba' },
  { key: 'lower_body', label: 'Parte de abajo' },
  { key: 'footwear',   label: 'Calzado' },
];

export default function Outfits() {
  const toast = useToast();
  const [outfit, setOutfit] = useState(null);
  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getOutfitByLocation(coords.latitude, coords.longitude);
          setOutfit(data);
          setCityName('tu ubicación');
        } catch (err) {
          setError(err.message || 'No se pudo obtener el outfit');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('No se pudo obtener tu ubicación. Revisá los permisos de localización.');
        setLoading(false);
      }
    );
  }, []);

  async function handleRetry() {
    setLoading(true);
    setError(null);
    setOutfit(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getOutfitByLocation(coords.latitude, coords.longitude);
          setOutfit(data);
          setCityName('tu ubicación');
        } catch (err) {
          setError(err.message || 'No se pudo obtener el outfit');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('No se pudo obtener tu ubicación. Revisá los permisos de localización.');
        setLoading(false);
      }
    );
  }

  return (
    <div className="outfits-page">
      <div className="outfits-page__inner">
        <header className="outfits-page__header">
          <h1 className="outfits-page__title">¿Qué me pongo?</h1>
          <p className="outfits-page__subtitle">Outfit del día según el clima real</p>
        </header>

        {loading && (
          <div className="outfits-page__loading">
            <div className="outfits-page__spinner" />
            <p>Consultando el clima y armando tu outfit...</p>
          </div>
        )}

        {error && !loading && (
          <div className="outfits-page__error">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={handleRetry}>
              Reintentar
            </button>
          </div>
        )}

        {outfit && !loading && (
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

            <button className="btn btn-secondary outfits-page__btn-retry" onClick={handleRetry}>
              Actualizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
