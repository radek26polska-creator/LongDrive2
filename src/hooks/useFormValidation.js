import { useState, useCallback, useRef } from 'react';
import { validate, validateForm } from '@/lib/validation';

/**
 * Hook do walidacji formularza na żywo.
 *
 * Użycie:
 *   const { errors, touched, validateField, validateAll, touch, reset } =
 *     useFormValidation(values, schema);
 *
 * schema = {
 *   name: [rules.required(), rules.minLength(2)],
 *   email: [rules.required(), rules.email()],
 * }
 */
export function useFormValidation(values, schema) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  // Oznacz pole jako dotknięte i zwaliduj je
  const touch = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validate(values[field], schemaRef.current[field] || []);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [values]);

  // Waliduj pojedyncze pole (np. przy onChange)
  const validateField = useCallback((field, value) => {
    if (!touched[field]) return; // waliduj tylko pola które były dotknięte
    const error = validate(value, schemaRef.current[field] || []);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [touched]);

  // Waliduj wszystkie pola (np. przy submit)
  const validateAll = useCallback(() => {
    const { errors: allErrors, isValid } = validateForm(values, schemaRef.current);
    setErrors(allErrors);
    // Oznacz wszystkie jako touched
    const allTouched = Object.keys(schemaRef.current).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    return isValid;
  }, [values]);

  // Reset walidacji
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  // Sprawdź czy formularz ma błędy (tylko dla pól touched)
  const hasErrors = Object.keys(errors).some(k => touched[k] && errors[k]);

  // Pomocnik dla props inputa
  const fieldProps = useCallback((field) => ({
    onBlur: () => touch(field),
    onChange: (e) => validateField(field, e.target.value),
    'aria-invalid': touched[field] && !!errors[field],
  }), [touch, validateField, errors, touched]);

  return {
    errors,
    touched,
    hasErrors,
    touch,
    validateField,
    validateAll,
    reset,
    fieldProps,
    // Błąd pola tylko jeśli był touched
    getError: (field) => touched[field] ? errors[field] : null,
  };
}