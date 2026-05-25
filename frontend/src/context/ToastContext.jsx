import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

const RESOLVE_DURATION = 15000;
const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message, type, duration = DEFAULT_DURATION) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const loading = useCallback((message) => add(message, 'loading', 0), [add]);

  const resolve = useCallback((id, message) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, message, type: 'success' } : t));
    setTimeout(() => remove(id), RESOLVE_DURATION);
  }, [remove]);

  const reject = useCallback((id, message) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, message, type: 'error' } : t));
    setTimeout(() => remove(id), RESOLVE_DURATION);
  }, [remove]);

  const toast = {
    error:   (msg) => add(msg, 'error'),
    success: (msg) => add(msg, 'success'),
    loading,
    resolve,
    reject,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.type}`}>
              {t.type === 'loading' && <span className="toast__spinner" aria-hidden="true" />}
              <span className="toast__message">{t.message}</span>
              <button className="toast__close" onClick={() => remove(t.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
