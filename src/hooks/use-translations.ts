'use client';

import { useCallback, useEffect, useState } from 'react';
import enMessages from '@/messages/en.json';

type Messages = Record<string, string>;

const messagesMap: Record<string, () => Promise<{ default: Messages }>> = {
  en: () => import('@/messages/en.json'),
  fr: () => import('@/messages/fr.json'),
  es: () => import('@/messages/es.json'),
  ru: () => import('@/messages/ru.json'),
  zh: () => import('@/messages/zh.json'),
  ar: () => import('@/messages/ar.json'),
};

const SUPPORTED = new Set(Object.keys(messagesMap));

let cachedLocale = 'en';
// Seed with English so t() never renders raw keys before a locale loads.
let cachedMessages: Messages | null = enMessages;
const listeners = new Set<() => void>();

export function getLocale(): string {
  return cachedLocale;
}

export function setLocale(locale: string) {
  // Unknown/unexpected preference values (e.g. a stale 'de' in the profile)
  // would previously produce an empty message table and raw keys everywhere.
  if (!SUPPORTED.has(locale)) locale = 'en';
  cachedLocale = locale;
  cachedMessages = locale === 'en' ? enMessages : null;
  if (typeof window !== 'undefined') {
    localStorage.setItem('crewradr-locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }
  listeners.forEach((fn) => fn());
}

export function subscribeToLocale(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useLocale() {
  const [locale, setLocaleState] = useState(cachedLocale);

  useEffect(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crewradr-locale');
      if (stored && messagesMap[stored]) {
        setLocale(stored);
      }
    }
    const unsub = subscribeToLocale(() => setLocaleState(cachedLocale));
    return unsub;
  }, []);

  const setLocaleFn = useCallback((l: string) => {
    setLocale(l);
  }, []);

  return { locale, setLocale: setLocaleFn };
}

const IMPERIAL_LOCALES = new Set(['en']); // US English uses imperial

export function isImperial(locale?: string): boolean {
  return IMPERIAL_LOCALES.has(locale ?? cachedLocale);
}

export function formatDistance(km: number, locale?: string): string {
  if (isImperial(locale)) return `${(km * 0.621371).toFixed(0)} mi`;
  return `${Math.round(km)} km`;
}

export function formatSpeed(ms: number, locale?: string): string {
  const kph = ms * 3.6;
  if (isImperial(locale)) return `${(kph * 0.621371).toFixed(0)} mph`;
  return `${Math.round(kph)} km/h`;
}

export function useT() {
  const [messages, setMessages] = useState<Messages | null>(cachedMessages);
  const locale = cachedLocale;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loader = messagesMap[cachedLocale];
      if (!loader) {
        cachedMessages = enMessages;
        if (!cancelled) setMessages(enMessages);
        return;
      }
      try {
        const mod = await loader();
        cachedMessages = mod.default;
      } catch {
        cachedMessages = enMessages;
      }
      if (!cancelled) setMessages(cachedMessages);
    }
    if (!cachedMessages) {
      load();
    }
    const unsub = subscribeToLocale(() => {
      cachedMessages = cachedLocale === 'en' ? enMessages : null;
      load();
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const msg = messages?.[key] ?? key;
    if (!params) return msg;
    return msg.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  }, [messages]);

  return { t, locale, messages };
}
