import { useState, useEffect, useCallback, useRef } from 'react';
import { upsertEmotionalEntry, updateEmotionalEntry, getEmotionalEntries, deleteEmotionalEntry } from '../api/emotional';
import { toast } from 'sonner';
import { scheduleDeletion, cancelDeletion } from '../utils/pendingDeletions';
import '../styles/emocionario.css';

export const EMOTIONS = [
  { key: 'quiero-un-poni', labelM: 'Quiero un poni', labelF: 'Quiero un poni', img: '/icons/emocionario/quiero-un-poni.png' },
  { key: 'feliz',       labelM: 'Feliz',        labelF: 'Feliz',        img: '/icons/emocionario/feliz.webp' },
  { key: 'enamorado',   labelM: 'Enamorado',    labelF: 'Enamorada',    img: '/icons/emocionario/enamorada.webp' },
  { key: 'tranquilo',   labelM: 'Tranquilo',    labelF: 'Tranquila',    img: '/icons/emocionario/tranquila.webp' },
  { key: 'emocionado',  labelM: 'Emocionado',   labelF: 'Emocionada',   img: '/icons/emocionario/emocionada.webp' },
  { key: 'agradecido',  labelM: 'Agradecido',   labelF: 'Agradecida',   img: '/icons/emocionario/agradecida.webp' },
  { key: 'nostalgico',  labelM: 'Nostálgico',   labelF: 'Nostálgica',   img: '/icons/emocionario/nostalgica.webp' },
  { key: 'ansioso',     labelM: 'Ansioso',      labelF: 'Ansiosa',      img: '/icons/emocionario/ansiosa.webp' },
  { key: 'triste',      labelM: 'Triste',       labelF: 'Triste',       img: '/icons/emocionario/triste.webp' },
  { key: 'cansado',     labelM: 'Cansado',      labelF: 'Cansada',      img: '/icons/emocionario/cansada.webp' },
  { key: 'estresado',   labelM: 'Estresado',    labelF: 'Estresada',    img: '/icons/emocionario/estresada.webp' },
  { key: 'irritado',    labelM: 'Irritado',     labelF: 'Irritada',     img: '/icons/emocionario/irritada.webp' },
  { key: 'solo',        labelM: 'Solo',         labelF: 'Sola',         img: '/icons/emocionario/sola.webp' },
  { key: 'confundido',  labelM: 'Confundido',   labelF: 'Confundida',   img: '/icons/emocionario/confundida.webp' },
  { key: 'asustado',    labelM: 'Asustado',     labelF: 'Asustada',     img: '/icons/emocionario/asustada.webp' },
  { key: 'orgulloso',   labelM: 'Orgulloso',    labelF: 'Orgullosa',    img: '/icons/emocionario/orgullosa.webp' },
];

function emotionLabel(em, userKey) {
  return userKey === 'van' ? em.labelF : em.labelM;
}

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map((e) => [e.key, e]));

const USERS = [
  { key: 'van',    label: 'Van',    avatar: '/icons/icono-van.webp' },
  { key: 'martin', label: 'Martín', avatar: '/icons/icono-martin.webp' },
];

const INTENSITY_LABELS = ['', 'Leve', 'Suave', 'Medio', 'Intenso', 'Muy intenso'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// Formulario rápido
// ─────────────────────────────────────────────
function playPoniVideo() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;';
  const video = document.createElement('video');
  video.src = '/video-quiero-un-poni.mp4';
  video.playsInline = true;
  video.style.cssText = 'width:100%;height:100%;object-fit:contain;';
  video.onended = () => overlay.remove();
  video.onerror = () => overlay.remove();
  overlay.onclick = () => overlay.remove();
  overlay.appendChild(video);
  document.body.appendChild(overlay);
  video.play().catch(() => overlay.remove());
}

