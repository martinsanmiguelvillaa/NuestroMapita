import { useState, useEffect, useCallback } from 'react';
import { getLetters } from '../api/letters';
import Modal from '../components/ui/Modal';
import LetterCard from '../components/letters/LetterCard';
import LetterForm from '../components/letters/LetterForm';
import { useDirtyForm } from '../hooks/useDirtyForm';
import { useToast } from '../context/ToastContext';
import '../styles/letters.css';

export default function Letters() {
  const toast = useToast();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const addForm = useDirtyForm();

  const load = useCallback(async (signal) => {
    try {
      const data = await getLetters(signal);
      setLetters(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('No se pudieron cargar las cartitas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="letters-bg">
    <div className="container">
      {/* Cabecera */}
      <div className="section-header">
        <h1 className="section-header__title">Cartitas</h1>
        <button className="btn btn-rose" onClick={() => setShowForm(true)}>
          + Escribir cartita
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="loading-state">Cargando...</div>
      ) : letters.length === 0 ? (
        <div className="empty-state">
          <p>Todavía no hay cartitas.</p>
          <button className="btn btn-rose" onClick={() => setShowForm(true)}>
            Escribir la primera
          </button>
        </div>
      ) : (
        <div className="letters-grid">
          {letters.map((letter) => (
            <LetterCard key={letter.id} letter={letter} onChanged={load} />
          ))}
        </div>
      )}

      {/* Modal nueva cartita */}
      <Modal
        isOpen={showForm}
        onClose={() => addForm.handleAttemptClose(() => setShowForm(false))}
        title="Nueva cartita"
        fullscreen
        isDirty={addForm.isDirty}
      >
        <LetterForm
          onClose={() => { addForm.setDirty(false); setShowForm(false); }}
          onSaved={() => load()}
          onCancel={() => addForm.handleAttemptClose(() => setShowForm(false))}
          onDirtyChange={addForm.setDirty}
          submitRef={addForm.submitRef}
        />
      </Modal>
      {addForm.dialog}
    </div>
    </div>
  );
}
