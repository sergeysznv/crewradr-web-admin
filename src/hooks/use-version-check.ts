'use client';

import { useEffect } from 'react';

/**
 * Polls /version.txt every 60 s.  When the deployed git SHA changes the
 * page force-reloads so the user always sees the latest build.
 *
 * Cloudflare Pages purges its own edge cache on deploy, but browsers may
 * still hold stale HTML.  A version-mismatch reload is the simplest way
 * to guarantee every visitor gets the newest assets without manual
 * cache-busting or service-worker complexity.
 */
export function useVersionCheck() {
  useEffect(() => {
    let currentVersion: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchVersion(): Promise<string | null> {
      try {
        const res = await fetch(`/version.txt?v=${Date.now()}`);
        if (!res.ok) return null;
        return (await res.text()).trim();
      } catch {
        // Silently ignore network errors — version.txt may not exist on
        // misconfigured subdomains (e.g. www.admin.crewradr.app).
        return null;
      }
    }

    async function check() {
      const version = await fetchVersion();
      if (!version) return;
      if (currentVersion === null) {
        // First fetch — remember the deployed version.
        currentVersion = version;
        return;
      }
      if (version !== currentVersion) {
        // New deploy detected — force a fresh load.
        window.location.reload();
      }
    }

    // Initial fetch to capture the current version.
    fetchVersion().then((v) => {
      if (v) currentVersion = v;
    });

    // Poll every 60 s.
    timer = setInterval(check, 60_000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);
}