export function EmotionForm({ onSaved, onClose, prefill, onDirtyChange }) {
  const [userKey, setUserKey]         = useState(prefill?.userKey ?? 'van');
  const [date, setDate]               = useState(prefill?.entry?.date ?? todayISO());
  const [emotionKeys, setEmotionKeys] = useState(() =>
    prefill?.entry?.emotion_key ? new Set([prefill.entry.emotion_key]) : new Set()
  );
  const [intensity, setIntensity]     = useState(prefill?.entry?.intensity ?? 3);
  const [note, setNote]               = useState(prefill?.entry?.note ?? '');
  const [saving, setSaving]           = useState(false);
  const isEditing = !!prefill?.entry?.id;

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    const dirty = emotionKeys.size > 0 || note.trim() !== '';
    onDirtyChange?.(dirty);
  }, [emotionKeys, note, onDirtyChange]);

  const toggleEmotion = (key) => {
    if (isEditing) {
      setEmotionKeys(new Set([key]));
    } else {
      setEmotionKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emotionKeys.size === 0) return;
    const hasPoni = !isEditing && emotionKeys.has('quiero-un-poni');
    if (hasPoni) playPoniVideo();
    setSaving(true);
    try {
      if (isEditing) {
        const [emotionKey] = emotionKeys;
        await updateEmotionalEntry(prefill.entry.id, {
          emotion_key: emotionKey,
          intensity:   Math.round(intensity),
          note:        note || null,
        });
        toast.success('Emoción actualizada');
      } else {
        for (const key of emotionKeys) {
          await upsertEmotionalEntry({
            user_key:    userKey,
            date,
            emotion_key: key,
            intensity:   Math.round(intensity),
            note:        note || null,
          });
        }
        const count = emotionKeys.size;
        toast.success(count === 1 ? 'Emoción guardada' : `${count} emociones guardadas`);
        setEmotionKeys(new Set());
        setNote('');
        onClose?.();
      }
      await onSavedRef.current();
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const today = todayISO();

  const submitLabel = saving
    ? 'Guardando…'
    : isEditing
    ? 'Actualizar emoción'
    : emotionKeys.size > 1
    ? `Guardar ${emotionKeys.size} emociones`
    : 'Guardar emoción';

  return (
    <form className="emoc-form" onSubmit={handleSubmit}>
      <h2 className="emoc-form__title">{isEditing ? 'Editar emoción' : '¿Qué sentiste?'}</h2>

      {!isEditing && (
        <div className="emoc-form__users">
          {USERS.map((u) => (
            <button key={u.key} type="button"
              className={`emoc-form__user-btn${userKey === u.key ? ' emoc-form__user-btn--active' : ''}`}
              onClick={() => setUserKey(u.key)}>
              <img src={u.avatar} alt={u.label} className="emoc-form__user-avatar" /><span>{u.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="emoc-form__date-row">
        <label className="emoc-form__label">Fecha</label>
        <input type="date" className="emoc-form__date" value={date} max={today}
          disabled={isEditing}
          onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="emoc-form__label">
        {isEditing ? '¿Qué sentiste?' : 'Podés elegir más de una'}
      </div>
      <div className="emoc-form__chips">
        {EMOTIONS.map((em) => (
          <button key={em.key} type="button"
            className={`emoc-chip${emotionKeys.has(em.key) ? ' emoc-chip--active' : ''}`}
            onClick={() => toggleEmotion(em.key)}>
            <img src={em.img} alt="" className="emoc-chip__emoji" />
            <span className="emoc-chip__label">{emotionLabel(em, userKey)}</span>
          </button>
        ))}
      </div>

      <div className="emoc-form__intensity">
        <label className="emoc-form__label">
          Intensidad — <span className="emoc-form__intensity-val">{INTENSITY_LABELS[Math.round(intensity)]}</span>
        </label>
        <div className="emoc-form__slider-row">
          <span className="emoc-form__slider-min">1</span>
          <input type="range" min={1} max={5} step={0.01} value={intensity}
            className="emoc-form__slider"
            onChange={(e) => setIntensity(Number(e.target.value))} />
          <span className="emoc-form__slider-max">5</span>
        </div>
        <div className="emoc-form__intensity-dots">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}
              className={`emoc-intensity-dot${Math.round(intensity) >= n ? ' emoc-intensity-dot--filled' : ''}`} />
          ))}
        </div>
      </div>

      <textarea className="emoc-form__note" placeholder="Nota opcional… ¿qué pasó hoy?"
        value={note} maxLength={500} rows={3}
        onChange={(e) => setNote(e.target.value)} />

      <button type="submit" className="emoc-form__submit" disabled={emotionKeys.size === 0 || saving}>
        {submitLabel}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// Modal de día
// ─────────────────────────────────────────────
function DayModal({ day, entries, onClose, onDelete, onSaved }) {
  const [hiddenIds, setHiddenIds] = useState(new Set());

  // Estado de edición inline: id del entry que se está editando
  const [editingId,  setEditingId]  = useState(null);
  const [editEmoKey, setEditEmoKey] = useState('');
  const [editInt,    setEditInt]    = useState(3);
  const [editNote,   setEditNote]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditEmoKey(entry.emotion_key);
    setEditInt(entry.intensity);
    setEditNote(entry.note ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateEmotionalEntry(editingId, {
        emotion_key: editEmoKey,
        intensity:   Math.round(editInt),
        note:        editNote || null,
      });
      toast.success('Emoción actualizada');
      setEditingId(null);
      await onSaved();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = (entry) => {
    setHiddenIds(prev => new Set([...prev, entry.id]));
    const key = `emoc-${entry.id}`;
    scheduleDeletion(key, async () => {
      await deleteEmotionalEntry(entry.id);
      setHiddenIds(prev => { const s = new Set(prev); s.delete(entry.id); return s; });
      onDelete(entry.id);
    });
    toast.success('Emoción eliminada', {
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: () => {
          if (cancelDeletion(key)) {
            setHiddenIds(prev => { const s = new Set(prev); s.delete(entry.id); return s; });
          }
        },
      },
    });
  };

  return (
    <div className="emoc-modal-backdrop" onClick={onClose}>
      <div className="emoc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="emoc-modal__header">
          <span className="emoc-modal__date">{formatDay(day)}</span>
          <button className="emoc-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="emoc-modal__users">
          {USERS.map((u) => {
            const userEntries = entries.filter((e) => e.user_key === u.key && !hiddenIds.has(e.id));
            return (
              <div key={u.key} className="emoc-modal__user-card">
                <div className="emoc-modal__user-header">
                  <img src={u.avatar} alt={u.label} className="emoc-modal__user-avatar" />
                  <span className="emoc-modal__user-name">{u.label}</span>
                </div>
                {userEntries.length > 0 ? (
                  <div className="emoc-modal__emotion-list">
                    {userEntries.map((entry) => {
                      const em = EMOTION_MAP[entry.emotion_key];
                      const isEditing = editingId === entry.id;
                      return (
                        <div key={entry.id} className="emoc-modal__emotion-entry">
                          {isEditing ? (
                            <div className="emoc-modal__inline-edit">
                              <div className="emoc-modal__emotion">
                                <img src={EMOTION_MAP[editEmoKey]?.img} alt="" className="emoc-modal__emoji" />
                                <span className="emoc-modal__emotion-label">{EMOTION_MAP[editEmoKey] ? emotionLabel(EMOTION_MAP[editEmoKey], entry.user_key) : ''}</span>
                              </div>
                              <div className="emoc-form__intensity">
                                <label className="emoc-form__label">
                                  Intensidad — <span className="emoc-form__intensity-val">{INTENSITY_LABELS[Math.round(editInt)]}</span>
                                </label>
                                <div className="emoc-form__slider-row">
                                  <span className="emoc-form__slider-min">1</span>
                                  <input type="range" min={1} max={5} step={0.01} value={editInt}
                                    className="emoc-form__slider"
                                    onChange={(e) => setEditInt(Number(e.target.value))} />
                                  <span className="emoc-form__slider-max">5</span>
                                </div>
                              </div>
                              <textarea className="emoc-form__note" rows={2} maxLength={500}
                                placeholder="Nota opcional…"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)} />
                              <div className="emoc-modal__actions">
                                <button className="emoc-modal__edit-btn" onClick={cancelEdit} disabled={saving}>
                                  Cancelar
                                </button>
                                <button className="emoc-form__submit" onClick={handleSaveEdit}
                                  disabled={!editEmoKey || saving} style={{ flex: 1, padding: 'var(--space-1) 0', fontSize: 'var(--text-xs)' }}>
                                  {saving ? 'Guardando…' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="emoc-modal__emotion">
                                <img src={em?.img} alt="" className="emoc-modal__emoji" />
                                <span className="emoc-modal__emotion-label">{em ? emotionLabel(em, entry.user_key) : ''}</span>
                              </div>
                              <div className="emoc-modal__intensity-dots">
                                {[1,2,3,4,5].map((n) => (
                                  <span key={n}
                                    className={`emoc-intensity-dot${entry.intensity >= n ? ' emoc-intensity-dot--filled' : ''}`} />
                                ))}
                              </div>
                              {entry.note && <p className="emoc-modal__note">{entry.note}</p>}
                              <div className="emoc-modal__actions">
                                <button className="emoc-modal__edit-btn" onClick={() => startEdit(entry)}>Editar</button>
                                <button className="emoc-modal__delete-btn" onClick={() => handleDeleteEntry(entry)}>Eliminar</button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="emoc-modal__empty">Sin registro</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ─────────────────────────────────────────────
// Calendario mensual
// ─────────────────────────────────────────────
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES   = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

function EmotionCalendar({ entries, year, month, onPrev, onNext, onDayClick, loading }) {
  const byDate = {};
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }
  const today       = todayISO();
  const startDow    = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const nowDate   = new Date();
  const maxMonth  = monthKey(nowDate.getFullYear(), nowDate.getMonth());

  return (
    <div className={`emoc-calendar${loading ? ' emoc-calendar--loading' : ''}`}>
      <div className="emoc-calendar__nav">
        <button className="emoc-calendar__nav-btn" onClick={onPrev}>‹</button>
        <span className="emoc-calendar__title">{MONTH_NAMES[month]} {year}</span>
        <button className="emoc-calendar__nav-btn" onClick={onNext}
          disabled={monthKey(year, month) >= maxMonth}>›</button>
      </div>
      <div className="emoc-calendar__grid">
        {DAY_NAMES.map((d) => <div key={d} className="emoc-calendar__dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="emoc-calendar__cell emoc-calendar__cell--empty" />;
          const iso        = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayEntries = byDate[iso] || [];
          const isFuture   = iso > today;
          const isToday    = iso === today;
          return (
            <button key={iso}
              className={['emoc-calendar__cell',
                isToday   ? 'emoc-calendar__cell--today'     : '',
                isFuture  ? 'emoc-calendar__cell--future'    : '',
                dayEntries.length ? 'emoc-calendar__cell--has-entry' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !isFuture && onDayClick(iso)}
              disabled={isFuture}>
              <span className="emoc-calendar__day-num">{day}</span>
              <div className="emoc-calendar__emojis">
                {dayEntries.map((e) => {
                  const em = EMOTION_MAP[e.emotion_key];
                  return em ? (
                    <img key={e.id} src={em.img} alt=""
                      className="emoc-calendar__emoji"
                      title={`${e.user_key === 'van' ? 'Van' : 'Martín'}: ${emotionLabel(em, e.user_key)}`}
                    />
                  ) : null;
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Página principal — fuente de verdad única
// ─────────────────────────────────────────────
export default function Emocionario() {
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [entries,        setEntries]       = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [selectedDay,    setSelectedDay]   = useState(null);
  const [showFormModal,  setShowFormModal] = useState(false);

  // En mobile, retrasar el renderizado del contenido 500ms para que se vea el fondo
  const [ready, setReady] = useState(() => window.innerWidth > 768);
  useEffect(() => {
    if (window.innerWidth > 768) return;
    const t = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const fetchEntriesForMonth = useCallback(async (m, { silent = false } = {}) => {
    if (!silent) setLoadingEntries(true);
    try {
      const data = await getEmotionalEntries(monthKey(m.year, m.month));
      setEntries(data);
    } catch {
      // no romper UI ante error puntual de red
    } finally {
      if (!silent) setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    fetchEntriesForMonth(selectedMonth);
  }, [selectedMonth, fetchEntriesForMonth]);

  // Al guardar/editar: refresh silencioso para no desmontar el calendario
  const handleEntrySaved = useCallback(async () => {
    await fetchEntriesForMonth(selectedMonth, { silent: true });
  }, [selectedMonth, fetchEntriesForMonth]);

  const handlePrevMonth = () => {
    setSelectedMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const handleNextMonth = () => {
    const maxYear  = now.getFullYear();
    const maxMonth = now.getMonth();
    setSelectedMonth(({ year, month }) => {
      if (year === maxYear && month === maxMonth) return { year, month };
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  const selectedDayEntries = selectedDay
    ? entries.filter((e) => e.date === selectedDay)
    : [];

  const handleDelete = useCallback((deletedId) => {
    setEntries((prev) => prev.filter((e) => e.id !== deletedId));
  }, []);


  return (
    <div className="emoc-page">
      {!ready ? null : <div className="emoc-page__inner">
        <header className="emoc-header">
          <h1 className="emoc-header__title">Emocionario</h1>
          <p className="emoc-header__sub">Un diario de cómo se sienten, día a día</p>
        </header>

        {/* Desktop: formulario inline | Mobile: botón + modal */}
        <div className="emoc-form-desktop">
          <EmotionForm onSaved={handleEntrySaved} onPoniSaved={handlePoniSaved} />
        </div>
        <button className="emoc-add-btn" onClick={() => setShowFormModal(true)}>
          + Agregar emoción
        </button>
        {showFormModal && (
          <div className="emoc-modal-backdrop" onClick={() => setShowFormModal(false)}>
            <div className="emoc-modal emoc-modal--form" onClick={(e) => e.stopPropagation()}>
              <div className="emoc-modal__header">
                <span className="emoc-modal__date">¿Qué sentiste?</span>
                <button className="emoc-modal__close" onClick={() => setShowFormModal(false)}>✕</button>
              </div>
              <div className="emoc-modal__scroll">
                <EmotionForm
                  onSaved={handleEntrySaved}
                  onClose={() => setShowFormModal(false)}
                                  />
              </div>
            </div>
          </div>
        )}

        <section className="emoc-section">
          <h2 className="emoc-section__title">Calendario emocional</h2>
          <EmotionCalendar
            entries={entries}
            year={selectedMonth.year}
            month={selectedMonth.month}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            onDayClick={setSelectedDay}
            loading={loadingEntries}
          />
        </section>

        {selectedDay && (
          <DayModal
            day={selectedDay}
            entries={selectedDayEntries}
            onClose={() => setSelectedDay(null)}
            onDelete={handleDelete}
            onSaved={handleEntrySaved}
          />
        )}
      </div>}
    </div>
  );
}
