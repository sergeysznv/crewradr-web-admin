// Node 22+ exposes an experimental `localStorage` global (undefined unless
// `--localstorage-file` is passed). Vitest's jsdom environment population
// sees that Node key and skips copying jsdom's own `localStorage` onto the
// test global, leaving `window.localStorage` undefined. Rewire the global
// back to the jsdom window so tests can exercise the localStorage cache.
Object.defineProperty(globalThis, 'localStorage', {
  get() {
    const jsdom = (globalThis as { jsdom?: { window: Window } }).jsdom;
    return jsdom?.window.localStorage;
  },
  configurable: true,
});
