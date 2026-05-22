// instrumentation.ts - Loads before any other code in Next.js
// This ensures localStorage polyfill is available for all modules

export async function register() {
  // Polyfill localStorage for server-side
  if (typeof globalThis !== "undefined" && typeof globalThis.localStorage === "undefined") {
    (globalThis as any).localStorage = {
      _data: {} as Record<string, string>,
      getItem(key: string): string | null {
        return this._data[key] ?? null;
      },
      setItem(key: string, value: string): void {
        this._data[key] = String(value);
      },
      removeItem(key: string): void {
        delete this._data[key];
      },
      clear(): void {
        this._data = {};
      },
      key(index: number): string | null {
        return Object.keys(this._data)[index] ?? null;
      },
      get length(): number {
        return Object.keys(this._data).length;
      },
    };
  }

  // Polyfill sessionStorage for server-side
  if (typeof globalThis !== "undefined" && typeof globalThis.sessionStorage === "undefined") {
    (globalThis as any).sessionStorage = {
      _data: {} as Record<string, string>,
      getItem(key: string): string | null {
        return this._data[key] ?? null;
      },
      setItem(key: string, value: string): void {
        this._data[key] = String(value);
      },
      removeItem(key: string): void {
        delete this._data[key];
      },
      clear(): void {
        this._data = {};
      },
      key(index: number): string | null {
        return Object.keys(this._data)[index] ?? null;
      },
      get length(): number {
        return Object.keys(this._data).length;
      },
    };
  }
}
