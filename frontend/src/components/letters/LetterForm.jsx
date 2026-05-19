import { useState, useRef, useEffect } from 'react';
import { createLetter, updateLetter, uploadLetterPhoto } from '../../api/letters';

const EMPTY_FORM = { title: '', body: '', letter_date: '' };

export default function LetterForm({ initialData = null, onSaved, onCancel, onDirtyChange, submitRef }) {
  const formRef = useRef();

  useEffect(() => {
    if (submitRef) submitRef.current = () => formRef.current?.requestSubmit();
  }, []);

  const [form, setForm] = useState(
    initialData
      ? { title: initialData.title, body: initialData.body, letter_date: initialData.letter_date || '' }
      : EMPTY_FORM
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        letter_date: form.letter_date || null,
      };

      let saved;
      if (initialData) {
        saved = await updateLetter(initialData.id, payload);
      } else {
        saved = await createLetter(payload);
      }

      // Si hay foto seleccionada, subirla
      if (photoFile) {
        await uploadLetterPhoto(saved.id, photoFile);
      }

      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          placeholder="Escribí lo que querés decir..."
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
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : initialData ? 'Guardar cambios' : 'Escribir cartita'}
        </button>
      </div>
    </form>
  );
}
