import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
  title: "EVO2 Variant Analysis — Genomic Intelligence Platform",
  description: "AI-powered variant effect prediction using the EVO2 large language model. Predict pathogenicity of single nucleotide variants with NVIDIA H100 GPU acceleration.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

// Polyfill for server-side localStorage - check if methods work
const needsLocalStoragePolyfill = (() => {
  try {
    if (typeof globalThis === "undefined") return false;
    if (typeof globalThis.localStorage === "undefined") return true;
    if (typeof globalThis.localStorage.getItem !== "function") return true;
    return false;
  } catch {
    return true;
  }
})();

if (needsLocalStoragePolyfill) {
  (globalThis as any).localStorage = {
    _data: {} as Record<string, string>,
    getItem(key: string) { return this._data[key] ?? null; },
    setItem(key: string, value: string) { this._data[key] = String(value); },
    removeItem(key: string) { delete this._data[key]; },
    clear() { this._data = {}; },
    key(index: number) { return Object.keys(this._data)[index] ?? null; },
    get length() { return Object.keys(this._data).length; },
  };
}

const needsSessionStoragePolyfill = (() => {
  try {
    if (typeof globalThis === "undefined") return false;
    if (typeof globalThis.sessionStorage === "undefined") return true;
    if (typeof globalThis.sessionStorage.getItem !== "function") return true;
    return false;
  } catch {
    return true;
  }
})();

if (needsSessionStoragePolyfill) {
  (globalThis as any).sessionStorage = {
    _data: {} as Record<string, string>,
    getItem(key: string) { return this._data[key] ?? null; },
    setItem(key: string, value: string) { this._data[key] = String(value); },
    removeItem(key: string) { delete this._data[key]; },
    clear() { this._data = {}; },
    key(index: number) { return Object.keys(this._data)[index] ?? null; },
    get length() { return Object.keys(this._data).length; },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
