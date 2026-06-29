import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { getOutfitNotificationStatus, updateOutfitNotificationSettings } from '../../api/outfitNotifications';
import { getDeviceStatus, updateDeviceSettings } from '../../api/push';
import { getOrCreateDeviceId } from '../../utils/deviceId';
import NotificationBell from '../NotificationBell';
import '../../styles/navbar.css';

const S = '/icons/iconos-secciones/';
const C = '/icons/config/';

const links = [
  { to: '/',            label: 'Inicio',     iconImg: `${S}inicio.webp` },
  { to: '/mapa',        label: 'Mapa',       iconImg: `${S}mapita.webp` },
  { to: '/calendario',  label: 'Calendario', iconImg: `${S}calendario.webp` },
  { to: '/visitados',   label: 'Ya hicimos', iconImg: `${S}ya-hicimos.webp` },
  { to: '/por-visitar', label: 'Por hacer',  iconImg: `${S}por-hacer.webp` },
  { to: '/viajecitos',  label: 'Viajecitos', iconImg: `${S}viajecitos.webp` },
  { to: '/cartitas',    label: 'Cartitas',   iconImg: `${S}cartitas.webp` },
  { to: '/recetas',     label: 'Recetas',    iconImg: `${S}recetas.webp` },
  { to: '/cine',        label: 'Cine',       iconImg: `${S}cine.webp` },
  { to: '/outfits',     label: 'Outfits',    iconImg: `${S}clima-en-outfits.webp` },
  { to: '/nombres',     label: 'Nombres',    iconImg: `${S}nombres.webp` },
];

