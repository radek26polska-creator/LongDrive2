// Reguły walidacji pól formularza — używane w useFormValidation

export const rules = {
  required: (msg = 'To pole jest wymagane') => (value) => {
    if (value === null || value === undefined) return msg;
    if (typeof value === 'string' && value.trim() === '') return msg;
    if (typeof value === 'number' && isNaN(value)) return msg;
    return null;
  },

  minLength: (min, msg) => (value) => {
    if (!value || String(value).length < min)
      return msg || `Minimum ${min} znaków`;
    return null;
  },

  maxLength: (max, msg) => (value) => {
    if (value && String(value).length > max)
      return msg || `Maksimum ${max} znaków`;
    return null;
  },

  min: (minVal, msg) => (value) => {
    if (value === '' || value === null || value === undefined) return null;
    if (Number(value) < minVal)
      return msg || `Minimalna wartość: ${minVal}`;
    return null;
  },

  max: (maxVal, msg) => (value) => {
    if (value === '' || value === null || value === undefined) return null;
    if (Number(value) > maxVal)
      return msg || `Maksymalna wartość: ${maxVal}`;
    return null;
  },

  pattern: (regex, msg = 'Nieprawidłowy format') => (value) => {
    if (!value) return null;
    return regex.test(value) ? null : msg;
  },

  email: (msg = 'Nieprawidłowy adres email') => (value) => {
    if (!value) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : msg;
  },

  phone: (msg = 'Nieprawidłowy numer telefonu') => (value) => {
    if (!value) return null;
    return /^[\d\s+\-()]{7,20}$/.test(value) ? null : msg;
  },

  nip: (msg = 'Nieprawidłowy NIP (10 cyfr)') => (value) => {
    if (!value) return null;
    const digits = value.replace(/[\s-]/g, '');
    return /^\d{10}$/.test(digits) ? null : msg;
  },

  plateNumber: (msg = 'Nieprawidłowy numer rejestracyjny') => (value) => {
    if (!value) return null;
    return /^[A-Z0-9]{4,8}$/i.test(value.replace(/[\s-]/g, '')) ? null : msg;
  },

  vin: (msg = 'VIN musi mieć 17 znaków') => (value) => {
    if (!value) return null;
    return value.replace(/\s/g, '').length === 17 ? null : msg;
  },

  year: (msg = 'Nieprawidłowy rok') => (value) => {
    if (!value) return null;
    const y = Number(value);
    const currentYear = new Date().getFullYear();
    return y >= 1900 && y <= currentYear + 1 ? null : msg;
  },

  mileage: (msg = 'Przebieg musi być liczbą dodatnią') => (value) => {
    if (value === '' || value === null || value === undefined) return null;
    return Number(value) >= 0 ? null : msg;
  },

  dateNotFuture: (msg = 'Data nie może być w przyszłości') => (value) => {
    if (!value) return null;
    return new Date(value) <= new Date() ? null : msg;
  },

  dateNotPast: (msg = 'Data nie może być w przeszłości') => (value) => {
    if (!value) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(value) >= today ? null : msg;
  },

  endDateAfterStart: (startValue, msg = 'Data końca musi być po dacie początku') => (value) => {
    if (!value || !startValue) return null;
    return new Date(value) >= new Date(startValue) ? null : msg;
  },

  mileageGreaterThan: (compareValue, msg) => (value) => {
    if (!value || !compareValue) return null;
    return Number(value) >= Number(compareValue)
      ? null
      : msg || `Przebieg musi być >= ${compareValue} km`;
  },

  custom: (fn, msg = 'Nieprawidłowa wartość') => (value) => {
    return fn(value) ? null : msg;
  },
};

// Uruchom wiele reguł na jednej wartości, zwróć pierwszy błąd
export function validate(value, fieldRules = []) {
  for (const rule of fieldRules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

// Waliduj cały obiekt formularza według schematu
// schema = { fieldName: [rule1, rule2, ...], ... }
export function validateForm(values, schema) {
  const errors = {};
  let isValid = true;
  for (const [field, fieldRules] of Object.entries(schema)) {
    const error = validate(values[field], fieldRules);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }
  return { errors, isValid };
}