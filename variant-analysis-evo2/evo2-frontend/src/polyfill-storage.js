// Polyfill for localStorage on Node.js server side
// Check if localStorage exists and has working methods
const needsLocalStoragePolyfill = (() => {
  try {
    if (typeof localStorage === 'undefined') return true;
    if (typeof localStorage.getItem !== 'function') return true;
    // Test if it actually works
    localStorage.getItem('__test__');
    return false;
  } catch {
    return true;
  }
})();

if (needsLocalStoragePolyfill) {
  const storage = {};
  globalThis.localStorage = {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    key: (index) => Object.keys(storage)[index] ?? null,
    get length() { return Object.keys(storage).length; },
  };
}

const needsSessionStoragePolyfill = (() => {
  try {
    if (typeof sessionStorage === 'undefined') return true;
    if (typeof sessionStorage.getItem !== 'function') return true;
    sessionStorage.getItem('__test__');
    return false;
  } catch {
    return true;
  }
})();

if (needsSessionStoragePolyfill) {
  const storage = {};
  globalThis.sessionStorage = {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    key: (index) => Object.keys(storage)[index] ?? null,
    get length() { return Object.keys(storage).length; },
  };
}
