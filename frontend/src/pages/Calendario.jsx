import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import Modal from '../components/ui/Modal';
import {
  getEvents, createEvent, updateEvent, deleteEvent,
  getEventTypes, createEventType, deleteEventType,
} from '../api/calendar';
import { getEmotionalEntries, deleteEmotionalEntry } from '../api/emotional';
import { useConfirm } from '../context/ConfirmContext';
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

function buildRange(a, b) {
  const [start, end] = a <= b ? [a, b] : [b, a];
  const range = new Set();
  const cur = new Date(start + 'T12:00:00');
  const fin = new Date(end   + 'T12:00:00');
  while (cur <= fin) {
    range.add(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  return range;
}

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
  const [emoToday,   setEmoToday]   = useState(false);

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
      await deleteEvent(event.id, series, series ? null : event.instance_date);
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

  // ─── Range-event lane assignment ────────────────────────────────────────────
  // Computes a stable ordered list of range events for a week so every cell in
  // the same week renders bars in the same vertical "lane".
  const isRangeEv = (ev) => {
    if (!ev.recurrence) return false;
    try { return !!JSON.parse(ev.recurrence).end_date; } catch { return false; }
  };

  const computeWeekRangeOrder = useCallback((weekDays) => {
    const seen = new Map();
    for (const d of weekDays) {
      if (!d) continue;
      for (const ev of eventsForDay(d)) {
        if (isRangeEv(ev) && !seen.has(ev.id)) seen.set(ev.id, ev);
      }
    }
    return [...seen.values()].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id
    );
  }, [eventsForDay]);

  // ─── Drag-to-select ────────────────────────────────────────────────────────
  const dragStartRef = useRef(null);
  const dragEndRef   = useRef(null);
  const [dragRange, setDragRange] = useState(new Set());
  const gridRef            = useRef(null);
  const longPressTimer     = useRef(null);   // setTimeout handle
  const touchPendingCell   = useRef(null);   // celda tocada, esperando long-press
  const touchStartPos      = useRef({ x: 0, y: 0 });
  const touchDragActive    = useRef(false);  // long-press disparado, drag en curso

  const handleCellMouseDown = useCallback((d) => {
    dragStartRef.current = d;
    dragEndRef.current   = d;
    setDragRange(new Set([d]));
  }, []);

  const handleCellMouseEnter = useCallback((d) => {
    if (!dragStartRef.current) return;
    dragEndRef.current = d;
    setDragRange(buildRange(dragStartRef.current, d));
  }, []);

  // Touch: touchstart — registra celda y arranca timer de long-press (350 ms)
  const handleGridTouchStart = useCallback((e) => {
    const cell = e.target.closest('[data-date]');
    if (!cell || !cell.dataset.date) return;
    const d = cell.dataset.date;
    touchPendingCell.current  = d;
    touchStartPos.current     = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDragActive.current   = false;

    longPressTimer.current = setTimeout(() => {
      touchDragActive.current  = true;
      dragStartRef.current     = d;
      dragEndRef.current       = d;
      setDragRange(new Set([d]));
      document.body.dataset.calDrag = '1'; // señal para Layout: cancelar swipe de páginas
      if (navigator.vibrate) navigator.vibrate(40);
    }, 350);
  }, []);

  // Touch: touchmove — cancela long-press si el dedo se movió antes de los 350 ms;
  // cuando el drag ya está activo bloquea el scroll y actualiza el rango.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onTouchMove = (e) => {
      if (!touchDragActive.current) {
        // Todavía en espera: si se movió más de 8 px cancela el long-press
        if (touchPendingCell.current) {
          const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
          const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
          if (dx > 8 || dy > 8) {
            clearTimeout(longPressTimer.current);
            touchPendingCell.current = null;
          }
        }
        return;
      }
      e.preventDefault();
      const touch  = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!target) return;
      const cell = target.closest('[data-date]');
      if (!cell || !cell.dataset.date) return;
      const d = cell.dataset.date;
      if (d !== dragEndRef.current) {
        dragEndRef.current = d;
        setDragRange(buildRange(dragStartRef.current, d));
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  // Mouse up + touch end/cancel (global)
  useEffect(() => {
    const finishDrag = () => {
      const start = dragStartRef.current;
      const end   = dragEndRef.current;
      dragStartRef.current = null;
      dragEndRef.current   = null;
      setDragRange(new Set());
      if (!start) return;
      if (!end || start === end) {
        selectDay(start);
      } else {
        const [a, b] = start <= end ? [start, end] : [end, start];
        setEventForm({ event: null, date: a, endDate: b });
      }
    };

    const onMouseUp = finishDrag;

    const onTouchEnd = (e) => {
      clearTimeout(longPressTimer.current);

      if (!touchDragActive.current) {
        // Tap corto: el long-press no llegó a disparar → abrir panel del día
        const d = touchPendingCell.current;
        touchPendingCell.current = null;
        if (d) {
          e.preventDefault(); // evita que mouse events sintéticos llamen selectDay una segunda vez
          selectDay(d);
        }
        return;
      }

      touchDragActive.current  = false;
      touchPendingCell.current = null;
      delete document.body.dataset.calDrag;
      e.preventDefault();
      finishDrag();
    };

    const onTouchCancel = () => {
      clearTimeout(longPressTimer.current);
      touchDragActive.current  = false;
      touchPendingCell.current = null;
      dragStartRef.current     = null;
      dragEndRef.current       = null;
      delete document.body.dataset.calDrag;
      setDragRange(new Set());
    };

    document.addEventListener('mouseup',     onMouseUp);
    document.addEventListener('touchend',    onTouchEnd);
    document.addEventListener('touchcancel', onTouchCancel);
    return () => {
      document.removeEventListener('mouseup',     onMouseUp);
      document.removeEventListener('touchend',    onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [selectDay]);

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
          <button className="cal__ctrl-btn" onClick={() => setEmoToday(true)}>🫀 Emocionario</button>
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
        <button className="cal__ctrl-btn cal__ctrl-btn--tipos" onClick={() => setTypesMgr(true)}>⚙ Tipos</button>
      </div>

      {/* ─── Body ────────────────────────────────────────────────── */}
      <div className="cal__body">
        <div className="cal__grid-wrap" ref={gridRef} onTouchStart={handleGridTouchStart}>
          <div className="cal__weekdays">
            {WEEK_DAYS.map((d) => <div key={d} className="cal__weekday">{d}</div>)}
          </div>

          {view === 'month' ? (
            <div className="cal__month-grid" onMouseLeave={() => { if (dragStartRef.current) { dragEndRef.current = dragStartRef.current; setDragRange(new Set([dragStartRef.current])); } }}>
              {(() => {
                const weeks = [];
                for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
                return weeks.map((week, wi) => {
                  const rangeOrder = computeWeekRangeOrder(week);
                  return week.map((d, di) => (
                    <DayCell
                      key={wi * 7 + di}
                      dateStr={d}
                      today={today}
                      selected={selectedDay}
                      isDragSelected={d ? dragRange.has(d) : false}
                      events={d ? eventsForDay(d) : []}
                      emotions={d ? emotionsForDay(d) : []}
                      typeMap={typeMap}
                      rangeOrder={rangeOrder}
                      onMouseDown={() => d && handleCellMouseDown(d)}
                      onMouseEnter={() => d && handleCellMouseEnter(d)}
                    />
                  ));
                });
              })()}
            </div>
          ) : (
            <div className="cal__week-grid">
              {(() => {
                const rangeOrder = computeWeekRangeOrder(weekDays);
                return weekDays.map((d) => (
                  <DayCell
                    key={d}
                    dateStr={d}
                    today={today}
                    selected={selectedDay}
                    isDragSelected={dragRange.has(d)}
                    events={eventsForDay(d)}
                    emotions={emotionsForDay(d)}
                    typeMap={typeMap}
                    rangeOrder={rangeOrder}
                    tall
                    onMouseDown={() => handleCellMouseDown(d)}
                    onMouseEnter={() => handleCellMouseEnter(d)}
                  />
                ));
              })()}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="cal__loading">Cargando...</div>}

      {/* ─── Day panel modal ──────────────────────────────────────── */}
      {emoToday && (
        <DayPanel
          dateStr={today}
          events={eventsForDay(today)}
          emotions={emotionsForDay(today)}
          typeMap={typeMap}
          onClose={() => setEmoToday(false)}
          onAddEvent={() => { setEmoToday(false); setEventForm({ event: null, date: today }); }}
          onEditEvent={(ev) => { setEmoToday(false); setEventForm({ event: ev, date: ev.date }); }}
          onDeleteEvent={(ev) => { setEmoToday(false); setDelConfirm(ev); }}
          onEmotionChange={load}
          initialTab="emoc"
        />
      )}
      {!emoToday && selectedDay && (
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

      {/* ─── Modals ───────────────────────────────────────────────── */}
      {eventForm !== null && (
        <EventFormModal
          event={eventForm.event}
          defaultDate={eventForm.date}
          defaultEndDate={eventForm.endDate}
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

function DayCell({ dateStr, today, selected, isDragSelected, events, emotions, typeMap, rangeOrder = [], onMouseDown, onMouseEnter, tall }) {
  if (!dateStr) return <div className="cal__cell cal__cell--empty" />;
  const dayNum = +dateStr.split('-')[2];
  const dow = (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7; // 0=Mon, 6=Sun

  // Build a map of range events present on this specific day
  const dayRangeMap = new Map();
  const dotEvs = [];
  for (const ev of events) {
    let isRange = false;
    if (ev.recurrence) { try { isRange = !!JSON.parse(ev.recurrence).end_date; } catch {} }
    if (isRange) dayRangeMap.set(ev.id, ev);
    else dotEvs.push(ev);
  }

  // Build ordered slots from week-level lane assignment; null = spacer
  const rangeSlots = rangeOrder.map(ev => dayRangeMap.get(ev.id) || null);
  // Trim trailing nulls so empty weeks don't add extra height
  let lastReal = -1;
  for (let i = rangeSlots.length - 1; i >= 0; i--) { if (rangeSlots[i]) { lastReal = i; break; } }
  const trimmedSlots = rangeSlots.slice(0, lastReal + 1);

  const shownDots = dotEvs.slice(0, 3);
  const moreDots  = dotEvs.length - shownDots.length;

  return (
    <div
      className={[
        'cal__cell',
        dateStr === today ? 'cal__cell--today'    : '',
        dateStr === selected && !isDragSelected ? 'cal__cell--selected' : '',
        isDragSelected    ? 'cal__cell--drag'    : '',
        tall              ? 'cal__cell--tall'    : '',
      ].filter(Boolean).join(' ')}
      data-date={dateStr}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      style={{ userSelect: 'none' }}
    >
      <span className="cal__cell-num">{dayNum}</span>

      {trimmedSlots.length > 0 && (
        <div className="cal__cell-ranges">
          {trimmedSlots.map((ev, i) => {
            if (!ev) return <div key={i} className="cal__range-spacer" />;
            let rule = {};
            try { rule = JSON.parse(ev.recurrence); } catch {}
            const exdates = new Set(rule.exdates || []);
            const shiftDay = (iso, delta) => {
              const d = new Date(iso + 'T12:00:00');
              d.setDate(d.getDate() + delta);
              return d.toISOString().slice(0, 10);
            };
            let effectiveStart = ev.date;
            while (exdates.has(effectiveStart) && effectiveStart <= rule.end_date)
              effectiveStart = shiftDay(effectiveStart, 1);
            let effectiveEnd = rule.end_date;
            while (exdates.has(effectiveEnd) && effectiveEnd >= ev.date)
              effectiveEnd = shiftDay(effectiveEnd, -1);
            const isFirst = ev.instance_date === effectiveStart || dow === 0;
            const isLast  = ev.instance_date === effectiveEnd   || dow === 6;
            return (
              <div
                key={i}
                className={[
                  'cal__range-bar',
                  isFirst ? 'cal__range-bar--first' : '',
                  isLast  ? 'cal__range-bar--last'  : '',
                ].filter(Boolean).join(' ')}
                style={{ background: typeMap[ev.type_id]?.color || 'var(--color-brown)' }}
                title={ev.title}
              >
                {isFirst && <span className="cal__range-bar-label">{ev.title}</span>}
              </div>
            );
          })}
        </div>
      )}

      {shownDots.length > 0 && (
        <div className="cal__cell-dot-events">
          {shownDots.map((ev, i) => (
            <div
              key={i}
              className="cal__dot-event"
              style={{ background: typeMap[ev.type_id]?.color || 'var(--color-brown)' }}
              title={ev.title}
            >
              <span className="cal__range-bar-label">{ev.title}</span>
            </div>
          ))}
          {moreDots > 0 && <span className="cal__dot-more">+{moreDots}</span>}
        </div>
      )}

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

function DayPanel({ dateStr, events, emotions, typeMap, onClose, onAddEvent, onEditEvent, onDeleteEvent, onEmotionChange, initialTab }) {
  const [tab, setTab]         = useState(initialTab || 'events');
  const [editEmo, setEditEmo] = useState(null);
  const confirm               = useConfirm();

  const handleDeleteEmo = async (em) => {
    const ok = await confirm({ title: 'Eliminar emoción', message: '¿Eliminás esta entrada del emocionario?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await deleteEmotionalEntry(em.id);
      toast.success('Emoción eliminada');
      onEmotionChange();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const dayDate = new Date(dateStr + 'T12:00:00');
  const label   = `${WEEK_DAYS[(dayDate.getDay() + 6) % 7]}, ${dayDate.getDate()} de ${MONTHS_ES[dayDate.getMonth()]}`;

  useEffect(() => { setEditEmo(null); }, [dateStr]);

  return (
    <Modal isOpen onClose={onClose} title={label} fullscreen noPadding>
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
                          <img src={em.user_key === 'van' ? '/icons/icono-van.png' : '/icons/icono-martin.png'} alt="" className="cal__emo-row-who-icon" />
                          {em.user_key === 'van' ? 'Van' : 'Martín'}
                        </span>
                        <span className="cal__emo-row-name">
                          {em.user_key === 'van' ? e?.labelF : e?.labelM}
                        </span>
                        {em.intensity && (
                          <div className="cal__emo-intensity">
                            {[1,2,3,4,5].map((n) => (
                              <span key={n} className={`cal__emo-idot${Math.round(em.intensity) >= n ? ' cal__emo-idot--on' : ''}`} />
                            ))}
                          </div>
                        )}
                        {em.note && <span className="cal__emo-row-note">{em.note}</span>}
                      </div>
                      <div className="cal__emo-row-btns">
                        <button
                          className="cal__emo-edit-btn"
                          onClick={() => setEditEmo(isEditing ? null : em)}
                          title={isEditing ? 'Cancelar edición' : 'Editar'}
                        >{isEditing ? '✕' : '✎'}</button>
                        {!isEditing && (
                          <button
                            className="cal__emo-edit-btn cal__emo-del-btn"
                            onClick={() => handleDeleteEmo(em)}
                            title="Eliminar"
                          >✕</button>
                        )}
                      </div>
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
    </Modal>
  );
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({ event, type, onEdit, onDelete }) {
  let recurrenceLabel = null;
  if (event.recurrence) {
    try {
      const r = JSON.parse(event.recurrence);
      if (r.freq && r.freq !== 'none' && !r.end_date) recurrenceLabel = '↻';
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

// ─── TypeSelect ───────────────────────────────────────────────────────────────

function TypeSelect({ types, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const ref = useRef(null);
  const selected = types.find((t) => String(t.id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  };

  return (
    <div className="cal__type-select" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className="cal__type-select-trigger"
        onClick={handleOpen}
      >
        {selected
          ? <><span className="cal__type-select-dot" style={{ background: selected.color }} />{selected.name}</>
          : <span className="cal__type-select-placeholder">Sin tipo</span>
        }
        <span className="cal__type-select-arrow">▾</span>
      </button>
      {open && (
        <div
          className="cal__type-select-dropdown"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width }}
        >
          <button
            type="button"
            className={`cal__type-select-opt${!value ? ' is-active' : ''}`}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            <span className="cal__type-select-dot cal__type-select-dot--none" />
            Sin tipo
          </button>
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cal__type-select-opt${String(value) === String(t.id) ? ' is-active' : ''}`}
              onClick={() => { onChange(t.id); setOpen(false); }}
            >
              <span className="cal__type-select-dot" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EventFormModal ────────────────────────────────────────────────────────────

function EventFormModal({ event, defaultDate, defaultEndDate, types, onSave, onClose }) {
  const editing   = !!event?.id;
  const isRange   = !editing && !!defaultEndDate && defaultEndDate !== defaultDate;

  const getFreq = () => {
    if (!event?.recurrence) return 'none';
    try { return JSON.parse(event.recurrence).freq || 'none'; } catch { return 'none'; }
  };

  const [f, setF] = useState({
    title:         event?.title        || '',
    description:   event?.description  || '',
    date:          event?.date         || defaultDate    || todayISO(),
    end_date:      defaultEndDate      || event?.date    || defaultDate || todayISO(),
    start_time:    event?.start_time   || '',
    end_time:      event?.end_time     || '',
    all_day:       event?.all_day      ?? true,
    type_id:       event?.type_id      ?? '',
    notif_enabled: event?.notif_enabled || false,
    notif_minutes: event?.notif_minutes || 30,
    freq:          isRange ? 'range' : getFreq(),
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    setSaving(true);

    let recurrence = null;
    if (f.freq === 'range') {
      recurrence = f.end_date > f.date
        ? JSON.stringify({ freq: 'daily', interval: 1, end_date: f.end_date })
        : null;
    } else if (f.freq !== 'none') {
      recurrence = JSON.stringify({ freq: f.freq, interval: 1 });
    }

    const payload = {
      ...(event?.id ? { id: event.id } : {}),
      title:         f.title.trim(),
      description:   f.description || null,
      date:          f.date,
      start_time:    !f.all_day && f.start_time ? f.start_time : null,
      end_time:      !f.all_day && f.end_time   ? f.end_time   : null,
      all_day:       f.freq === 'range' ? true : f.all_day,
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
              type="text"
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

          {isRange && (
            <div className="cal__range-banner">
              📅 Evento de varios días: del <strong>{f.date}</strong> al <strong>{f.end_date}</strong>
            </div>
          )}

          <div className="cal__form-row">
            <div className="cal__fg">
              <label>{isRange ? 'Inicio' : 'Fecha'}</label>
              <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            {isRange ? (
              <div className="cal__fg">
                <label>Fin</label>
                <input type="date" value={f.end_date} min={f.date} onChange={(e) => set('end_date', e.target.value)} required />
              </div>
            ) : (
              <div className="cal__fg cal__fg--check">
                <label>
                  <input type="checkbox" checked={f.all_day} onChange={(e) => set('all_day', e.target.checked)} />
                  Todo el día
                </label>
              </div>
            )}
          </div>

          {!isRange && !f.all_day && (
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
              <TypeSelect
                types={types}
                value={f.type_id}
                onChange={(v) => set('type_id', v)}
              />
            </div>
            {!isRange && (
              <div className="cal__fg">
                <label>Se repite</label>
                <select value={f.freq} onChange={(e) => set('freq', e.target.value)}>
                  {RECURRENCE_OPTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
            )}
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
  const TYPE_PALETTE = [
    '#8A5F49', '#A9745A', '#C48F6A', '#D8B08A', '#F1DCC4',
    '#D9A6A1', '#C98F8A', '#B9797E', '#E6B7AD', '#F0C9BE',
    '#B79AC8', '#9278A8', '#D2B7D8',
    '#A8B89B', '#8FA37E', '#B9C8AA',
    '#8F9DB8', '#7888A8', '#AEB9CF',
    '#D2A85F', '#E0BD7A', '#C9826A', '#B86F5E', '#E4B09D',
  ];

  const confirm = useConfirm();

  const [list,  setList]  = useState(types);
  const [name,  setName]  = useState('');
  const [color, setColor] = useState('#8A5F49');
  const [paletteOpen, setPaletteOpen] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    if (list.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Ya existe un tipo con ese nombre');
      return;
    }
    try {
      const t = await createEventType({ name: trimmed, color, created_by: 'van' });
      setList((l) => [...l, t]);
      setName('');
      setColor('#A0745A');
      toast.success('Tipo creado');
    } catch {
      toast.error('Error al crear tipo');
    }
  };

  const remove = async (id) => {
    const tipo = list.find((t) => t.id === id);
    const ok = await confirm({
      title: 'Eliminar tipo',
      message: `¿Eliminar "${tipo?.name}"? Los eventos de este tipo quedarán sin categoría.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
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
          <div className="cal__color-wrap">
            <button
              className="cal__color-pick"
              style={{ background: color }}
              onClick={() => setPaletteOpen((v) => !v)}
              type="button"
              title="Elegir color"
            />
            {paletteOpen && (
              <div className="cal__palette">
                {TYPE_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`cal__palette-swatch${color === c ? ' is-selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => { setColor(c); setPaletteOpen(false); }}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>
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
