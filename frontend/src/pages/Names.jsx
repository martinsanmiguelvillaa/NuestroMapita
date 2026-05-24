/**
 * Names.jsx — Ranking de nombres
 *
 * 3 tabs:
 *   1. Cargar  — agregar/editar/eliminar nombres
 *   2. Puntuar — elegir perfil y puntuar del 1 al 10 (auto-save)
 *   3. Ranking — ranking combinado con fórmula de consenso
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getNames, createName, updateName, deleteName, rateName } from '../api/names';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import '../styles/names.css';

// ─── Constantes ──────────────────────────────────────────────────────
const GENDERS = [
  { value: 'male',   label: 'Varón',        emoji: '♂' },
  { value: 'female', label: 'Mujer',         emoji: '♀' },
  { value: 'unisex', label: 'Unisex / Otro', emoji: '✦' },
];

const GENDER_LABEL = { male: 'Varón', female: 'Mujer', unisex: 'Unisex' };

const MATCH_LABELS = {
  match_perfecto:      '✨ Match perfecto',
  muy_buen_acuerdo:   '💛 Muy buen acuerdo',
  gusta_a_ambos:      '💚 Gusta a ambos',
  opiniones_divididas:'🔶 Opiniones divididas',
  pendiente_martin:   '⏳ Falta Martín',
  pendiente_van:      '⏳ Falta Van',
  sin_puntuar:        '⏳ Sin puntuar',
};

// ─── Lógica de ranking (client-side) ─────────────────────────────────
function computeRanking(names) {
  return names.map((n) => {
    const byPerson = Object.fromEntries(n.ratings.map((r) => [r.person, r.rating]));
    const martin = byPerson.martin ?? null;
    const van    = byPerson.van ?? null;
    const isComplete = martin !== null && van !== null;

    let average = null, difference = null, combinedScore = null, matchLabel = null;

    if (isComplete) {
      average      = (martin + van) / 2;
      difference   = Math.abs(martin - van);
      combinedScore = average - difference * 0.25;
      matchLabel = difference === 0 ? 'match_perfecto'
        : difference <= 2           ? 'muy_buen_acuerdo'
        : difference <= 4           ? 'gusta_a_ambos'
        :                             'opiniones_divididas';
    } else {
      matchLabel = martin === null && van === null ? 'sin_puntuar'
        : martin === null ? 'pendiente_martin'
        : 'pendiente_van';
    }

    return { ...n, martin, van, isComplete, average, difference, combinedScore, matchLabel };
  });
}

function applyRankingSort(entries, sort) {
  const clone = [...entries];
  if (sort === 'combined')   return clone.sort((a, b) => (b.combinedScore ?? -Infinity) - (a.combinedScore ?? -Infinity));
  if (sort === 'average')    return clone.sort((a, b) => (b.average ?? -Infinity) - (a.average ?? -Infinity));
  if (sort === 'difference') return clone.sort((a, b) => (a.difference ?? Infinity) - (b.difference ?? Infinity));
  if (sort === 'martin')     return clone.sort((a, b) => (b.martin ?? -Infinity) - (a.martin ?? -Infinity));
  if (sort === 'van')        return clone.sort((a, b) => (b.van ?? -Infinity) - (a.van ?? -Infinity));
  return clone;
}

// ─── GenderBadge ─────────────────────────────────────────────────────
function GenderBadge({ gender }) {
  return (
    <span className={`gender-badge gender-badge--${gender}`}>
      {GENDER_LABEL[gender] ?? gender}
    </span>
  );
}

// ─── WingIcon ────────────────────────────────────────────────────────
function WingIcon({ filled, high }) {
  const color = filled
    ? high ? 'var(--color-success)' : 'var(--color-brown)'
    : 'var(--color-beige-dark)';
  return (
    <svg
      viewBox="0 0 24 20"
      width="22"
      height="18"
      aria-hidden="true"
      style={{ display: 'block', transition: 'all 0.15s ease' }}
    >
      {/* Ala izquierda */}
      <path
        d="M12 17 C12 17, 3 13, 2 7 C1 3, 5 1, 8 4 C10 6, 11 10, 12 13 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Ala derecha */}
      <path
        d="M12 17 C12 17, 21 13, 22 7 C23 3, 19 1, 16 4 C14 6, 13 10, 12 13 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Cuerpo central */}
      <ellipse cx="12" cy="15" rx="1.2" ry="3" fill={color} />
    </svg>
  );
}

