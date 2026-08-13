'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/hooks/use-translations';
import { useBranding } from '@/hooks/use-branding';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useTheme } from '@/hooks/useTheme';
import { useVersionCheck } from '@/hooks/use-version-check';
import { useVisibilityRefetch } from '@/hooks/useRealtimeRefresh';
import { useCrew } from '@/hooks/useCrew';
import { IdleWarningOverlay, SignedOutOverlay } from '@/components/session-locked-overlay';
import { ShellErrorBoundary } from '@/components/shared/ErrorBoundary';
import { FontScaleProvider } from '@/components/settings/FontScaleProvider';
import { MeasurementProvider } from '@/components/settings/MeasurementProvider';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { DowngradeBanner } from '@/components/tier/DowngradeBanner';
import { LockoutBanner } from '@/components/tier/LockoutBanner';
import { MultiCrewSwitcher } from '@/components/shared/MultiCrewSwitcher';
import { useTabFocus } from '@/hooks/useTabFocus';
import { supabase } from '@/lib/supabase/client';
import { tierColor, tierLabel } from '@/lib/utils';
import {
  LayoutDashboard, Users, Settings, ShieldCheck, FileText, Link, MapPin, LogOut,
  Loader2, ChevronLeft, ChevronRight, Menu, X, Sparkles, Crown, ArrowUp, Plug,
  Route, BarChart3,
} from 'lucide-react';
import type { CrewSummary } from '@/types';

// Routes that exist in the redesign. minTier: 0 deckhand, 1 first mate,
// 2 captain, 3 admiral.
const NAV_ITEMS = [
  { href: '/fleet', label: 'webNavFleet', icon: LayoutDashboard, minTier: 1 }, // first mate+
  { href: '/map', label: 'webNavLiveMap', icon: MapPin, minTier: 3 },
  { href: '/trips', label: 'webNavTrips', icon: Route, minTier: 1 },
  { href: '/members', label: 'webNavMembers', icon: Users, minTier: 1 }, // first mate: read-only
  { href: '/reports', label: 'webNavReports', icon: BarChart3, minTier: 1 },
  { href: '/settings', label: 'webNavCrewSettings', icon: Settings, minTier: 2 },
  { href: '/audit-log', label: 'webNavAuditLog', icon: FileText, minTier: 3 },
  { href: '/compliance', label: 'webNavCompliance', icon: ShieldCheck, minTier: 3 },
  { href: '/provisioning', label: 'webNavProvisioning', icon: Link, minTier: 3 },
  { href: '/integrations', label: 'webNavIntegrations', icon: Plug, minTier: 3 },
];

