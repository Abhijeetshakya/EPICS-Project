// This file is preloaded with --require before anything else runs
if (typeof global.localStorage === 'undefined') {
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (key) => null,
      setItem: (key, value) => {},
      removeItem: (key) => {},
      clear: () => {},
      key: (index) => null,
      length: 0,
    },
    writable: false,
    configurable: true,
  });
}

if (typeof global.sessionStorage === 'undefined') {
  Object.defineProperty(global, 'sessionStorage', {
    value: {
      getItem: (key) => null,
      setItem: (key, value) => {},
      removeItem: (key) => {},
      clear: () => {},
      key: (index) => null,
      length: 0,
    },
    writable: false,
    configurable: true,
  });
}
