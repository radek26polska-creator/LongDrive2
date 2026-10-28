import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
            {title}
          </h2>
          <button onClick={onClose} aria-label="Zamknij" className="rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="mb-6 text-[var(--text-primary)]">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              Usuń
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}