// ── Shared nav items renderer (module scope: never create components
// during render) ──
function NavItems({ items, pathname, t, mobile, onNavigate }: {
  items: typeof NAV_ITEMS;
  pathname: string;
  t: (key: string) => string;
  mobile?: boolean;
  onNavigate: (href: string) => void;
}) {
  return items.map((item) => {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <button
        key={item.href}
        onClick={() => onNavigate(item.href)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? 'bg-primary-container text-on-primary-container'
            : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
        } ${mobile ? 'py-3' : 'py-2.5'}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{t(item.label)}</span>
      </button>
    );
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();
  const { t } = useT();
  const { resolved, toggleTheme } = useTheme();
  const { setCrew, setCrews: setCrewContext } = useCrew();
  useVersionCheck();

  const [checking, setChecking] = useState(true);
  const [crews, setCrews] = useState<CrewSummary[]>([]);
  const [activeCrewId, setActiveCrewId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [loadError, setLoadError] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const palette = useBranding(activeCrewId, userTier);
  const { idleWarning, staySignedIn, handleSignOut } = useSessionTimeout();

  // Refetch all queries when the tab becomes visible again.
  useVisibilityRefetch();
  // Reconnect Realtime + invalidate crewSettings when the tab regains focus.
  useTabFocus();

  const loadCrews = useCallback(async () => {
    setLoadError(false);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_web_account_profile');
      if (rpcErr) { setLoadError(true); setCrews([]); return; }
      const c = (data?.crews ?? []) as CrewSummary[];
      setCrews(c);
      // Keep the CrewProvider context (used by pages) in sync.
      setCrewContext(c.map((x) => ({ crew_id: x.crew_id, crew_name: x.crew_name, tier: x.tier, role: x.role })));
      if (!activeCrewId && c.length > 0) {
        setActiveCrewId(c[0].crew_id);
        setCrew(c[0]);
        const tierRank = c[0].tier === 'admiral' ? 3 : c[0].tier === 'captain' ? 2 : c[0].tier === 'first_mate' ? 1 : 0;
        setUserTier(tierRank);
      }
      const profile = data?.profile;
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url as string);
      if (profile?.display_name) setDisplayName(profile.display_name as string);
    } catch { setLoadError(true); setCrews([]); }
  }, [activeCrewId, setCrew, setCrewContext]);

  useEffect(() => {
    if (ready && !user) { router.replace('/'); return; }
    if (user && ready) {
      // Defer to a task so setState doesn't run synchronously inside the
      // effect (react-hooks/set-state-in-effect).
      const t = setTimeout(async () => {
        // Enforce AAL2: if the user doesn't have MFA verified, redirect to login.
        try {
          const isAal2Ok = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (isAal2Ok.data?.currentLevel !== 'aal2') {
            await supabase.auth.signOut();
            sessionStorage.setItem('crewradr-signed-out-reason', 'inactivity');
            router.replace('/');
            return;
          }
        } catch { /* proceed — if the check fails, the RPCs will reject anyway */ }
        await loadCrews();
        setChecking(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [user, ready, loadCrews, router]);

  // Close mobile menu on route change
  useEffect(() => {
    const t = setTimeout(() => setMobileMenuOpen(false), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  function switchCrew(crewId: string) {
    const c = crews.find((x) => x.crew_id === crewId);
    if (!c) return;
    setActiveCrewId(crewId);
    setCrew(c);
    const rank = c.tier === 'admiral' ? 3 : c.tier === 'captain' ? 2 : c.tier === 'first_mate' ? 1 : 0;
    setUserTier(rank);
    router.push('/fleet');
  }

  if (!ready || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-seed)]" />
      </div>
    );
  }

  if (!user || crews.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] p-8">
        <div className="max-w-sm text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {loadError ? t('webShellConnectionError') : t('webAccessRestrictedTitle')}
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {loadError ? t('webShellConnectionErrorDesc') : t('webAccessRestrictedDesc')}
          </p>
          {loadError && (
            <button onClick={() => loadCrews()} className="mt-4 rounded-lg bg-[var(--brand-seed)] px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              {t('retry')}
            </button>
          )}
          <button onClick={signOut} className={`${loadError ? 'ml-3' : 'mt-6'} rounded-lg border border-zinc-300 px-6 py-2 text-sm font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-400 transition-opacity hover:opacity-90`}>
            {t('webSignOut')}
          </button>
        </div>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => userTier >= item.minTier);
  const activeCrew = crews.find((c) => c.crew_id === activeCrewId);
  const userInitial = (displayName || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--brand-surface)] text-zinc-900 dark:text-zinc-100">
      {/* ── Offline status bar ── */}
      <OfflineBanner />

      {/* ── Tier status banners (downgrade grace / lockout) ── */}
      <ShellErrorBoundary>
        <LockoutBanner />
        <DowngradeBanner />
      </ShellErrorBoundary>

      {/* ── Mobile top bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900 md:hidden">
        <button onClick={() => setMobileMenuOpen(true)} aria-label={t('webShellOpenMenu')} className="text-zinc-600 dark:text-zinc-300">
          <Menu className="h-5 w-5" />
        </button>
        <img src="/logo-32.png" alt="CrewRadr" className="h-7 w-7 shrink-0 rounded-lg" width={28} height={28} />
        {crews.length > 1 ? (
          <MultiCrewSwitcher crews={crews} activeCrewId={activeCrewId} onSelect={switchCrew} />
        ) : (
          <span className="text-sm font-bold truncate">{activeCrew?.crew_name ?? t('webAdminTitle')}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-lg text-sm" title={resolved === 'dark' ? t('webShellLightMode') : t('webShellDarkMode')}>
            {resolved === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'}
          </button>
        </div>
      </header>

      {/* ── Mobile slide-out menu ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-sm dark:bg-zinc-900">
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-700">
              <span className="font-bold text-sm">{t('webAdminTitle')}</span>
              <button onClick={() => setMobileMenuOpen(false)} aria-label={t('webShellCloseMenu')} className="text-zinc-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              <NavItems items={visibleNav} pathname={pathname} t={t} mobile onNavigate={(href) => router.push(href)} />
              {userTier < 3 && (
                <button onClick={() => { setShowUpgrade(true); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium"
                  style={{ color: 'var(--brand-accent, #D4A017)' }}>
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <span>{t('webNavUpgrade')}</span>
                </button>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 p-3 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700">{userInitial}</div>
                )}
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium truncate">{displayName || user.email}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                <button onClick={signOut} className="text-zinc-400 hover:text-red-500"><LogOut className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Desktop sidebar ── */}
        <aside
          className="hidden md:flex md:flex-col border-r border-zinc-200 bg-white transition-[width] duration-300 overflow-hidden dark:border-zinc-700 dark:bg-zinc-900"
          style={{ width: collapsed ? 64 : 224 }}
        >
          <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-700">
            <img src="/logo-32.png" alt="CrewRadr" className="h-8 w-8 shrink-0 rounded-lg" width={32} height={32} />
            {!collapsed && <span className="text-sm font-bold">{t('webAdminTitle')}</span>}
            <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? t('webShellExpand') : t('webShellCollapse')} className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {crews.length > 1 && (
            <div className="border-b border-zinc-200 px-2 py-2 dark:border-zinc-700">
              {collapsed ? (
                <div className="flex flex-col items-center gap-1">
                  {crews.map((c) => (
                    <button key={c.crew_id} onClick={() => switchCrew(c.crew_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${tierColor(c.tier)}20`, color: tierColor(c.tier), ...(c.crew_id === activeCrewId ? { border: `2px solid ${tierColor(c.tier)}` } : { opacity: 0.5 }) }}
                      title={c.crew_name}>{c.crew_name.charAt(0).toUpperCase()}</button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {crews.map((c) => (
                    <button key={c.crew_id} onClick={() => switchCrew(c.crew_id)}
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                      style={c.crew_id === activeCrewId ? { backgroundColor: tierColor(c.tier), color: '#fff' } : { backgroundColor: '#e4e4e7', color: '#71717a' }}>
                      {c.crew_name.length > 10 ? c.crew_name.slice(0, 10) + '…' : c.crew_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {visibleNav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              const isDark = resolved === 'dark';
              const activeStyle = active
                ? {
                    backgroundColor: isDark
                      ? 'color-mix(in srgb, var(--brand-seed) 15%, transparent)'
                      : 'color-mix(in srgb, var(--brand-seed) 10%, transparent)',
                    color: isDark
                      ? 'color-mix(in srgb, var(--brand-seed) 75%, white)'
                      : 'var(--brand-seed)',
                  }
                : { color: isDark ? '#a1a1aa' : '#71717a' };
              return (
                <button key={item.href} onClick={() => router.push(item.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={activeStyle}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = isDark ? '#27272a' : '#f4f4f5'; e.currentTarget.style.color = isDark ? '#d4d4d8' : '#3f3f46'; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = isDark ? '#a1a1aa' : '#71717a'; } }}
                  title={collapsed ? t(item.label) : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{t(item.label)}</span>}
                </button>
              );
            })}
            {/* Upgrade CTA — only when features are locked */}
            {userTier < 3 && (
              <button onClick={() => setShowUpgrade(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--brand-accent, #D4A017)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = resolved === 'dark' ? '#27272a' : '#f4f4f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{t('webNavUpgrade')}</span>}
              </button>
            )}
          </nav>

          <div className="border-t border-zinc-200 p-2 dark:border-zinc-700">
            <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${collapsed ? 'justify-center' : ''}`}>
              <button onClick={() => window.location.href = '/account'} className="shrink-0 transition-opacity hover:opacity-80" title={t('webNavMyAccount')}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">{userInitial}</div>
                )}
              </button>
              {!collapsed && (
                <>
                  <button onClick={() => window.location.href = '/account'} className="flex-1 truncate text-left text-xs text-zinc-600 hover:text-[var(--brand-seed)] dark:text-zinc-400" title={t('webNavMyAccount')}>
                    {displayName || user.email}
                  </button>
                  <button onClick={signOut} className="shrink-0 text-zinc-400 hover:text-red-500" title={t('webSignOut')}><LogOut className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Desktop top bar */}
          <header className="hidden h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900 md:flex">
            {crews.length > 1 ? (
              <MultiCrewSwitcher crews={crews} activeCrewId={activeCrewId} onSelect={switchCrew} />
            ) : (
              activeCrew && (
                <span className="text-sm font-medium">
                  {activeCrew.crew_name}
                  <span className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tierColor(activeCrew.tier), color: '#fff' }}>
                    {tierLabel(activeCrew.tier)}
                  </span>
                </span>
              )
            )}
            <div className="ml-auto flex items-center gap-1">
              <button onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title={resolved === 'dark' ? t('webShellLightMode') : t('webShellDarkMode')}>
                {resolved === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="p-sz-lg md:p-sz-xl max-w-[1400px] w-full">
              <FontScaleProvider>
                <MeasurementProvider>
                  <ShellErrorBoundary>{children}</ShellErrorBoundary>
                </MeasurementProvider>
              </FontScaleProvider>
            </div>
          </div>
        </main>
      </div>

      {/* ── Upgrade modal ── */}
      {showUpgrade && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUpgrade(false)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl bg-surface p-6 shadow-sm border border-outline">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-[var(--brand-accent,#D4A017)]" aria-hidden="true" />
              <h2 className="font-heading font-bold text-lg text-on-surface">{t('webUpgradeTitle')}</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">{t('webUpgradeDescription')}</p>

            <div className="space-y-3 mb-4">
              <div className="rounded-xl border border-outline p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: tierColor('captain'), color: '#fff' }}>{t('webTierCaptain')}</span>
                  <span className="text-xs font-semibold text-on-surface">{t('webUpgradeTierFree')}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-on-surface-variant">
                  <li className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> {t('webUpgradeCaptainFeature1')}</li>
                  <li className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-primary" /> {t('webUpgradeCaptainFeature2')}</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--brand-accent,#D4A017)]/30 p-4" style={{ background: 'color-mix(in srgb, var(--brand-accent, #D4A017) 5%, transparent)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: tierColor('admiral'), color: '#fff' }}>{t('webTierAdmiral')}</span>
                  <span className="text-xs font-semibold text-on-surface">{t('webUpgradeTierPaid')}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-on-surface-variant">
                  <li className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[var(--brand-accent,#D4A017)]" /> {t('webUpgradeAdmiralFeature1')}</li>
                  <li className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-[var(--brand-accent,#D4A017)]" /> {t('webUpgradeAdmiralFeature2')}</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-accent,#D4A017)]" /> {t('webUpgradeAdmiralFeature3')}</li>
                  <li className="flex items-center gap-1.5"><Link className="h-3.5 w-3.5 text-[var(--brand-accent,#D4A017)]" /> {t('webUpgradeAdmiralFeature4')}</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant text-center mb-4">{t('webUpgradeFooter')}</p>
            <button onClick={() => setShowUpgrade(false)}
              className="w-full rounded-xl bg-[var(--brand-seed)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              {t('webUpgradeCta')}
            </button>
          </div>
        </div>
      )}

      {/* ── Idle warning ── */}
      {idleWarning && <IdleWarningOverlay staySignedIn={staySignedIn} onSignOut={handleSignOut} />}
    </div>
  );
}
