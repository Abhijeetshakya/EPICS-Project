// Polyfill localStorage and sessionStorage BEFORE anything else
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: (key) => null,
    setItem: (key, value) => {},
    removeItem: (key) => {},
    clear: () => {},
    key: (index) => null,
    length: 0,
  };
}

if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = {
    getItem: (key) => null,
    setItem: (key, value) => {},
    removeItem: (key) => {},
    clear: () => {},
    key: (index) => null,
    length: 0,
  };
}

// Suppress the localStorage warning
process.env.NODE_OPTIONS = '';
