import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getOpenModalCount } from '../components/ui/Modal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false });

  const confirm = useCallback(({ title, message, confirmLabel = 'Confirmar', danger = false }) => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, confirmLabel, danger, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve(true);
    setState({ open: false });
  };

  const handleCancel = () => {
    state.resolve(false);
    setState({ open: false });
  };

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleCancel(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (getOpenModalCount() === 0) document.body.style.overflow = '';
    };
  }, [state.open]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            {state.title && <p className="confirm-dialog__title">{state.title}</p>}
            {state.message && <p className="confirm-dialog__message">{state.message}</p>}
            <div className="confirm-dialog__actions">
              <button className="btn btn-ghost" onClick={handleCancel}>
                Cancelar
              </button>
              <button
                className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleConfirm}
                autoFocus
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
