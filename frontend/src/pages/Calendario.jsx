import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  getEvents, createEvent, updateEvent, deleteEvent,
  getEventTypes, createEventType, deleteEventType,
} from '../api/calendar';
import { getEmotionalEntries } from '../api/emotional';
import { EmotionForm, EMOTIONS } from './Emocionario';
import '../styles/calendario.css';

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const RECURRENCE_OPTS = [
  { key: 'none',    label: 'No se repite' },
  { key: 'daily',   label: 'Diario' },
  { key: 'weekly',  label: 'Semanal' },
  { key: 'monthly', label: 'Mensual' },
  { key: 'yearly',  label: 'Anual' },
];

const EMOTION_MAP = Object.fromEntries(EMOTIONS.map((e) => [e.key, e]));

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function buildGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    cells.push(
      day >= 1 && day <= daysInMonth
        ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        : null
    );
  }
  return cells;
}

function weekOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const offset = (d.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(d);
    dt.setDate(d.getDate() - offset + i);
    days.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    );
  }
  return days;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Calendario() {
  const today = useMemo(todayISO, []);
  const [year, setYear]   = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [view, setView]   = useState('month');

  const [events,  setEvents]  = useState([]);
  const [types,   setTypes]   = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDay,  setSelectedDay]  = useState(null);
  const [filterType,   setFilterType]   = useState(null);

  const [eventForm,  setEventForm]  = useState(null); // {event, date}
  const [typesMgr,   setTypesMgr]   = useState(false);
  const [delConfirm, setDelConfirm] = useState(null);

  const mk = monthKey(year, month);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evts, tps, emos] = await Promise.all([
        getEvents(mk),
        getEventTypes(),
        getEmotionalEntries(mk),
      ]);
      setEvents(evts);
      setTypes(tps);
      setEmotions(emos);
    } catch {
      toast.error('Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  }, [mk]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }, [month]);

  const goToday = useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(today);
  }, [today]);

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((t) => [t.id, t])),
    [types]
  );

  const eventsForDay = useCallback((d) => events.filter((e) => {
    if (e.instance_date !== d) return false;
    if (filterType != null && e.type_id !== filterType) return false;
    return true;
  }), [events, filterType]);

  const emotionsForDay = useCallback(
    (d) => emotions.filter((e) => e.date === d),
    [emotions]
  );

  const grid     = useMemo(() => buildGrid(year, month), [year, month]);
  const weekDays = useMemo(() => weekOf(selectedDay || today), [selectedDay, today]);

  const handleSaveEvent = async (data) => {
    try {
      if (data.id) {
        await updateEvent(data.id, data);
        toast.success('Evento actualizado');
      } else {
        await createEvent(data);
        toast.success('Evento creado');
      }
      setEventForm(null);
      load();
    } catch {
      toast.error('Error al guardar el evento');
    }
  };

  const handleDeleteEvent = async (event, series = false) => {
    try {
      await deleteEvent(event.id, series);
      toast.success('Evento eliminado');
      setDelConfirm(null);
      load();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const selectDay = useCallback(
    (d) => setSelectedDay((prev) => (prev === d ? null : d)),
    []
  );

  return (
    <div className="cal">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="cal__header">
        <div className="cal__nav">
          <button className="cal__nav-btn" onClick={prevMonth}>‹</button>
          <h2 className="cal__title">{MONTHS_ES[month]} {year}</h2>
          <button className="cal__nav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="cal__controls">
          <button className="cal__ctrl-btn" onClick={goToday}>Hoy</button>
          <div className="cal__view-toggle">
            {[['month', 'Mes'], ['week', 'Semana']].map(([v, label]) => (
              <button
                key={v}
                className={`cal__view-btn${view === v ? ' is-active' : ''}`}
                onClick={() => setView(v)}
              >{label}</button>
            ))}
          </div>
          <button className="cal__ctrl-btn" onClick={() => setTypesMgr(true)}>⚙ Tipos</button>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <div className="cal__filters">
        {types.map((t) => (
          <button
            key={t.id}
            className={`cal__filter${filterType === t.id ? ' is-active' : ''}`}
            style={filterType === t.id
              ? { borderColor: t.color, backgroundColor: t.color + '22' }
              : {}}
            onClick={() => setFilterType(filterType === t.id ? null : t.id)}
          >
            <span className="cal__filter-dot" style={{ background: t.color }} />
            {t.name}
          </button>
        ))}
      </div>

      {/* ─── Body ────────────────────────────────────────────────── */}
      <div className="cal__body">
        <div className={`cal__grid-wrap${selectedDay ? ' has-panel' : ''}`}>
          <div className="cal__weekdays">
            {WEEK_DAYS.map((d) => <div key={d} className="cal__weekday">{d}</div>)}
          </div>

          {view === 'month' ? (
            <div className="cal__month-grid">
              {grid.map((d, i) => (
                <DayCell
                  key={i}
                  dateStr={d}
                  today={today}
                  selected={selectedDay}
                  events={d ? eventsForDay(d) : []}
                  emotions={d ? emotionsForDay(d) : []}
                  typeMap={typeMap}
                  onClick={() => d && selectDay(d)}
                />
              ))}
            </div>
          ) : (
            <div className="cal__week-grid">
              {weekDays.map((d) => (
                <DayCell
                  key={d}
                  dateStr={d}
                  today={today}
                  selected={selectedDay}
                  events={eventsForDay(d)}
                  emotions={emotionsForDay(d)}
                  typeMap={typeMap}
                  tall
                  onClick={() => selectDay(d)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedDay && (
          <DayPanel
            dateStr={selectedDay}
            events={eventsForDay(selectedDay)}
            emotions={emotionsForDay(selectedDay)}
            typeMap={typeMap}
            onClose={() => setSelectedDay(null)}
            onAddEvent={() => setEventForm({ event: null, date: selectedDay })}
            onEditEvent={(ev) => setEventForm({ event: ev, date: ev.date })}
            onDeleteEvent={(ev) => setDelConfirm(ev)}
            onEmotionChange={load}
          />
        )}
      </div>

      {loading && <div className="cal__loading">Cargando...</div>}

      {/* ─── Modals ───────────────────────────────────────────────── */}
      {eventForm !== null && (
        <EventFormModal
          event={eventForm.event}
          defaultDate={eventForm.date}
          types={types}
          onSave={handleSaveEvent}
          onClose={() => setEventForm(null)}
        />
      )}

      {typesMgr && (
        <TypesModal
          types={types}
          onClose={() => { setTypesMgr(false); load(); }}
        />
      )}

      {delConfirm && (
        <DeleteModal
          event={delConfirm}
          onCancel={() => setDelConfirm(null)}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

function DayCell({ dateStr, today, selected, events, emotions, typeMap, onClick, tall }) {
  if (!dateStr) return <div className="cal__cell cal__cell--empty" />;
  const dayNum = +dateStr.split('-')[2];
  const shown  = events.slice(0, 3);
  const more   = events.length - shown.length;

  return (
    <div
      className={[
        'cal__cell',
        dateStr === today    ? 'cal__cell--today'    : '',
        dateStr === selected ? 'cal__cell--selected' : '',
        tall                 ? 'cal__cell--tall'     : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span className="cal__cell-num">{dayNum}</span>

      <div className="cal__cell-dots">
        {shown.map((ev, i) => (
          <span
            key={i}
            className="cal__dot"
            style={{ background: typeMap[ev.type_id]?.color || 'var(--color-brown)' }}
            title={ev.title}
          />
        ))}
        {more > 0 && <span className="cal__dot-more">+{more}</span>}
      </div>

      <div className="cal__cell-emos">
        {emotions.slice(0, 4).map((em, i) => {
          const e = EMOTION_MAP[em.emotion_key];
          return e
            ? <img key={i} src={e.img} alt="" className="cal__cell-emo"
                title={`${em.user_key === 'van' ? 'Van' : 'Martín'}: ${e.labelF}`} />
            : null;
        })}
      </div>
    </div>
  );
}

// ─── DayPanel ─────────────────────────────────────────────────────────────────

function DayPanel({ dateStr, events, emotions, typeMap, onClose, onAddEvent, onEditEvent, onDeleteEvent, onEmotionChange }) {
  const [tab, setTab]       = useState('events');
  const [editEmo, setEditEmo] = useState(null);

  const dayDate = new Date(dateStr + 'T12:00:00');
  const label   = `${WEEK_DAYS[(dayDate.getDay() + 6) % 7]}, ${dayDate.getDate()} de ${MONTHS_ES[dayDate.getMonth()]}`;

  // Reset edit state when day changes
  useEffect(() => { setEditEmo(null); }, [dateStr]);

  return (
    <div className="cal__panel">
      <div className="cal__panel-head">
        <div className="cal__panel-title">{label}</div>
        <button className="cal__panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="cal__panel-tabs">
        <button className={`cal__ptab${tab === 'events' ? ' is-active' : ''}`} onClick={() => setTab('events')}>
          Eventos
          {events.length > 0 && <span className="cal__ptab-badge">{events.length}</span>}
        </button>
        <button className={`cal__ptab${tab === 'emoc' ? ' is-active' : ''}`} onClick={() => setTab('emoc')}>
          Emocionario
          {emotions.length > 0 && <span className="cal__ptab-badge">{emotions.length}</span>}
        </button>
      </div>

      <div className="cal__panel-body">
        {/* ─── Events tab ─── */}
        {tab === 'events' && (
          <>
            <button className="cal__add-event-btn" onClick={onAddEvent}>
              + Añadir evento
            </button>
            {events.length === 0
              ? <p className="cal__panel-empty">Sin eventos este día</p>
              : events.map((ev, i) => (
                <EventRow
                  key={i}
                  event={ev}
                  type={typeMap[ev.type_id]}
                  onEdit={onEditEvent}
                  onDelete={onDeleteEvent}
                />
              ))
            }
          </>
        )}

        {/* ─── Emocionario tab ─── */}
        {tab === 'emoc' && (
          <>
            {emotions.length > 0 && (
              <div className="cal__emo-list">
                {emotions.map((em, i) => {
                  const e = EMOTION_MAP[em.emotion_key];
                  const isEditing = editEmo?.id === em.id;
                  return (
                    <div key={i} className={`cal__emo-row${isEditing ? ' cal__emo-row--editing' : ''}`}>
                      {e && <img src={e.img} alt="" className="cal__emo-row-img" />}
                      <div className="cal__emo-row-info">
                        <span className="cal__emo-row-who">
                          {em.user_key === 'van' ? 'Van 🌸' : 'Martín 🌿'}
                        </span>
                        <span className="cal__emo-row-name">
                          {em.user_key === 'van' ? e?.labelF : e?.labelM}
                        </span>
                        {em.note && <span className="cal__emo-row-note">{em.note}</span>}
                      </div>
                      <button
                        className="cal__emo-edit-btn"
                        onClick={() => setEditEmo(isEditing ? null : em)}
                        title={isEditing ? 'Cancelar edición' : 'Editar'}
                      >{isEditing ? '✕' : '✎'}</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cal__emo-form-wrap">
              <p className="cal__emo-form-label">
                {editEmo ? 'Editando entrada' : '+ Registrar emoción'}
              </p>
              <EmotionForm
                key={editEmo?.id || dateStr}
                prefill={
                  editEmo
                    ? { userKey: editEmo.user_key, entry: editEmo }
                    : { entry: { date: dateStr } }
                }
                onSaved={() => { setEditEmo(null); onEmotionChange(); }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({ event, type, onEdit, onDelete }) {
  let recurrenceLabel = null;
  if (event.recurrence) {
    try {
      const r = JSON.parse(event.recurrence);
      if (r.freq && r.freq !== 'none') recurrenceLabel = '↻';
    } catch { /* ignore */ }
  }

  return (
    <div className="cal__event-row">
      <div className="cal__event-color-bar" style={{ background: type?.color || 'var(--color-brown)' }} />
      <div className="cal__event-info">
        <div className="cal__event-name">{event.title}</div>
        {event.start_time && (
          <div className="cal__event-time">
            {event.start_time}{event.end_time ? `–${event.end_time}` : ''}
          </div>
        )}
        {event.description && <div className="cal__event-desc">{event.description}</div>}
        <div className="cal__event-meta">
          {type?.name && <span>{type.name}</span>}
          {recurrenceLabel && <span>{recurrenceLabel} Recurrente</span>}
        </div>
      </div>
      <div className="cal__event-btns">
        <button className="cal__event-btn" onClick={() => onEdit(event)} title="Editar">✎</button>
        <button className="cal__event-btn cal__event-btn--del" onClick={() => onDelete(event)} title="Eliminar">✕</button>
      </div>
    </div>
  );
}

// ─── EventFormModal ────────────────────────────────────────────────────────────

function EventFormModal({ event, defaultDate, types, onSave, onClose }) {
  const editing = !!event?.id;

  const getFreq = () => {
    if (!event?.recurrence) return 'none';
    try { return JSON.parse(event.recurrence).freq || 'none'; } catch { return 'none'; }
  };

  const [f, setF] = useState({
    title:        event?.title        || '',
    description:  event?.description  || '',
    date:         event?.date         || defaultDate || todayISO(),
    start_time:   event?.start_time   || '',
    end_time:     event?.end_time     || '',
    all_day:      event?.all_day      ?? true,
    type_id:      event?.type_id      ?? '',
    notif_enabled: event?.notif_enabled || false,
    notif_minutes: event?.notif_minutes || 30,
    freq: getFreq(),
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    setSaving(true);

    const recurrence = f.freq === 'none'
      ? null
      : JSON.stringify({ freq: f.freq, interval: 1 });

    const payload = {
      ...(event?.id ? { id: event.id } : {}),
      title:         f.title.trim(),
      description:   f.description || null,
      date:          f.date,
      start_time:    !f.all_day && f.start_time ? f.start_time : null,
      end_time:      !f.all_day && f.end_time   ? f.end_time   : null,
      all_day:       f.all_day,
      type_id:       f.type_id ? Number(f.type_id) : null,
      participants:  'ambos',
      created_by:    'van',
      notif_enabled: f.notif_enabled,
      notif_minutes: f.notif_enabled ? Number(f.notif_minutes) : null,
      recurrence,
    };

    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="cal__backdrop" onClick={onClose}>
      <div className="cal__modal" onClick={(e) => e.stopPropagation()}>
        <div className="cal__modal-head">
          <h3 className="cal__modal-title">{editing ? 'Editar evento' : 'Nuevo evento'}</h3>
          <button className="cal__modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="cal__form" onSubmit={submit}>
          <div className="cal__fg">
            <label>Título *</label>
            <input
              value={f.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Nombre del evento"
              required
            />
          </div>

          <div className="cal__fg">
            <label>Descripción</label>
            <textarea
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Opcional..."
            />
          </div>

          <div className="cal__form-row">
            <div className="cal__fg">
              <label>Fecha</label>
              <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div className="cal__fg cal__fg--check">
              <label>
                <input type="checkbox" checked={f.all_day} onChange={(e) => set('all_day', e.target.checked)} />
                Todo el día
              </label>
            </div>
          </div>

          {!f.all_day && (
            <div className="cal__form-row">
              <div className="cal__fg">
                <label>Inicio</label>
                <input type="time" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} />
              </div>
              <div className="cal__fg">
                <label>Fin</label>
                <input type="time" value={f.end_time} onChange={(e) => set('end_time', e.target.value)} />
              </div>
            </div>
          )}

          <div className="cal__form-row">
            <div className="cal__fg">
              <label>Tipo de evento</label>
              <select value={f.type_id} onChange={(e) => set('type_id', e.target.value)}>
                <option value="">Sin tipo</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="cal__fg">
              <label>Se repite</label>
              <select value={f.freq} onChange={(e) => set('freq', e.target.value)}>
                {RECURRENCE_OPTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="cal__fg">
            <label className="cal__notif-label">
              <input
                type="checkbox"
                checked={f.notif_enabled}
                onChange={(e) => set('notif_enabled', e.target.checked)}
              />
              Activar recordatorio
              {f.notif_enabled && (
                <select
                  value={f.notif_minutes}
                  onChange={(e) => set('notif_minutes', e.target.value)}
                  className="cal__notif-select"
                >
                  <option value={10}>10 min antes</option>
                  <option value={30}>30 min antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={1440}>1 día antes</option>
                </select>
              )}
            </label>
          </div>

          <div className="cal__form-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── TypesModal ───────────────────────────────────────────────────────────────

function TypesModal({ types, onClose }) {
  const [list,  setList]  = useState(types);
  const [name,  setName]  = useState('');
  const [color, setColor] = useState('#A0745A');

  const add = async () => {
    if (!name.trim()) return;
    try {
      const t = await createEventType({ name: name.trim(), color, created_by: 'van' });
      setList((l) => [...l, t]);
      setName('');
      setColor('#A0745A');
      toast.success('Tipo creado');
    } catch {
      toast.error('Error al crear tipo');
    }
  };

  const remove = async (id) => {
    try {
      await deleteEventType(id);
      setList((l) => l.filter((t) => t.id !== id));
    } catch {
      toast.error('Error al eliminar tipo');
    }
  };

  return (
    <div className="cal__backdrop" onClick={onClose}>
      <div className="cal__modal cal__modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="cal__modal-head">
          <h3 className="cal__modal-title">Tipos de evento</h3>
          <button className="cal__modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cal__types-list">
          {list.length === 0 && <p className="cal__panel-empty">Sin tipos aún. Creá el primero.</p>}
          {list.map((t) => (
            <div key={t.id} className="cal__type-row">
              <span className="cal__type-dot" style={{ background: t.color }} />
              <span className="cal__type-name">{t.name}</span>
              <button className="cal__type-del" onClick={() => remove(t.id)} title="Eliminar">✕</button>
            </div>
          ))}
        </div>

        <div className="cal__type-new">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="cal__color-pick"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Nombre del tipo..."
            className="cal__type-input"
          />
          <button className="btn btn-primary btn-sm" onClick={add} disabled={!name.trim()}>
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────

function DeleteModal({ event, onCancel, onDelete }) {
  const isSeries = !!event.series_id;
  return (
    <div className="cal__backdrop" onClick={onCancel}>
      <div className="cal__modal cal__modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="cal__modal-head">
          <h3 className="cal__modal-title">Eliminar evento</h3>
          <button className="cal__modal-close" onClick={onCancel}>✕</button>
        </div>
        <p className="cal__del-text">"{event.title}"</p>
        <div className="cal__del-actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
          {isSeries && (
            <button className="btn btn-outline btn-sm" onClick={() => onDelete(event, false)}>
              Solo este
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(event, isSeries)}>
            {isSeries ? 'Toda la serie' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
