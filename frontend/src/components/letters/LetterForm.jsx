import { useState, useRef, useEffect } from 'react';
import { createLetter, updateLetter, uploadLetterPhoto } from '../../api/letters';
import { useToast } from '../../context/ToastContext';

const EMPTY_FORM = { title: '', body: '', letter_date: '' };

export default function LetterForm({ initialData = null, onSaved, onClose, onCancel, onDirtyChange, submitRef }) {
  const formRef = useRef();
  const toast = useToast();

  useEffect(() => {
    if (submitRef) submitRef.current = () => formRef.current?.requestSubmit();
  }, []);

  const [form, setForm] = useState(
    initialData
      ? { title: initialData.title, body: initialData.body, letter_date: initialData.letter_date || '' }
      : EMPTY_FORM
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState('');

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    onDirtyChange?.(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('El título es obligatorio');
    if (!form.body.trim()) return setError('El mensaje es obligatorio');

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      letter_date: form.letter_date || null,
    };

    onClose?.();
    const tid = toast.loading('Guardando cartita...');
    try {
      let saved = initialData
        ? await updateLetter(initialData.id, payload)
        : await createLetter(payload);
      if (photoFile) await uploadLetterPhoto(saved.id, photoFile);
      toast.resolve(tid, initialData ? 'Cartita actualizada' : 'Cartita guardada');
      onSaved?.();
    } catch (err) {
      toast.reject(tid, 'No se pudo guardar: ' + err.message);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Título *</label>
        <input
          className="form-input"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Para mi amor..."
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Mensaje *</label>
        <textarea
          className="form-textarea"
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder="Escribí lo mucho que me amas y esas cosas lindas..."
          rows={6}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Fecha (opcional)</label>
        <input
          className="form-input"
          type="date"
          value={form.letter_date}
          onChange={(e) => set('letter_date', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Foto (opcional)</label>
        <input
          type="file"
          accept="image/*"
          className="form-input"
          onChange={(e) => { setPhotoFile(e.target.files[0] || null); onDirtyChange?.(true); }}
          style={{ padding: '8px' }}
        />
        {initialData?.photo_url && !photoFile && (
          <p className="form-hint">Ya tiene una foto. Seleccioná otra para reemplazarla.</p>
        )}
      </div>

      <div className="letter-form__actions">
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {initialData ? 'Guardar cambios' : 'Escribir cartita'}
        </button>
      </div>
    </form>
  );
}
