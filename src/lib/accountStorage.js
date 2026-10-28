const getAccountScope = () => {
  try {
    const token = localStorage.getItem('token');
    const payload = token?.split('.')[1];
    if (!payload) return 'anonymous';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized));
    const userId = decoded.id;
    return Number.isSafeInteger(Number(userId)) && Number(userId) > 0
      ? `user-${Number(userId)}`
      : 'anonymous';
  } catch {
    return 'anonymous';
  }
};

const scopedKey = (key, scope = getAccountScope()) => `longdrive:${scope}:${key}`;

export const accountStorage = {
  getScope() {
    return getAccountScope();
  },

  getItem(key, scope) {
    return localStorage.getItem(scopedKey(key, scope));
  },

  setItem(key, value, scope) {
    const storageKey = scopedKey(key, scope);
    localStorage.setItem(storageKey, value);
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: String(value),
      storageArea: localStorage,
    }));
  },

  removeItem(key, scope) {
    localStorage.removeItem(scopedKey(key, scope));
  },

  clear(scope) {
    const prefix = `longdrive:${scope || getAccountScope()}:`;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) localStorage.removeItem(key);
    }
  },
};
