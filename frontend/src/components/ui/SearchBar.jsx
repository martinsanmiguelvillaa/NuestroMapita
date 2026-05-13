import { useState } from 'react';

/**
 * Barra de búsqueda simple.
 * onChange se llama en cada keystroke (búsqueda en tiempo real).
 */
export default function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="search-bar">
      <span style={{ color: 'var(--color-text-light)', fontSize: '1rem' }}>⌕</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-light)',
            fontSize: '1rem',
            padding: '0 4px',
          }}
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}
