import { useState } from 'react';
import Modal from '../ui/Modal';
import LetterForm from './LetterForm';
import { deleteLetter } from '../../api/letters';
import { toast } from 'sonner';
import { scheduleDeletion, cancelDeletion } from '../../utils/pendingDeletions';
import { useDirtyForm } from '../../hooks/useDirtyForm';
import '../../styles/letters.css';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Tarjeta de cartita con vista completa, edición y eliminación.
 */
export default function LetterCard({ letter, onChanged }) {
  const [deleted, setDeleted] = useState(false);
  const [open, setOpen] = useState(false);      // Ver completa
  const [editing, setEditing] = useState(false); // Formulario de edición
  const editForm = useDirtyForm();

  const handleDelete = () => {
    setDeleted(true);
    const key = `letter-${letter.id}`;
    scheduleDeletion(key, async () => {
      await deleteLetter(letter.id);
      onChanged?.();
    });
    toast.success('Cartita eliminada', {
      duration: 5000,
      action: { label: 'Deshacer', onClick: () => { if (cancelDeletion(key)) setDeleted(false); } },
    });
  };

  if (deleted) return null;

  return (
    <>
      {/* Tarjeta compacta */}
      <div className="letter-card fade-in" onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>
        {letter.photo_url && (
          <img src={letter.photo_url} alt="" className="letter-card__photo" />
        )}
        <div className="letter-card__header">
          <h3 className="letter-card__title">{letter.title}</h3>
          {letter.letter_date && (
            <span className="letter-card__date">{formatDate(letter.letter_date)}</span>
          )}
        </div>
        <p className="letter-card__body">{letter.body}</p>
        <div className="letter-card__footer" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Modal: ver completa */}
      <Modal
        isOpen={open && !editing}
        onClose={() => setOpen(false)}
        title={letter.title}
        fullscreen
      >
        {letter.photo_url && (
          <img
            src={letter.photo_url}
            alt=""
            style={{ width: '100%', borderRadius: '12px', marginBottom: '16px', objectFit: 'cover', maxHeight: '240px' }}
          />
        )}
        {letter.letter_date && (
          <p className="letter-full__date">{formatDate(letter.letter_date)}</p>
        )}
        <p className="letter-full">{letter.body}</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setOpen(false); setEditing(true); }}>
            Editar
          </button>
        </div>
      </Modal>

      {/* Modal: edición */}
      <Modal
        isOpen={editing}
        onClose={() => editForm.handleAttemptClose(() => setEditing(false))}
        title="Editar cartita"
        fullscreen
        isDirty={editForm.isDirty}
      >
        <LetterForm
          initialData={letter}
          onClose={() => { editForm.setDirty(false); setEditing(false); }}
          onSaved={() => onChanged?.()}
          onCancel={() => editForm.handleAttemptClose(() => setEditing(false))}
          onDirtyChange={editForm.setDirty}
          submitRef={editForm.submitRef}
        />
      </Modal>
      {editForm.dialog}
    </>
  );
}
