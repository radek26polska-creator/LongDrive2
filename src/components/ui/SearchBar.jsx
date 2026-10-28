import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Gotowy pasek wyszukiwania z licznikiem wyników.
 *
 * Użycie:
 *   <SearchBar
 *     query={query}
 *     onQueryChange={setQuery}
 *     totalCount={vehicles.length}
 *     filteredCount={result.length}
 *     placeholder="Szukaj pojazdu..."
 *     onClear={clearFilters}
 *     hasActiveFilters={hasActiveFilters}
 *   />
 */
export default function SearchBar({
  query,
  onQueryChange,
  placeholder = 'Szukaj...',
  totalCount,
  filteredCount,
  hasActiveFilters,
  onClear,
  onFiltersToggle,
  showFiltersButton = false,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-[var(--surface)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {showFiltersButton && (
        <Button
          variant="outline"
          size="icon"
          onClick={onFiltersToggle}
          className={`border-[var(--border-color)] ${hasActiveFilters ? 'border-primary text-primary bg-primary/10' : 'text-[var(--text-muted)]'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      )}

      {hasActiveFilters && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] whitespace-nowrap"
        >
          <X className="w-3 h-3 mr-1" />
          Wyczyść
        </Button>
      )}

      {totalCount !== undefined && (
        <span className="text-sm text-[var(--text-muted)] whitespace-nowrap">
          {hasActiveFilters ? (
            <span>
              <span className="text-primary font-medium">{filteredCount}</span>
              <span> / {totalCount}</span>
            </span>
          ) : (
            <span>{totalCount}</span>
          )}
        </span>
      )}
    </div>
  );
}