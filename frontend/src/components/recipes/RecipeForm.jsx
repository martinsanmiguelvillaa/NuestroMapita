import { useState, useRef, useEffect } from 'react';
import { createRecipe, updateRecipe, uploadRecipePhoto, deleteRecipePhoto } from '../../api/recipes';
import { useToast } from '../../context/ToastContext';

const EMPTY_FORM = {
  title: '',
  category: 'salado',
  ingredients: '',
  steps: '',
  video_url: '',
  notes: '',
};

/**
 * Formulario para crear o editar una receta.
 * Si `initialData` está presente, modo edición.
 * `onSaved(recipe)` se llama con la receta guardada.
 */
export default function RecipeForm({ initialData = null, onSaved, onClose, onCancel, onDirtyChange, submitRef }) {
  const formRef = useRef();
  const toast = useToast();

  useEffect(() => {
    if (submitRef) submitRef.current = () => formRef.current?.requestSubmit();
  }, []);

  const [form, setForm] = useState(
    initialData
      ? {
          title: initialData.title || '',
          category: initialData.category || EMPTY_FORM.category,
          ingredients: initialData.ingredients || '',
          steps: initialData.steps || '',
          video_url: initialData.video_url || '',
          notes: initialData.notes || '',
        }
      : EMPTY_FORM,
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.image_url || null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    onDirtyChange?.(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    onDirtyChange?.(true);
  };

  const handleDeletePhoto = async () => {
    setDeletingPhoto(true);
    try {
      await deleteRecipePhoto(initialData.id);
      setPhotoPreview(null);
      setPhotoFile(null);
    } catch (err) {
      toast.error('No se pudo eliminar la foto: ' + err.message);
    } finally {
      setDeletingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('El título es obligatorio');
    if (!form.ingredients.trim()) return setError('Los ingredientes son obligatorios');
    if (!form.steps.trim()) return setError('La preparación es obligatoria');
    if (form.video_url.trim() && !form.video_url.trim().startsWith('http')) {
      return setError('El link de video debe ser una URL válida (http...)');
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      ingredients: form.ingredients.trim(),
      steps: form.steps.trim(),
      video_url: form.video_url.trim() || null,
      notes: form.notes.trim() || null,
    };

    onClose?.();
    const tid = toast.loading('Guardando receta...');
    try {
      let saved = initialData?.id
        ? await updateRecipe(initialData.id, payload)
        : await createRecipe(payload);
      if (photoFile) saved = await uploadRecipePhoto(saved.id, photoFile);
      toast.resolve(tid, initialData?.id ? 'Receta actualizada' : 'Receta guardada');
      onSaved?.(saved);
    } catch (err) {
      toast.reject(tid, 'No se pudo guardar: ' + err.message);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Título */}
      <div className="form-group">
        <label className="form-label">Título *</label>
        <input
          className="form-input"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ramencito, Brownie de chocolate..."
          required
        />
      </div>

      {/* Categoría */}
      <div className="form-group">
        <label className="form-label">Categoría *</label>
        <div className="recipe-form__category-options">
          <label className={`recipe-form__cat-btn${form.category === 'salado' ? ' selected' : ''}`}>
            <input
              type="radio"
              name="category"
              value="salado"
              checked={form.category === 'salado'}
              onChange={() => set('category', 'salado')}
            />
            🧂 Salado
          </label>
          <label className={`recipe-form__cat-btn${form.category === 'dulce' ? ' selected' : ''}`}>
            <input
              type="radio"
              name="category"
              value="dulce"
              checked={form.category === 'dulce'}
              onChange={() => set('category', 'dulce')}
            />
            🍰 Dulce
          </label>
        </div>
      </div>

      {/* Foto */}
      <div className="form-group">
        <label className="form-label">Foto (opcional)</label>

        {/* Foto existente en modo edición */}
        {initialData?.id && photoPreview && !photoFile && (
          <div className="form-photo-preview">
            <img
              src={photoPreview}
              alt="Foto de la receta"
              className="form-photo-preview__img"
              onClick={() => window.open(photoPreview, '_blank')}
              title="Ver foto completa"
            />
            <div className="form-photo-preview__actions">
              <a
                href={photoPreview}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                Ver foto
              </a>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeletePhoto}
                disabled={deletingPhoto}
              >
                {deletingPhoto ? '...' : 'Eliminar foto'}
              </button>
            </div>
          </div>
        )}

        {/* Preview de nueva foto seleccionada */}
        {photoFile && photoPreview && (
          <img
            src={photoPreview}
            alt="preview"
            className="recipe-form__photo-preview"
          />
        )}

        <input
          type="file"
          accept="image/*"
          className="form-input"
          onChange={handlePhotoChange}
          style={{ padding: '8px' }}
        />
        {initialData?.id && photoPreview && !photoFile && (
          <p className="form-hint">Seleccioná otra foto para reemplazar la actual.</p>
        )}
      </div>

      {/* Ingredientes */}
      <div className="form-group">
        <label className="form-label">Ingredientes * <span className="form-hint">(uno por línea)</span></label>
        <textarea
          className="form-textarea"
          value={form.ingredients}
          onChange={(e) => set('ingredients', e.target.value)}
          placeholder={"-Azucar\n-Flores\n-Y mucho colores\n..."}
          rows={6}
          required
        />
      </div>

      {/* Preparación */}
      <div className="form-group">
        <label className="form-label">Preparación *</label>
        <textarea
          className="form-textarea"
          value={form.steps}
          onChange={(e) => set('steps', e.target.value)}
          placeholder={"Tirar un poco de polvo de hadas\nDarle un besito a tu mujer porque se lo re merece\n..."}
          rows={8}
          required
        />
      </div>

      {/* Link de video */}
      <div className="form-group">
        <label className="form-label">Link de video (opcional)</label>
        <input
          className="form-input"
          type="url"
          value={form.video_url}
          onChange={(e) => set('video_url', e.target.value)}
          placeholder="https://youtube.com/..."
        />
      </div>

      {/* Notas */}
      <div className="form-group">
        <label className="form-label">Notas (opcional)</label>
        <textarea
          className="form-textarea"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Tips, variantes, cómo mejorarla, un mensajito de amor..."
          rows={3}
        />
      </div>

      {/* Acciones */}
      <div className="letter-form__actions">
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {initialData?.id ? 'Guardar cambios' : 'Agregar receta'}
        </button>
      </div>
    </form>
  );
}