export default function Navbar() {
  const { logout } = useAuth();
  const location = useLocation();
  const [confirming, setConfirming] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);
  const linksRef = useRef(null);
  const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications();

  // Estado de notificaciones de outfits por usuario en este dispositivo
  // null = cargando, { exists, enabled } = cargado
  const [outfitNotif, setOutfitNotif] = useState({ van: null, martin: null });
  const [togglingOutfit, setTogglingOutfit] = useState({ van: false, martin: false });

  // Estado del toggle de calendario para este dispositivo
  // null = no cargado, true/false = estado real; undefined calendar_notif_enabled = true (opt-out)
  const [calendarNotif, setCalendarNotif] = useState(null); // { registered, enabled }
  const [togglingCalendar, setTogglingCalendar] = useState(false);

  // Estado del toggle de poni para este dispositivo
  const [poniNotif, setPoniNotif] = useState(null); // null=no cargado, { registered, enabled, userKey }
  const [togglingPoni, setTogglingPoni] = useState(false);

  // Horas de silencio de este dispositivo ('' = sin configurar)
  const [quiet, setQuiet] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!configOpen) return;
    const deviceId = getOrCreateDeviceId();
    Promise.all([
      getOutfitNotificationStatus('van', deviceId).catch(() => null),
      getOutfitNotificationStatus('martin', deviceId).catch(() => null),
      getDeviceStatus(deviceId, 'ambos').catch(() => null),
    ]).then(([van, martin, deviceStatus]) => {
      setOutfitNotif({ van, martin });
      setQuiet({
        start: deviceStatus?.quiet_start ?? '',
        end: deviceStatus?.quiet_end ?? '',
      });
      if (deviceStatus?.exists) {
        setCalendarNotif({
          registered: true,
          enabled: deviceStatus.calendar_notif_enabled !== false,
        });
      } else {
        setCalendarNotif({ registered: false, enabled: false });
      }
      // Buscar poni_notif_enabled en cualquier suscripción existente
      const poniSub = [
        van   && { ...van,   userKey: 'van' },
        martin && { ...martin, userKey: 'martin' },
        deviceStatus && { ...deviceStatus, userKey: 'ambos' },
      ].find(s => s?.exists);
      if (poniSub) {
        setPoniNotif({ registered: true, enabled: !!poniSub.poni_notif_enabled, userKey: poniSub.userKey });
      } else {
        setPoniNotif({ registered: false, enabled: false, userKey: 'ambos' });
      }
    });
  }, [configOpen]);

  const toggleOutfit = async (userKey) => {
    const current = outfitNotif[userKey];
    if (!current?.exists) return;
    setTogglingOutfit(prev => ({ ...prev, [userKey]: true }));
    const newEnabled = !current.enabled;
    try {
      await updateOutfitNotificationSettings({
        user_key: userKey,
        device_id: getOrCreateDeviceId(),
        enabled: newEnabled,
      });
      setOutfitNotif(prev => ({ ...prev, [userKey]: { ...prev[userKey], enabled: newEnabled } }));
      window.dispatchEvent(new CustomEvent('outfit-notif-changed', { detail: { userKey } }));
    } finally {
      setTogglingOutfit(prev => ({ ...prev, [userKey]: false }));
    }
  };

  const toggleAll = async () => {
    const anyActive = subscribed || outfitNotif.van?.enabled || outfitNotif.martin?.enabled;
    if (anyActive) {
      if (subscribed) await unsubscribe();
      for (const userKey of ['van', 'martin']) {
        if (outfitNotif[userKey]?.exists && outfitNotif[userKey]?.enabled) {
          await updateOutfitNotificationSettings({
            user_key: userKey,
            device_id: getOrCreateDeviceId(),
            enabled: false,
          });
          setOutfitNotif(prev => ({ ...prev, [userKey]: { ...prev[userKey], enabled: false } }));
          window.dispatchEvent(new CustomEvent('outfit-notif-changed', { detail: { userKey } }));
        }
      }
    } else {
      if (!subscribed && supported && permission !== 'denied') await subscribe();
      for (const userKey of ['van', 'martin']) {
        if (outfitNotif[userKey]?.exists && !outfitNotif[userKey]?.enabled) {
          await updateOutfitNotificationSettings({
            user_key: userKey,
            device_id: getOrCreateDeviceId(),
            enabled: true,
          });
          setOutfitNotif(prev => ({ ...prev, [userKey]: { ...prev[userKey], enabled: true } }));
          window.dispatchEvent(new CustomEvent('outfit-notif-changed', { detail: { userKey } }));
        }
      }
    }
  };

  const toggleCalendar = async () => {
    if (!calendarNotif?.registered) return;
    setTogglingCalendar(true);
    const newEnabled = !calendarNotif.enabled;
    try {
      await updateDeviceSettings({
        device_id: getOrCreateDeviceId(),
        user_key: 'ambos',
        calendar_notif_enabled: newEnabled,
      });
      setCalendarNotif(prev => ({ ...prev, enabled: newEnabled }));
    } finally {
      setTogglingCalendar(false);
    }
  };

  const togglePoni = async () => {
    if (!poniNotif?.registered) return;
    setTogglingPoni(true);
    const newEnabled = !poniNotif.enabled;
    try {
      await updateDeviceSettings({
        device_id: getOrCreateDeviceId(),
        user_key: poniNotif.userKey,
        poni_notif_enabled: newEnabled,
      });
      setPoniNotif(prev => ({ ...prev, enabled: newEnabled }));
    } finally {
      setTogglingPoni(false);
    }
  };

  const changeQuiet = async (field, value) => {
    setQuiet((prev) => ({ ...prev, [field]: value }));
    try {
      await updateDeviceSettings({
        device_id: getOrCreateDeviceId(),
        user_key: 'ambos',
        [field === 'start' ? 'quiet_start' : 'quiet_end']: value || null,
      });
    } catch { /* se reintenta al volver a abrir el menú */ }
  };

  const clearQuiet = async () => {
    setQuiet({ start: '', end: '' });
    try {
      await updateDeviceSettings({
        device_id: getOrCreateDeviceId(),
        user_key: 'ambos',
        quiet_start: null,
        quiet_end: null,
      });
    } catch { /* idem */ }
  };

  const anyNotifActive = subscribed || outfitNotif.van?.enabled || outfitNotif.martin?.enabled;
  const hasOutfitSubs = outfitNotif.van?.exists || outfitNotif.martin?.exists;

  useEffect(() => {
    if (!configOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setConfigOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [configOpen]);

  useEffect(() => {
    const el = linksRef.current;
    if (!el) return;
    const update = () => {
      setFadeLeft(el.scrollLeft > 4);
      setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Auto-scroll al item activo cuando cambia la ruta (ej: swipe)
  useEffect(() => {
    const el = linksRef.current;
    if (!el) return;
    const activeLi = el.querySelector('a.active')?.closest('li');
    if (!activeLi) return;
    const liLeft   = activeLi.offsetLeft;
    const liWidth  = activeLi.offsetWidth;
    const elWidth  = el.clientWidth;
    const target   = liLeft - (elWidth - liWidth) / 2;
    el.scrollTo({ left: target, behavior: 'smooth' });
  }, [location.pathname]);

  const navClass = [
    'navbar',
    fadeLeft  ? 'navbar--fade-left'  : '',
    fadeRight ? 'navbar--fade-right' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <nav className={navClass}>
        {/* Marca / título (solo visible en desktop) */}
        <Link to="/" className="navbar__brand">
          <img src="/icons/icono-app.png" alt="" className="navbar__brand-icon" />
          Nuestro Mapita
        </Link>

        {/* Links de navegación — envueltos en un div que maneja los fades */}
        <div className="navbar__scroll-area">
          <ul className="navbar__links" ref={linksRef}>
            {links.map(({ to, label, icon, iconImg }) => (
              <li key={to} data-to={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}
                >
                  <span className="navbar__link-icon">
                    {iconImg ? <img src={iconImg} alt="" className="navbar__link-icon-img" /> : icon}
                  </span>
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Campanita de notificaciones in-app */}
        <NotificationBell />

        {/* Config — fuera del ul para que iOS no recorte el touch */}
        <div className="navbar__config-wrap">
          <button
            className="navbar__logout"
            onClick={() => setConfigOpen((v) => !v)}
            title="Configuración"
          >
            <span className="navbar__link-icon">
              <img src={`${S}configuracion.webp`} alt="" className="navbar__link-icon-img" />
            </span>
            <span>Config</span>
          </button>
          {configOpen && (
            <>
              <div className="navbar__config-backdrop" onClick={() => setConfigOpen(false)} />
              <div className="navbar__config-menu">

                {/* Todas las notificaciones — solo si hay alguna configurada */}
                {(supported && permission !== 'denied' && (subscribed || hasOutfitSubs)) && (
                  <button className="navbar__config-item" onClick={toggleAll}>
                    <img src={anyNotifActive ? `${C}notificaciones.webp` : `${C}notificacion-desactivada.webp`} alt="" className="navbar__config-icon" />
                    <span>{anyNotifActive ? 'Silenciar todas las notificaciones' : 'Activar todas las notificaciones'}</span>
                  </button>
                )}

                {/* Notificaciones de cartitas */}
                {supported && permission !== 'denied' && (
                  <button
                    className="navbar__config-item"
                    onClick={subscribed ? unsubscribe : subscribe}
                  >
                    <img src={`${C}cartitas.webp`} alt="" className="navbar__config-icon" />
                    <span>{subscribed ? 'Desactivar notificaciones de cartitas' : 'Activar notificaciones de cartitas'}</span>
                  </button>
                )}

                {/* Notificaciones de calendario */}
                {calendarNotif?.registered && (
                  <button
                    className="navbar__config-item"
                    onClick={toggleCalendar}
                    disabled={togglingCalendar}
                  >
                    <img src={`${C}calendario.webp`} alt="" className="navbar__config-icon" />
                    <span>{calendarNotif.enabled ? 'Desactivar notificaciones de calendario' : 'Activar notificaciones de calendario'}</span>
                  </button>
                )}

                {/* Notificaciones de outfits por usuario */}
                {outfitNotif.van?.exists && (
                  <button
                    className="navbar__config-item"
                    onClick={() => toggleOutfit('van')}
                    disabled={togglingOutfit.van}
                  >
                    <img src={`${C}outfit-van.webp`} alt="" className="navbar__config-icon" />
                    <span>{outfitNotif.van.enabled ? 'Desactivar outfit de Van' : 'Activar outfit de Van'}</span>
                  </button>
                )}
                {outfitNotif.martin?.exists && (
                  <button
                    className="navbar__config-item"
                    onClick={() => toggleOutfit('martin')}
                    disabled={togglingOutfit.martin}
                  >
                    <img src={`${C}outfit-martin.webp`} alt="" className="navbar__config-icon" />
                    <span>{outfitNotif.martin.enabled ? 'Desactivar outfit de Martín' : 'Activar outfit de Martín'}</span>
                  </button>
                )}

                {/* Notificaciones de poni */}
                {poniNotif?.registered && (
                  <button
                    className="navbar__config-item"
                    onClick={togglePoni}
                    disabled={togglingPoni}
                  >
                    <span className="navbar__config-icon-emoji">🐴</span>
                    <span>{poniNotif.enabled ? 'Desactivar notificaciones de poni' : 'Activar notificaciones de poni'}</span>
                  </button>
                )}

                {/* Horas de silencio: sin push en este rango, pero queda en la campanita */}
                {(calendarNotif?.registered || hasOutfitSubs) && (
                  <div className="navbar__config-quiet">
                    <div className="navbar__config-quiet-label">
                      <span>🌙</span>
                      <span>Horas de silencio</span>
                      {quiet.start && quiet.end && (
                        <button className="navbar__config-quiet-clear" onClick={clearQuiet} title="Quitar horas de silencio">
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="navbar__config-quiet-inputs">
                      <input
                        type="time"
                        value={quiet.start}
                        onChange={(e) => changeQuiet('start', e.target.value)}
                        aria-label="Inicio del silencio"
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={quiet.end}
                        onChange={(e) => changeQuiet('end', e.target.value)}
                        aria-label="Fin del silencio"
                      />
                    </div>
                  </div>
                )}

                <button
                  className="navbar__config-item navbar__config-item--danger"
                  onClick={() => setConfirming(true)}
                >
                  <span>↩</span>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {confirming && (
        <div className="logout-overlay" onClick={() => setConfirming(false)}>
          <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="logout-dialog__text">¿Salir de la app?</p>
            <div className="logout-dialog__actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button className="btn btn-rose btn-sm" onClick={logout}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
