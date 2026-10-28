import { useState, useMemo, useCallback } from 'react';

/**
 * Hook do live search, filtrowania i sortowania list danych.
 *
 * Użycie:
 *   const {
 *     query, setQuery,
 *     filters, setFilter, clearFilters,
 *     sortConfig, setSort,
 *     result, totalCount, filteredCount,
 *   } = useSearch(data, {
 *     searchFields: ['name', 'plateNumber', 'brand'],
 *     defaultSort: { field: 'createdAt', direction: 'desc' },
 *   });
 */
export function useSearch(data = [], options = {}) {
  const {
    searchFields = [],
    defaultSort = { field: null, direction: 'asc' },
    defaultFilters = {},
  } = options;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [sortConfig, setSortConfig] = useState(defaultSort);

  // Ustaw pojedynczy filtr
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Wyczyść wszystkie filtry
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setQuery('');
  }, [defaultFilters]);

  // Zmień sortowanie (toggle direction jeśli to samo pole)
  const setSort = useCallback((field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Główna logika filtrowania i sortowania
  const result = useMemo(() => {
    let items = Array.isArray(data) ? [...data] : [];

    // 1. Live search po polach tekstowych
    if (query.trim() && searchFields.length > 0) {
      const q = query.trim().toLowerCase();
      items = items.filter(item =>
        searchFields.some(field => {
          // Obsługa zagnieżdżonych pól: "driver.name"
          const value = field.split('.').reduce((obj, key) => obj?.[key], item);
          return value != null && String(value).toLowerCase().includes(q);
        })
      );
    }

    // 2. Filtry
    for (const [key, value] of Object.entries(filters)) {
      if (value === '' || value === null || value === undefined || value === 'all') continue;

      if (key.endsWith('_from') || key.endsWith('_gte')) {
        const baseKey = key.replace(/_from$|_gte$/, '');
        items = items.filter(item => {
          const itemVal = item[baseKey];
          if (!itemVal) return true;
          return new Date(itemVal) >= new Date(value);
        });
      } else if (key.endsWith('_to') || key.endsWith('_lte')) {
        const baseKey = key.replace(/_to$|_lte$/, '');
        items = items.filter(item => {
          const itemVal = item[baseKey];
          if (!itemVal) return true;
          return new Date(itemVal) <= new Date(value);
        });
      } else {
        items = items.filter(item => {
          const itemVal = item[key];
          if (Array.isArray(itemVal)) return itemVal.includes(value);
          return String(itemVal) === String(value);
        });
      }
    }

    // 3. Sortowanie
    if (sortConfig.field) {
      items.sort((a, b) => {
        const aVal = sortConfig.field.split('.').reduce((obj, k) => obj?.[k], a);
        const bVal = sortConfig.field.split('.').reduce((obj, k) => obj?.[k], b);

        // Daty
        if (aVal && bVal && !isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) {
          const diff = new Date(aVal) - new Date(bVal);
          return sortConfig.direction === 'asc' ? diff : -diff;
        }

        // Liczby
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Tekst
        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        const cmp = aStr.localeCompare(bStr, 'pl');
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return items;
  }, [data, query, filters, sortConfig, searchFields]);

  const hasActiveFilters = query.trim() !== '' ||
    Object.values(filters).some(v => v !== '' && v !== null && v !== undefined && v !== 'all');

  return {
    query,
    setQuery,
    filters,
    setFilter,
    clearFilters,
    sortConfig,
    setSort,
    result,
    totalCount: data.length,
    filteredCount: result.length,
    hasActiveFilters,
  };
}