import { useEffect, useRef, useCallback } from 'react';
import { accountStorage } from '@/lib/accountStorage';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook do automatycznego zapisywania draftu formularza w localStorage.
 *
 * Użycie:
 *   const { clearDraft, hasDraft } = useFormDraft('trip-form', values, setValues);
 *
 * @param {string} key - unikalny klucz w localStorage
 * @param {object} values - aktualne wartości formularza
 * @param {function} setValues - setter stanu formularza
 * @param {object} options
 *   @param {number} options.debounceMs - opóźnienie zapisu (domyślnie 800ms)
 *   @param {string[]} options.exclude - pola które nie mają być zapisywane
 *   @param {boolean} options.restoreOnMount - czy przywrócić draft przy montowaniu (domyślnie true)
 */
export function useFormDraft(key, values, setValues, options = {}) {
  const { user } = useAuth();
  const {
    debounceMs = 800,
    exclude = [],
    restoreOnMount = true,
  } = options;

  const storageKey = `draft_${key}`;
  const storageScope = user?.id ? `user-${Number(user.id)}` : accountStorage.getScope();
  const timerRef = useRef(null);
  const restoredScopeRef = useRef(null);
  const savedScopeRef = useRef(null);
  const initialValuesRef = useRef(values);

  // Przywróć draft przy pierwszym załadowaniu
  useEffect(() => {
    if (restoredScopeRef.current === storageScope) return;
    restoredScopeRef.current = storageScope;
    if (!restoreOnMount) return;

    try {
      const raw = accountStorage.getItem(storageKey, storageScope);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') return;

      // Scal draft z aktualnymi wartościami (nie nadpisuj pól z exclude)
      const merged = { ...initialValuesRef.current };
      for (const [k, v] of Object.entries(draft)) {
        if (!exclude.includes(k) && v !== null && v !== undefined && v !== '') {
          merged[k] = v;
        }
      }
      setValues(merged);
    } catch (e) {
      // uszkodzony draft — usuń
      accountStorage.removeItem(storageKey, storageScope);
    }
  }, [restoreOnMount, storageKey, storageScope, exclude, setValues]);

  // Zapisuj draft z debouncingiem przy każdej zmianie
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedScopeRef.current !== storageScope) {
      savedScopeRef.current = storageScope;
      return undefined;
    }

    timerRef.current = setTimeout(() => {
      if (restoredScopeRef.current !== storageScope) return;
      try {
        const toSave = { ...values };
        exclude.forEach(k => delete toSave[k]);
        // Dodaj timestamp
        toSave._draftSavedAt = new Date().toISOString();
        accountStorage.setItem(storageKey, JSON.stringify(toSave), storageScope);
      } catch (e) {
        // localStorage pełne lub niedostępne
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [values, storageKey, debounceMs, exclude, storageScope]);

  // Wyczyść draft (np. po zapisaniu formularza)
  const clearDraft = useCallback(() => {
    accountStorage.removeItem(storageKey, storageScope);
  }, [storageKey, storageScope]);

  // Sprawdź czy draft istnieje i kiedy był zapisany
  const getDraftInfo = useCallback(() => {
    try {
      const raw = accountStorage.getItem(storageKey, storageScope);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      return {
        exists: true,
        savedAt: draft._draftSavedAt ? new Date(draft._draftSavedAt) : null,
      };
    } catch {
      return null;
    }
  }, [storageKey, storageScope]);

  const hasDraft = !!accountStorage.getItem(storageKey, storageScope);

  return { clearDraft, hasDraft, getDraftInfo };
}