import { useState, useEffect, useCallback, useRef } from 'react';
import { upsertEmotionalEntry, updateEmotionalEntry, getEmotionalEntries, deleteEmotionalEntry } from '../api/emotional';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import '../styles/emocionario.css';

export const EMOTIONS = [
  { key: 'feliz',       label: 'Feliz',        emoji: '😊' },
  { key: 'enamorado',   label: 'Enamorado/a',  emoji: '🥰' },
  { key: 'tranquilo',   label: 'Tranquilo/a',  emoji: '😌' },
  { key: 'emocionado',  label: 'Emocionado/a', emoji: '🤩' },
  { key: 'agradecido',  label: 'Agradecido/a', emoji: '🙏' },
  { key: 'nostalgico',  label: 'Nostálgico/a', emoji: '🥺' },
  { key: 'ansioso',     label: 'Ansioso/a',    emoji: '😰' },
  { key: 'triste',      label: 'Triste',       emoji: '😢' },
  { key: 'cansado',     label: 'Cansado/a',    emoji: '😴' },
  { key: 'estresado',   label: 'Estresado/a',  emoji: '😤' },
  { key: 'irritado',    label: 'Irritado/a',   emoji: '😠' },
  { key: 'solo',        label: 'Solo/a',       emoji: '😔' },
  { key: 'confundido',  label: 'Confundido/a', emoji: '😕' },
  { key: 'asustado',    label: 'Asustado/a',   emoji: '😨' },
  { key: 'orgulloso',   label: 'Orgulloso/a',  emoji: '🥹' },
];

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map((e) => [e.key, e]));

const USERS = [
  { key: 'van',    label: 'Van',    avatar: '🌸' },
  { key: 'martin', label: 'Martín', avatar: '🌿' },
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
export function EmotionForm({ onSaved, prefill }) {
  const { toast } = useToast();
  const [userKey, setUserKey]         = useState(prefill?.userKey ?? 'van');
  const [date, setDate]               = useState(prefill?.entry?.date ?? todayISO());
  const [emotionKeys, setEmotionKeys] = useState(() =>
    prefill?.entry?.emotion_key ? new Set([prefill.entry.emotion_key]) : new Set()
  );
  const [intensity, setIntensity]     = useState(prefill?.entry?.intensity ?? 3);
  const [note, setNote]               = useState(prefill?.entry?.note ?? '');
  const [saving, setSaving]           = useState(false);
  const isEditing = !!prefill;

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

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
    setSaving(true);
    try {
      if (isEditing) {
        const [emotionKey] = emotionKeys;
        await updateEmotionalEntry(prefill.entry.id, {
          emotion_key: emotionKey,
          intensity:   Math.round(intensity),
          note:        note || null,
        });
        toast('Emoción actualizada', 'success');
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
        toast(count === 1 ? 'Emoción guardada' : `${count} emociones guardadas`, 'success');
        setEmotionKeys(new Set());
        setNote('');
      }
      await onSavedRef.current();
    } catch {
      toast('No se pudo guardar. Intentá de nuevo.', 'error');
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
              <span>{u.avatar}</span><span>{u.label}</span>
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
            <span className="emoc-chip__emoji">{em.emoji}</span>
            <span className="emoc-chip__label">{em.label}</span>
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
function DayModal({ day, entries, onClose, onDelete, onEdit }) {
  const { confirm } = useConfirm();
  const { toast }   = useToast();

  const handleDelete = async (entry) => {
    const ok = await confirm({
      title: 'Eliminar emoción',
      message: `¿Eliminar la emoción de ${entry.user_key === 'van' ? 'Van' : 'Martín'} del ${formatDay(day)}?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteEmotionalEntry(entry.id);
      toast('Emoción eliminada', 'success');
      onDelete(entry.id);
    } catch {
      toast('No se pudo eliminar', 'error');
    }
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
            const userEntries = entries.filter((e) => e.user_key === u.key);
            return (
              <div key={u.key} className="emoc-modal__user-card">
                <div className="emoc-modal__user-header">
                  <span className="emoc-modal__user-avatar">{u.avatar}</span>
                  <span className="emoc-modal__user-name">{u.label}</span>
                </div>
                {userEntries.length > 0 ? (
                  <div className="emoc-modal__emotion-list">
                    {userEntries.map((entry) => {
                      const em = EMOTION_MAP[entry.emotion_key];
                      return (
                        <div key={entry.id} className="emoc-modal__emotion-entry">
                          <div className="emoc-modal__emotion">
                            <span className="emoc-modal__emoji">{em?.emoji}</span>
                            <span className="emoc-modal__emotion-label">{em?.label}</span>
                          </div>
                          <div className="emoc-modal__intensity-dots">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n}
                                className={`emoc-intensity-dot${entry.intensity >= n ? ' emoc-intensity-dot--filled' : ''}`} />
                            ))}
                          </div>
                          {entry.note && <p className="emoc-modal__note">{entry.note}</p>}
                          <div className="emoc-modal__actions">
                            <button className="emoc-modal__edit-btn"
                              onClick={() => { onEdit(u.key, entry); onClose(); }}>Editar</button>
                            <button className="emoc-modal__delete-btn"
                              onClick={() => handleDelete(entry)}>Eliminar</button>
                          </div>
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

function EmotionCalendar({ entries, year, month, onPrev, onNext, onDayClick }) {
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
    <div className="emoc-calendar">
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
                    <span key={e.id} className="emoc-calendar__emoji"
                      title={`${e.user_key === 'van' ? 'Van' : 'Martín'}: ${em.label}`}>
                      {em.emoji}
                    </span>
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
  const [editPrefill,    setEditPrefill]   = useState(null);

  const fetchEntriesForMonth = useCallback(async (m) => {
    setLoadingEntries(true);
    try {
      const data = await getEmotionalEntries(monthKey(m.year, m.month));
      setEntries(data);
    } catch {
      // no romper UI ante error puntual de red
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    fetchEntriesForMonth(selectedMonth);
  }, [selectedMonth, fetchEntriesForMonth]);

  const handleEntrySaved = useCallback(async () => {
    setEditPrefill(null);
    await fetchEntriesForMonth(selectedMonth);
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

  const handleEdit = (userKey, entry) => {
    setEditPrefill({ userKey, entry });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="emoc-page">
      <div className="emoc-page__inner">
        <header className="emoc-header">
          <h1 className="emoc-header__title">Emocionario</h1>
          <p className="emoc-header__sub">Un diario de cómo se sienten, día a día</p>
        </header>

        <EmotionForm
          key={editPrefill ? `edit-${editPrefill.entry.id}` : 'new'}
          prefill={editPrefill}
          onSaved={handleEntrySaved}
        />

        <section className="emoc-section">
          <h2 className="emoc-section__title">Calendario emocional</h2>
          {loadingEntries ? (
            <div className="emoc-loading">Cargando…</div>
          ) : (
            <EmotionCalendar
              entries={entries}
              year={selectedMonth.year}
              month={selectedMonth.month}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              onDayClick={setSelectedDay}
            />
          )}
        </section>

        {selectedDay && (
          <DayModal
            day={selectedDay}
            entries={selectedDayEntries}
            onClose={() => setSelectedDay(null)}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}