// ─── RatingInput ─────────────────────────────────────────────────────
function RatingInput({ value, onChange, saving }) {
  const [hovered, setHovered] = useState(null);
  const active = hovered ?? value ?? 0;

  return (
    <div className="rating-input" aria-label="Puntuación del 1 al 10" onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className="rating-wing-btn"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          disabled={saving}
          title={`${n}/10`}
        >
          <WingIcon filled={n <= active} high={n >= 7} />
        </button>
      ))}
    </div>
  );
}

// ─── Tab: Cargar ─────────────────────────────────────────────────────
function CargarTab({ names, onCreated, onUpdated, onDeleted }) {
  const confirm = useConfirm();
  const toast   = useToast();

  const [form, setForm]         = useState({ text: '', gender: 'female', note: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSaving(true);
    try {
      const created = await createName({
        text:   form.text.trim(),
        gender: form.gender,
        note:   form.note.trim() || null,
      });
      onCreated(created);
      setForm({ text: '', gender: 'female', note: '' });
      toast.success(`"${created.text}" agregado`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (name) => {
    setEditingId(name.id);
    setEditForm({ text: name.text, gender: name.gender, note: name.note || '' });
  };

  const cancelEdit = () => setEditingId(null);

  const handleUpdate = async (nameId) => {
    setSaving(true);
    try {
      const updated = await updateName(nameId, {
        text:   editForm.text.trim(),
        gender: editForm.gender,
        note:   editForm.note.trim() || null,
      });
      onUpdated(updated);
      setEditingId(null);
      toast.success('Nombre actualizado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name) => {
    const ok = await confirm({
      title: `¿Eliminar "${name.text}"?`,
      message: 'Se perderán las puntuaciones asociadas.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteName(name.id);
      onDeleted(name.id);
      toast.success('Nombre eliminado');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = names.filter((n) => {
    if (filter !== 'all' && n.gender !== filter) return false;
    if (search && !n.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats rápidas
  const total   = names.length;
  const byGender = { male: 0, female: 0, unisex: 0 };
  names.forEach((n) => { if (n.gender in byGender) byGender[n.gender]++; });

  return (
    <div>
      {/* Stats */}
      {total > 0 && (
        <div className="names-stats">
          <div className="names-stat">
            <div className="names-stat__number">{total}</div>
            <div className="names-stat__label">en total</div>
          </div>
          {byGender.female > 0 && (
            <div className="names-stat">
              <div className="names-stat__number">{byGender.female}</div>
              <div className="names-stat__label">de mujer</div>
            </div>
          )}
          {byGender.male > 0 && (
            <div className="names-stat">
              <div className="names-stat__number">{byGender.male}</div>
              <div className="names-stat__label">de varón</div>
            </div>
          )}
          {byGender.unisex > 0 && (
            <div className="names-stat">
              <div className="names-stat__number">{byGender.unisex}</div>
              <div className="names-stat__label">unisex</div>
            </div>
          )}
        </div>
      )}

      {/* Formulario de carga */}
      <div className="names-form-card">
        <h3 className="names-form-card__title">Agregar nombre</h3>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              className="form-input"
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Ej: Emma, Mateo, Luca..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Categoría *</label>
            <div className="names-gender-options">
              {GENDERS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  className={`names-gender-btn${form.gender === value ? ` active ${value}` : ''}`}
                  onClick={() => setForm((f) => ({ ...f, gender: value }))}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nota / origen <span style={{ color: 'var(--color-text-light)', fontWeight: 400 }}>(opcional)</span></label>
            <input
              className="form-input"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ej: de origen latino, significa 'luz'..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.text.trim()}>
              {saving ? 'Guardando...' : '+ Agregar nombre'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      {names.length === 0 ? (
        <div className="names-empty">
          <div className="names-empty__icon">🌸</div>
          <div className="names-empty__title">Todavía no hay nombres</div>
          <div className="names-empty__desc">Agregá el primero arriba para empezar.</div>
        </div>
      ) : (
        <>
          {/* Buscador y filtros */}
          <div className="names-search">
            <input
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre..."
            />
          </div>
          <div className="names-filters">
            {[{ v: 'all', l: 'Todos' }, ...GENDERS.map((g) => ({ v: g.value, l: g.label }))].map(({ v, l }) => (
              <button key={v} className={`filter-chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
                {l}
              </button>
            ))}
          </div>

          <div className="names-list">
            {filtered.length === 0 ? (
              <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--space-6)' }}>
                Sin resultados para este filtro.
              </p>
            ) : (
              filtered.map((name) =>
                editingId === name.id ? (
                  /* Modo edición inline */
                  <div key={name.id} className="name-card name-card--editing">
                    <div className="names-form-inline">
                      <div className="names-form-inline__row">
                        <input
                          className="form-input"
                          value={editForm.text}
                          onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                          style={{ flex: 1 }}
                        />
                      </div>
                      <div className="names-gender-options">
                        {GENDERS.map(({ value, label, emoji }) => (
                          <button
                            key={value}
                            type="button"
                            className={`names-gender-btn${editForm.gender === value ? ` active ${value}` : ''}`}
                            onClick={() => setEditForm((f) => ({ ...f, gender: value }))}
                          >
                            {emoji} {label}
                          </button>
                        ))}
                      </div>
                      <input
                        className="form-input"
                        value={editForm.note}
                        onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Nota (opcional)"
                      />
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancelar</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(name.id)} disabled={saving}>
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={name.id} className="name-card fade-in">
                    <div className="name-card__main">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span className="name-card__text">{name.text}</span>
                        <GenderBadge gender={name.gender} />
                      </div>
                      {name.note && <div className="name-card__note">{name.note}</div>}
                      <div className="name-card__ratings-preview">
                        {['martin', 'van'].map((p) => {
                          const r = name.ratings.find((rt) => rt.person === p);
                          return (
                            <span key={p} className={`rating-pill${r ? ' rating-pill--rated' : ''}`}>
                              {p === 'martin' ? 'Martín' : 'Van'}: {r ? r.rating : '—'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="name-card__actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(name)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(name)}>Eliminar</button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Puntuar ─────────────────────────────────────────────────────
function PuntuarTab({ names, activeProfile, onProfileChange, onRated }) {
  const toast               = useToast();
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId]   = useState(null);
  const [filter, setFilter]     = useState('all');
  const [statusFilter, setStatus] = useState('all'); // 'all' | 'unrated' | 'rated'
  const [search, setSearch]     = useState('');
  const feedbackTimer           = useRef(null);

  const handleRate = async (nameId, rating) => {
    if (!activeProfile) return;
    setSavingId(nameId);
    try {
      const updated = await rateName(nameId, activeProfile, rating);
      onRated(nameId, updated);
      clearTimeout(feedbackTimer.current);
      setSavedId(nameId);
      feedbackTimer.current = setTimeout(() => setSavedId(null), 1800);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (!activeProfile) {
    return (
      <div className="profile-selector">
        <h2 className="profile-selector__title">¿Quién va a puntuar?</h2>
        <p style={{ color: 'var(--color-text-light)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          Cada perfil guarda sus puntuaciones por separado.
        </p>
        <div className="profile-cards">
          {[
            { id: 'martin', label: 'Martín', avatar: '👦🏻' },
            { id: 'van',    label: 'Van',    avatar: '👧🏻' },
          ].map(({ id, label, avatar }) => (
            <button key={id} className="profile-card" onClick={() => onProfileChange(id)}>
              <span className="profile-card__avatar">{avatar}</span>
              <span className="profile-card__name">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const profileLabel = activeProfile === 'martin' ? 'Martín' : 'Van';
  const profileAvatar = activeProfile === 'martin' ? '👦🏻' : '👧🏻';

  const rated   = names.filter((n) => n.ratings.some((r) => r.person === activeProfile));
  const unrated = names.filter((n) => !n.ratings.some((r) => r.person === activeProfile));

  const filtered = names.filter((n) => {
    if (filter !== 'all' && n.gender !== filter) return false;
    if (statusFilter === 'rated'   && !n.ratings.some((r) => r.person === activeProfile)) return false;
    if (statusFilter === 'unrated' &&  n.ratings.some((r) => r.person === activeProfile)) return false;
    if (search && !n.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Banner perfil activo */}
      <div className="active-profile-banner">
        <div className="active-profile-banner__info">
          <span style={{ fontSize: '1.4rem' }}>{profileAvatar}</span>
          <span>Puntuando como <strong>{profileLabel}</strong></span>
          <span className="rating-pill rating-pill--rated">{rated.length}/{names.length} puntuados</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onProfileChange(null)}>
          Cambiar perfil
        </button>
      </div>

      {names.length === 0 ? (
        <div className="names-empty">
          <div className="names-empty__icon">📝</div>
          <div className="names-empty__title">No hay nombres para puntuar</div>
          <div className="names-empty__desc">Primero cargá nombres en la pestaña "Cargar".</div>
        </div>
      ) : (
        <>
          {/* Buscador y filtros */}
          <div className="names-search">
            <input
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre..."
            />
          </div>
          <div className="names-filters">
            {[{ v: 'all', l: 'Todos' }, ...GENDERS.map((g) => ({ v: g.value, l: g.label }))].map(({ v, l }) => (
              <button key={v} className={`filter-chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
                {l}
              </button>
            ))}
            <span style={{ width: 1, background: 'var(--color-beige-mid)', margin: '0 4px', alignSelf: 'stretch' }} />
            {[
              { v: 'all',    l: 'Todos' },
              { v: 'unrated', l: 'Sin puntuar' },
              { v: 'rated',   l: 'Ya puntuados' },
            ].map(({ v, l }) => (
              <button key={v} className={`filter-chip${statusFilter === v ? ' active' : ''}`} onClick={() => setStatus(v)}>
                {l}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="names-empty">
              <div className="names-empty__icon">✓</div>
              <div className="names-empty__title">¡Todo puntuado!</div>
              <div className="names-empty__desc">No hay nombres que coincidan con este filtro.</div>
            </div>
          ) : (
            <div className="names-list">
              {filtered.map((name) => {
                const myRating = name.ratings.find((r) => r.person === activeProfile)?.rating ?? null;
                return (
                  <div key={name.id} className="rate-card fade-in">
                    <div className="rate-card__header">
                      <span className="rate-card__name">{name.text}</span>
                      <GenderBadge gender={name.gender} />
                      {savedId === name.id && (
                        <span className="rating-feedback">✓ Guardado</span>
                      )}
                    </div>
                    {name.note && <div className="rate-card__note">{name.note}</div>}
                    <RatingInput
                      value={myRating}
                      onChange={(r) => handleRate(name.id, r)}
                      saving={savingId === name.id}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Ranking ─────────────────────────────────────────────────────
function RankingTab({ names }) {
  const [filter, setFilter]              = useState('all');
  const [sort, setSort]                  = useState('combined');
  const [includeIncomplete, setInclInc]  = useState(false);

  const allEntries = computeRanking(names);
  let entries = allEntries;

  if (filter !== 'all') entries = entries.filter((e) => e.gender === filter);
  if (!includeIncomplete) entries = entries.filter((e) => e.isComplete);
  entries = applyRankingSort(entries, sort);

  const completeCount    = allEntries.filter((e) => e.isComplete).length;
  const pendingMartin    = allEntries.filter((e) => e.martin === null).length;
  const pendingVan       = allEntries.filter((e) => e.van === null).length;
  const perfectMatches   = allEntries.filter((e) => e.matchLabel === 'match_perfecto').length;

  const MEDAL = { 0: '🥇', 1: '🥈', 2: '🥉' };
  const TOP_CLASS = { 0: 'ranking-row--top1', 1: 'ranking-row--top2', 2: 'ranking-row--top3' };

  return (
    <div>
      {/* Stats de compatibilidad */}
      {names.length > 0 && (
        <div className="names-stats">
          <div className="names-stat">
            <div className="names-stat__number">{completeCount}</div>
            <div className="names-stat__label">puntuados por ambos</div>
          </div>
          {perfectMatches > 0 && (
            <div className="names-stat">
              <div className="names-stat__number">{perfectMatches}</div>
              <div className="names-stat__label">match perfecto ✨</div>
            </div>
          )}
          {pendingMartin > 0 && (
            <div className="names-stat">
              <div className="names-stat__number">{pendingMartin}</div>
              <div className="names-stat__label">faltan a Martín</div>
            </div>
          )}
          {pendingVan > 0 && (
            <div className="names-stat">
              <div className="names-stat__number">{pendingVan}</div>
              <div className="names-stat__label">faltan a Van</div>
            </div>
          )}
        </div>
      )}

      {/* Controles de ranking */}
      <div className="ranking-controls">
        <div className="names-filters" style={{ marginBottom: 0 }}>
          {[{ v: 'all', l: 'Todos' }, ...GENDERS.map((g) => ({ v: g.value, l: g.label }))].map(({ v, l }) => (
            <button key={v} className={`filter-chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
              {l}
            </button>
          ))}
        </div>
        <select
          className="form-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ width: 'auto', padding: '6px 10px', fontSize: 'var(--text-sm)' }}
        >
          <option value="combined">Mejor puntaje combinado</option>
          <option value="average">Mejor promedio</option>
          <option value="difference">Menor diferencia</option>
          <option value="martin">Mejor puntaje Martín</option>
          <option value="van">Mejor puntaje Van</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-mid)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeIncomplete}
            onChange={(e) => setInclInc(e.target.checked)}
          />
          Incluir incompletos
        </label>
      </div>

      {names.length === 0 ? (
        <div className="names-empty">
          <div className="names-empty__icon">🌟</div>
          <div className="names-empty__title">El ranking está vacío</div>
          <div className="names-empty__desc">Cargá nombres y puntuá para ver el ranking.</div>
        </div>
      ) : entries.length === 0 ? (
        <div className="names-empty">
          <div className="names-empty__icon">⏳</div>
          <div className="names-empty__title">
            {includeIncomplete ? 'Sin resultados' : 'Ningún nombre puntuado por ambos todavía'}
          </div>
          <div className="names-empty__desc">
            {!includeIncomplete && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setInclInc(true)}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Mostrar incompletos
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="ranking-list">
          {entries.map((entry, idx) => {
            const isFavorite = entry.martin !== null && entry.van !== null
              && entry.martin >= 9 && entry.van >= 9;

            return (
              <div
                key={entry.id}
                className={`ranking-row${entry.isComplete && idx < 3 ? ` ${TOP_CLASS[idx]}` : ''}${!entry.isComplete ? ' ranking-row--incomplete' : ''} fade-in`}
              >
                {/* Posición */}
                <div>
                  {entry.isComplete && idx < 3
                    ? <div className="ranking-medal">{MEDAL[idx]}</div>
                    : <div className="ranking-pos">{idx + 1}</div>
                  }
                </div>

                {/* Info del nombre */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span className="ranking-name">{entry.text}</span>
                    <GenderBadge gender={entry.gender} />
                    {isFavorite && <span style={{ fontSize: '0.85rem' }} title="Ambos le pusieron 9 o más">❤️ Favorito</span>}
                  </div>
                  {entry.note && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', marginBottom: '6px' }}>
                      {entry.note}
                    </div>
                  )}
                  <div className="ranking-scores">
                    <span className="score-chip">
                      Martín: {entry.martin !== null ? entry.martin : '—'}
                    </span>
                    <span className="score-chip">
                      Van: {entry.van !== null ? entry.van : '—'}
                    </span>
                    {entry.average !== null && (
                      <span className="score-chip">
                        Promedio: {entry.average.toFixed(1)}
                      </span>
                    )}
                    {entry.difference !== null && (
                      <span className="score-chip">
                        Dif: {entry.difference}
                      </span>
                    )}
                    <span className={`match-badge match-badge--${entry.matchLabel}`}>
                      {MATCH_LABELS[entry.matchLabel]}
                    </span>
                  </div>
                </div>

                {/* Puntaje combinado */}
                <div className="ranking-combined">
                  {entry.combinedScore !== null ? (
                    <>
                      <div className="ranking-combined__score">
                        {entry.combinedScore.toFixed(1)}
                      </div>
                      <div className="ranking-combined__label">combinado</div>
                    </>
                  ) : (
                    <span className="score-chip score-chip--pending">pendiente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────
const TABS = [
  { id: 'cargar',  label: '📝 Cargar' },
  { id: 'puntuar', label: '⭐ Puntuar' },
  { id: 'ranking', label: '🏆 Ranking' },
];

export default function NamesPage() {
  const toast                           = useToast();
  const [tab, setTab]                   = useState('cargar');
  const [names, setNames]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeProfile, setActiveProfile] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const data = await getNames(null, signal);
      setNames(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('No se pudieron cargar los nombres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Handlers que actualizan el estado local sin refetch
  const handleCreated = (name) => setNames((prev) => [...prev, name]);

  const handleUpdated = (updated) =>
    setNames((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

  const handleDeleted = (id) =>
    setNames((prev) => prev.filter((n) => n.id !== id));

  const handleRated = (nameId, newRating) =>
    setNames((prev) =>
      prev.map((n) => {
        if (n.id !== nameId) return n;
        const existing = n.ratings.find((r) => r.person === newRating.person);
        const ratings  = existing
          ? n.ratings.map((r) => (r.person === newRating.person ? newRating : r))
          : [...n.ratings, newRating];
        return { ...n, ratings };
      })
    );

  return (
    <div className="names-bg">
      {/* Header */}
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'var(--space-6) var(--space-4) 0' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
          Ranking de nombres
        </h1>
        <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
          Cargá nombres, puntuá cada uno y el sistema arma el ranking combinado.
        </p>
      </div>

      {/* Tabs */}
      <div className="names-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`names-tab-btn${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="names-content">
        {loading ? (
          <div className="loading-state">Cargando...</div>
        ) : tab === 'cargar' ? (
          <CargarTab
            names={names}
            onCreated={handleCreated}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ) : tab === 'puntuar' ? (
          <PuntuarTab
            names={names}
            activeProfile={activeProfile}
            onProfileChange={setActiveProfile}
            onRated={handleRated}
          />
        ) : (
          <RankingTab names={names} />
        )}
      </div>
    </div>
  );
}
