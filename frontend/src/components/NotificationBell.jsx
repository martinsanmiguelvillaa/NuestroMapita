/**
 * NotificationBell - Campanita de notificaciones in-app.
 *
 * - Badge con la cantidad de no-leídas (polling cada 60s + al volver a foco).
 * - Panel desplegable con el historial: marcar leída, marcar todas, navegar al link.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  dismissNotification,
} from '../api/notifications';
import '../styles/notifications.css';

const POLL_MS = 60_000;

const TYPE_ICONS = {
  calendar_reminder: '/icons/iconos-secciones/calendario.webp',
  outfit_daily: '/icons/iconos-secciones/clima-en-outfits.webp',
  cartita_new: '/icons/iconos-secciones/cartitas.webp',
};

function timeAgo(dateStr) {
  // El backend guarda en UTC sin sufijo Z: lo agregamos para parsear bien
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ayer';
  if (diffD < 7) return `hace ${diffD} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null); // null = cargando
  const wrapRef = useRef(null);

  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then((data) => setUnread(data?.count ?? 0))
      .catch(() => {});
  }, []);

  // Polling del contador + refetch al volver a foco
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCount]);

  // Cargar lista al abrir
  useEffect(() => {
    if (!open) return;
    setItems(null);
    getNotifications()
      .then(setItems)
      .catch(() => setItems([]));
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleItemClick = async (notif) => {
    if (!notif.read_at) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnread((c) => Math.max(0, c - 1));
      markRead(notif.id).catch(() => {});
    }
    if (notif.url) {
      setOpen(false);
      navigate(notif.url);
    }
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    markAllRead().catch(() => {});
  };

  const handleDismiss = (e, notif) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((n) => n.id !== notif.id));
    if (!notif.read_at) setUnread((c) => Math.max(0, c - 1));
    dismissNotification(notif.id).catch(() => {});
  };

  return (
    <div className="notif-bell" ref={wrapRef}>
      <button
        className="notif-bell__btn"
        onClick={() => setOpen((v) => !v)}
        title="Notificaciones"
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ''}`}
      >
        <span className="notif-bell__icon" aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="notif-bell__backdrop" onClick={() => setOpen(false)} />
          <div className="notif-bell__panel">
            <div className="notif-bell__header">
              <span className="notif-bell__title">Notificaciones</span>
              {unread > 0 && (
                <button className="notif-bell__mark-all" onClick={handleMarkAll}>
                  Marcar todas leídas
                </button>
              )}
            </div>

            <div className="notif-bell__list">
              {items === null && (
                <p className="notif-bell__empty">Cargando…</p>
              )}
              {items?.length === 0 && (
                <p className="notif-bell__empty">No hay notificaciones todavía 💌</p>
              )}
              {items?.map((notif) => (
                <button
                  key={notif.id}
                  className={`notif-bell__item${notif.read_at ? '' : ' notif-bell__item--unread'}`}
                  onClick={() => handleItemClick(notif)}
                >
                  {TYPE_ICONS[notif.type] ? (
                    <img src={TYPE_ICONS[notif.type]} alt="" className="notif-bell__item-icon" />
                  ) : (
                    <span className="notif-bell__item-icon notif-bell__item-icon--emoji">📌</span>
                  )}
                  <span className="notif-bell__item-content">
                    <span className="notif-bell__item-title">{notif.title}</span>
                    {notif.body && <span className="notif-bell__item-body">{notif.body}</span>}
                    <span className="notif-bell__item-time">{timeAgo(notif.created_at)}</span>
                  </span>
                  {!notif.read_at && <span className="notif-bell__item-dot" />}
                  <span
                    className="notif-bell__item-dismiss"
                    role="button"
                    aria-label="Descartar"
                    onClick={(e) => handleDismiss(e, notif)}
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
