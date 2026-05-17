import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../styles/modal.css';

function UnsavedDialog({ onSave, onDiscard, onCancel }) {
  return (
    <div className="unsaved-overlay" onClick={onCancel}>
      <div className="unsaved-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="unsaved-dialog__text">Tenés cambios sin guardar</p>
        <div className="unsaved-dialog__actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-outline btn-sm" onClick={onDiscard}>No guardar</button>
          <button className="btn btn-primary btn-sm" onClick={onSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

export function useDirtyForm() {
  const [isDirty, setIsDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const submitRef = useRef(null);
  const pendingClose = useRef(null);

  const setDirty = useCallback((val) => setIsDirty(val), []);

  const handleAttemptClose = useCallback(
    (closeCallback) => {
      if (!isDirty) { closeCallback(); return; }
      pendingClose.current = closeCallback;
      setDialogOpen(true);
    },
    [isDirty],
  );

  const handleSave = useCallback(() => {
    setDialogOpen(false);
    submitRef.current?.();
  }, []);

  const handleDiscard = useCallback(() => {
    setDialogOpen(false);
    setIsDirty(false);
    const cb = pendingClose.current;
    pendingClose.current = null;
    cb?.();
  }, []);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    pendingClose.current = null;
  }, []);

  const dialog = dialogOpen
    ? createPortal(
        <UnsavedDialog onSave={handleSave} onDiscard={handleDiscard} onCancel={handleCancel} />,
        document.body,
      )
    : null;

  return { isDirty, setDirty, submitRef, handleAttemptClose, dialog };
}
