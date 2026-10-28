import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Przycisk nagłówka kolumny z sortowaniem.
 *
 * Użycie:
 *   <SortButton field="name" sortConfig={sortConfig} onSort={setSort}>
 *     Nazwa
 *   </SortButton>
 */
export default function SortButton({ field, sortConfig, onSort, children, className = '' }) {
  const isActive = sortConfig?.field === field;
  const direction = sortConfig?.direction;

  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-left font-medium transition-colors hover:text-primary ${
        isActive ? 'text-primary' : 'text-[var(--text-muted)]'
      } ${className}`}
    >
      {children}
      <span className="ml-1">
        {!isActive && <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />}
        {isActive && direction === 'asc' && <ChevronUp className="w-3.5 h-3.5" />}
        {isActive && direction === 'desc' && <ChevronDown className="w-3.5 h-3.5" />}
      </span>
    </button>
  );
}