"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours fallback across iOS Safari tab discards

interface StoredEnvelope<T> {
  v: T;
  ts: number;
}

const emptySubscribe = () => () => {};

/**
 * Hydration-safe client-mounted check (React 19 compliant, no setState in effect).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Safely read persisted state from sessionStorage first, falling back to localStorage (with TTL).
 */
export function readPersistedState<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const rawSession = window.sessionStorage.getItem(key);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as StoredEnvelope<T>;
      if (parsed && typeof parsed === "object" && "v" in parsed) {
        return parsed.v;
      }
    }
  } catch {
    // Ignore storage access errors (private browsing / quota)
  }

  try {
    const rawLocal = window.localStorage.getItem(key);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as StoredEnvelope<T>;
      if (
        parsed &&
        typeof parsed === "object" &&
        "v" in parsed &&
        typeof parsed.ts === "number" &&
        Date.now() - parsed.ts < TTL_MS
      ) {
        return parsed.v;
      }
    }
  } catch {
    // Ignore storage access errors
  }

  return null;
}

/**
 * Write state to both sessionStorage and localStorage so it survives
 * tab switches, mobile Google Maps app hand-offs, and Safari background tab discards.
 */
export function writePersistedState<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ v: value, ts: Date.now() } satisfies StoredEnvelope<T>);
  try {
    window.sessionStorage.setItem(key, payload);
  } catch {
    // Ignore
  }
  try {
    window.localStorage.setItem(key, payload);
  } catch {
    // Ignore
  }
}

export function clearPersistedState(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Sync query parameters into the browser address bar WITHOUT triggering a Next.js
 * navigation or page reload.
 */
export function replaceUrlQueryParams(params: URLSearchParams): void {
  if (typeof window === "undefined") return;
  const qs = params.toString();
  const nextUrl = qs
    ? `${window.location.pathname}?${qs}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(window.history.state, "", nextUrl);
  }
}

// Module-level store registry for useSyncExternalStore (referentially stable snapshots)
interface StoreEntry<T> {
  value: T;
  lastUrlKey: string;
}

const storeEntries = new Map<string, StoreEntry<unknown>>();
const storeListeners = new Map<string, Set<() => void>>();

function subscribeToStore(key: string, listener: () => void): () => void {
  let listeners = storeListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    storeListeners.set(key, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
  };
}

function emitStoreChange(key: string): void {
  const listeners = storeListeners.get(key);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Hydration-safe persisted state backed by URL query params + sessionStorage + localStorage.
 * Survives switching tabs / opening Google Maps app / iOS Safari tab discards / browser Back
 * WITHOUT reloading the page or losing filters.
 */
export function usePersistedFilterStore<T>(options: {
  storageKey: string;
  urlKey: string;
  serverDefault: T;
  resolveClientState: () => T;
  serializeToUrlParams: (state: T) => URLSearchParams;
}): [T, (updater: T | ((prev: T) => T)) => void, (defaultState: T) => void] {
  const {
    storageKey,
    urlKey,
    serverDefault,
    resolveClientState,
    serializeToUrlParams,
  } = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToStore(storageKey, onStoreChange),
    [storageKey]
  );

  const getSnapshot = useCallback((): T => {
    const existing = storeEntries.get(storageKey) as StoreEntry<T> | undefined;
    // Re-resolve if first client read OR if user navigated via an explicit non-empty external URL query
    if (!existing || (urlKey.length > 0 && urlKey !== existing.lastUrlKey)) {
      const resolved = resolveClientState();
      const entry: StoreEntry<T> = { value: resolved, lastUrlKey: urlKey };
      storeEntries.set(storageKey, entry);
      return resolved;
    }
    return existing.value;
  }, [storageKey, urlKey, resolveClientState]);

  const getServerSnapshot = useCallback((): T => serverDefault, [serverDefault]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mirror restored persisted filters into the URL bar cleanly on mount/update (no navigation reload)
  useEffect(() => {
    const params = serializeToUrlParams(state);
    const nextUrlKey = params.toString();
    const entry = storeEntries.get(storageKey);
    if (entry) {
      entry.lastUrlKey = nextUrlKey;
    }
    replaceUrlQueryParams(params);
  }, [storageKey, state, serializeToUrlParams]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const currentEntry = storeEntries.get(storageKey) as StoreEntry<T> | undefined;
      const prev = currentEntry ? currentEntry.value : resolveClientState();
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(prev)
          : updater;

      const params = serializeToUrlParams(next);
      storeEntries.set(storageKey, {
        value: next,
        lastUrlKey: params.toString(),
      });
      writePersistedState(storageKey, next);
      replaceUrlQueryParams(params);
      emitStoreChange(storageKey);
    },
    [storageKey, resolveClientState, serializeToUrlParams]
  );

  const resetState = useCallback(
    (defaultState: T) => {
      const params = serializeToUrlParams(defaultState);
      storeEntries.set(storageKey, {
        value: defaultState,
        lastUrlKey: params.toString(),
      });
      clearPersistedState(storageKey);
      clearPersistedState(`${storageKey}:scroll`);
      replaceUrlQueryParams(params);
      emitStoreChange(storageKey);
    },
    [storageKey, serializeToUrlParams]
  );

  return [state, setState, resetState];
}

/**
 * Persist and restore vertical scroll position across tab switches / background reloads.
 */
export function useScrollPreservation(storageKey: string, enabled = true): void {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!enabled || restoredRef.current || typeof window === "undefined") return;
    restoredRef.current = true;

    const scrollKey = `${storageKey}:scroll`;
    const saved = readPersistedState<number>(scrollKey);
    if (typeof saved === "number" && saved > 0) {
      const raf = window.requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [storageKey, enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const scrollKey = `${storageKey}:scroll`;
    let timer: number | null = null;

    const saveNow = () => {
      writePersistedState(scrollKey, window.scrollY);
    };

    const onScroll = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        saveNow();
      }, 150);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveNow();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storageKey]);
}
