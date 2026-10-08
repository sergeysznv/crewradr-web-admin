// src/components/developer/DeveloperView.tsx
'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/hooks/use-translations';
import { supabase } from '@/lib/supabase/client';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Terminal, Lock, Trash2, Search, RefreshCw, MessageSquare,
  Route, MapPin, ShieldAlert, FileText, AlertTriangle
} from 'lucide-react';

type Tab = 'logs' | 'feedback' | 'telemetry' | 'trips' | 'locations';

interface SupportGrant {
  crew_id: string;
  reason: string;
  expires_at: string;
}

interface DevRow {
  id: string;
  created_at: string;
  started_at: string;
  ended_at?: string | null;
  log_level?: string;
  message?: string;
  user_id?: string;
  install_id?: string | null;
  kind?: string;
  email?: string | null;
  event_type?: string;
  severity?: number | null;
  speed_ms: number;
  speed_limit_ms?: number | null;
  g_force?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  distance_m?: number | null;
  avg_speed_ms?: number | null;
  max_speed_ms?: number | null;
  score_before?: number | null;
  score_after?: number | null;
  event_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isSupportTab = (tab: Tab) => tab === 'telemetry' || tab === 'trips' || tab === 'locations';

export function DeveloperView() {
  const { t } = useT();
  const [isDev, setIsDev] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('logs');
  const [searchMessage, setSearchMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState<DevRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DevRow | null>(null);

  // Audited support access (location / trip / telemetry data). Staff have NO
  // standing read access to these tables; each crew needs a reasoned,
  // time-boxed grant, every read is logged server-side, and the crew's
  // captains can see it in their audit log.
  const [grants, setGrants] = useState<SupportGrant[]>([]);
  const [supportCrewId, setSupportCrewId] = useState('');
  const [supportReason, setSupportReason] = useState('');
  const [supportMinutes, setSupportMinutes] = useState(30);
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const crewKey = supportCrewId.trim().toLowerCase();
  const activeGrant = isSupportTab(activeTab)
    ? grants.find((g) => g.crew_id === crewKey) // expiry is enforced by the server on every read
    : undefined;
  const activeGrantExpiry = activeGrant?.expires_at ?? null;

  async function refreshGrants() {
    const { data: g } = await supabase.rpc('support_active_grants');
    setGrants(Array.isArray(g) ? (g as SupportGrant[]) : []);
  }

  async function openSupportAccess() {
    setSupportBusy(true);
    setSupportError(null);
    try {
      if (!UUID_RE.test(crewKey)) throw new Error(t('webSupportInvalidCrew'));
      const { error } = await supabase.rpc('support_open_access', {
        p_crew: crewKey,
        p_reason: supportReason.trim(),
        p_minutes: supportMinutes,
      });
      if (error) throw error;
      await refreshGrants();
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed');
    } finally {
      setSupportBusy(false);
    }
  }

  async function closeSupportAccess() {
    setSupportBusy(true);
    try {
      await supabase.rpc('support_close_access', { p_crew: crewKey });
      await refreshGrants();
      setData([]);
      setTotal(0);
    } finally {
      setSupportBusy(false);
    }
  }

  // Check dev status on load
  useEffect(() => {
    supabase.rpc('get_web_account_profile').then(({ data: profileData, error }) => {
      if (error || !profileData?.profile?.is_developer) {
        setIsDev(false);
      } else {
        setIsDev(true);
        refreshGrants();
      }
    });
  }, []);

  // Fetch data on parameters change
  useEffect(() => {
    if (isDev !== true) return;

    let cancelled = false;
    async function fetchTab() {
      setLoading(true);
      try {
        if (isSupportTab(activeTab)) {
          if (!activeGrantExpiry) {
            setData([]);
            setTotal(0);
            return;
          }
          const kind = activeTab === 'locations' ? 'locations' : activeTab === 'trips' ? 'trips' : 'telemetry';
          const { data: res, error: rpcErr } = await supabase.rpc('support_read', {
            p_crew: crewKey,
            p_kind: kind,
            p_user: UUID_RE.test(searchUser.trim()) ? searchUser.trim() : null,
            p_search: kind === 'telemetry' && searchMessage ? searchMessage : null,
            p_limit: limit,
            p_offset: offset,
          });
          if (cancelled) return;
          if (rpcErr) throw rpcErr;
          if (res?.error === 'no_active_grant') {
            await refreshGrants();
            setData([]);
            setTotal(0);
            return;
          }
          setData(res?.rows ?? []);
          setTotal(res?.total ?? 0);
          return;
        }

        let query;
        if (activeTab === 'logs') {
          query = supabase.from('app_logs').select('*', { count: 'exact' });
          if (logLevel !== 'all') {
            query = query.eq('log_level', logLevel.toUpperCase());
          }
          if (searchUser) {
            query = query.eq('user_id', searchUser);
          }
          if (searchMessage) {
            query = query.ilike('message', `%${searchMessage}%`);
          }
          query = query.order('created_at', { ascending: false });
        } else if (activeTab === 'feedback') {
          query = supabase.from('user_feedback').select('*', { count: 'exact' });
          if (searchUser) {
            query = query.eq('user_id', searchUser);
          }
          if (searchMessage) {
            query = query.ilike('message', `%${searchMessage}%`);
          }
          query = query.order('created_at', { ascending: false });
        } else {
          return;
        }

        const { data: rows, count, error } = await query
          .range(offset, offset + limit - 1);

        if (cancelled) return;
        if (error) throw error;

        setData(rows || []);
        setTotal(count || 0);
      } catch (err) {
        console.error('Error fetching developer data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTab();
    return () => {
      cancelled = true;
    };
  }, [isDev, activeTab, offset, limit, searchMessage, searchUser, logLevel, activeGrantExpiry, crewKey]);

  // Reset pagination when switching tabs
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setOffset(0);
    setData([]);
    setTotal(0);
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      if (activeTab === 'logs') {
        const { error } = await supabase
          .from('app_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      } else if (activeTab === 'feedback') {
        const { error } = await supabase
          .from('user_feedback')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }
      setData([]);
      setTotal(0);
      setOffset(0);
      setShowConfirmClear(false);
    } catch (err) {
      console.error('Failed to clear developer logs:', err);
    } finally {
      setClearing(false);
    }
  };

  if (isDev === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isDev === false) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 animate-fade-in" role="status">
        <div className="text-center max-w-md p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-outline shadow-sm">
          <Lock className="mx-auto h-12 w-12 text-error" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webDeveloperRestricted')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
            {t('webDeveloperRestrictedDesc')}
          </p>
        </div>
      </div>
    );
  }

  // Column definitions per Tab
  const getColumns = () => {
    switch (activeTab) {
      case 'logs':
        return [
          {
            key: 'time',
            header: t('webDevColTimestamp'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {new Date(row.created_at).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'level',
            header: t('webDevColLevel'),
            render: (row: DevRow) => {
              const lvl = String(row.log_level).toUpperCase();
              let color = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
              if (lvl === 'ERROR' || lvl === 'FATAL') color = 'bg-error-container text-error';
              else if (lvl === 'WARN' || lvl === 'WARNING') color = 'bg-warning-container text-warning';
              else if (lvl === 'INFO') color = 'bg-primary-container text-primary';
              return (
                <span className={`px-2 py-0.5 rounded-xl text-2xs font-semibold uppercase ${color}`}>
                  {lvl}
                </span>
              );
            },
          },
          {
            key: 'message',
            header: t('webDevColMessage'),
            render: (row: DevRow) => (
              <span className="text-sm font-medium text-on-surface block max-w-md truncate">
                {row.message}
              </span>
            ),
          },
          {
            key: 'user',
            header: t('webDevColUserId'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono block max-w-[150px] truncate" title={row.user_id || t('webAuditSystem')}>
                {row.user_id || t('webAuditSystem')}
              </span>
            ),
          },
          {
            key: 'install',
            header: t('webDevColInstallId'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono block max-w-[100px] truncate" title={row.install_id || t('webDeveloperNa')}>
                {row.install_id || t('webDeveloperNa')}
              </span>
            ),
          },
        ];

      case 'feedback':
        return [
          {
            key: 'time',
            header: t('webDevColTimestamp'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {new Date(row.created_at).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'kind',
            header: t('webDevColType'),
            render: (row: DevRow) => (
              <span className="px-2 py-0.5 rounded-xl bg-primary-container text-primary text-2xs font-semibold capitalize">
                {row.kind}
              </span>
            ),
          },
          {
            key: 'message',
            header: t('webDevColFeedbackMessage'),
            render: (row: DevRow) => (
              <span className="text-sm text-on-surface block max-w-lg truncate">
                {row.message}
              </span>
            ),
          },
          {
            key: 'contact',
            header: t('webDevColContactEmail'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface font-medium">{row.email || t('webDeveloperAnonymous')}</span>
            ),
          },
          {
            key: 'user',
            header: t('webDevColUserId'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono block max-w-[120px] truncate" title={row.user_id}>
                {row.user_id || t('webDeveloperAnonymous')}
              </span>
            ),
          },
        ];

      case 'telemetry':
        return [
          {
            key: 'time',
            header: t('webDevColTimestamp'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {new Date(row.created_at).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'type',
            header: t('webDevColEventType'),
            render: (row: DevRow) => (
              <span className="px-2 py-0.5 rounded-xl bg-warning-container text-warning text-2xs font-semibold uppercase">
                {row.event_type}
              </span>
            ),
          },
          {
            key: 'severity',
            header: t('webDevColSeverity'),
            render: (row: DevRow) => (
              <span className="text-xs font-semibold text-on-surface">{row.severity?.toFixed(2) || '0.00'}</span>
            ),
          },
          {
            key: 'speed',
            header: t('webDevColSpeedLimit'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant">
                {(row.speed_ms * 2.23694).toFixed(0)} / {row.speed_limit_ms ? (row.speed_limit_ms * 2.23694).toFixed(0) : t('webDeveloperNa')} {t('webSpeedMph')}
              </span>
            ),
          },
          {
            key: 'g',
            header: t('webDevColGForce'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant">{row.g_force?.toFixed(2) || '0.0'} {t('webDeveloperG')}</span>
            ),
          },
          {
            key: 'loc',
            header: t('webDevColCoordinates'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {row.location_lat?.toFixed(5)}, {row.location_lng?.toFixed(5)}
              </span>
            ),
          },
        ];

      case 'trips':
        return [
          {
            key: 'started',
            header: t('webDevColStartedAt'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {new Date(row.started_at).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'ended',
            header: t('webDevColEndedAt'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {row.ended_at ? new Date(row.ended_at).toLocaleString() : t('webMembersStatusActive')}
              </span>
            ),
          },
          {
            key: 'distance',
            header: t('webDevColDistance'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface font-semibold">
                {((row.distance_m || 0) * 0.000621371).toFixed(1)} {t('webDeveloperMiles')}
              </span>
            ),
          },
          {
            key: 'avg_speed',
            header: t('webDevColAvgMaxSpeed'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant">
                {((row.avg_speed_ms || 0) * 2.23694).toFixed(0)} / {((row.max_speed_ms || 0) * 2.23694).toFixed(0)} {t('webSpeedMph')}
              </span>
            ),
          },
          {
            key: 'score',
            header: t('webDevColScoreDelta'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {row.score_before?.toFixed(0) || '100'} → {row.score_after?.toFixed(0) || '100'}
              </span>
            ),
          },
          {
            key: 'alerts',
            header: t('webDevColAlerts'),
            render: (row: DevRow) => (
              <span className={`text-xs font-bold ${(row.event_count ?? 0) > 0 ? 'text-error' : 'text-zinc-400'}`}>
                {t('webDeveloperIncidents', { count: row.event_count || 0 })}
              </span>
            ),
          },
        ];

      case 'locations':
        return [
          {
            key: 'time',
            header: t('webDevColTimestamp'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono">
                {new Date(row.created_at).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'user',
            header: t('webDevColUserId'),
            render: (row: DevRow) => (
              <span className="text-xs text-on-surface-variant font-mono block max-w-[150px] truncate" title={row.user_id}>
                {row.user_id}
              </span>
            ),
          },
          {
            key: 'latitude',
            header: t('webDevColLatitude'),
            render: (row: DevRow) => (
              <span className="text-xs font-mono">{row.latitude?.toFixed(7)}</span>
            ),
          },
          {
            key: 'longitude',
            header: t('webDevColLongitude'),
            render: (row: DevRow) => (
              <span className="text-xs font-mono">{row.longitude?.toFixed(7)}</span>
            ),
          },
          {
            key: 'speed',
            header: t('webDevColSpeed'),
            render: (row: DevRow) => (
              <span className="text-xs font-semibold">
                {((row.speed || 0) * 2.23694).toFixed(0)} {t('webSpeedMph')}
              </span>
            ),
          },
        ];
    }
  };

  const getEmptyIcon = () => {
    switch (activeTab) {
      case 'logs': return <FileText size={40} />;
      case 'feedback': return <MessageSquare size={40} />;
      case 'telemetry': return <ShieldAlert size={40} />;
      case 'trips': return <Route size={40} />;
      case 'locations': return <MapPin size={40} />;
    }
  };

  const getEmptyTitle = () => {
    switch (activeTab) {
      case 'logs': return t('webDeveloperNoLogs');
      case 'feedback': return t('webDeveloperNoFeedback');
      case 'telemetry': return t('webDeveloperNoTelemetry');
      case 'trips': return t('webDeveloperNoTrips');
      case 'locations': return t('webDeveloperNoLocations');
    }
  };

  return (
    <div className="space-y-sz-lg animate-fade-in">
      <div className="flex items-center gap-3">
        <Terminal className="h-6 w-6 text-zinc-400" />
        <h1 className="text-2xl font-bold text-on-surface">
          {t('webDeveloperTitle')}
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant">
        <nav className="flex gap-4" aria-label={t('webDeveloperTabsAria')}>
          {(['logs', 'feedback', 'telemetry', 'trips', 'locations'] as Tab[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-2 px-1 border-b-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-[var(--brand-seed)] text-[var(--brand-seed)]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {tab === 'logs' && t('webDeveloperTabLogs')}
                {tab === 'feedback' && t('webDeveloperTabFeedback')}
                {tab === 'telemetry' && t('webDeveloperTabTelemetry')}
                {tab === 'trips' && t('webDeveloperTabTrips')}
                {tab === 'locations' && t('webDeveloperTabLocations')}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Audited support access (telemetry / trips / locations) */}
      {isSupportTab(activeTab) && (
        <div className="space-y-3 rounded-2xl border border-outline bg-white p-4 shadow-sm dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-on-surface">{t('webSupportTitle')}</h2>
              <p className="text-xs text-on-surface-variant">{t('webSupportDesc')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <input
              type="text"
              value={supportCrewId}
              onChange={(e) => { setSupportCrewId(e.target.value); setOffset(0); }}
              placeholder={t('webSupportCrewId')}
              aria-label={t('webSupportCrewId')}
              className="w-[300px] rounded-xl border border-outline bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-seed)]"
            />
            {activeGrant ? (
              <>
                <span className="text-xs font-semibold text-success">
                  {t('webSupportActive', { time: new Date(activeGrant.expires_at).toLocaleTimeString() })}
                </span>
                <button
                  type="button"
                  disabled={supportBusy}
                  onClick={closeSupportAccess}
                  className="rounded-xl border border-outline px-3 py-2 text-sm font-semibold hover:bg-surface-container disabled:opacity-50"
                >
                  {t('webSupportClose')}
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  placeholder={t('webSupportReason')}
                  aria-label={t('webSupportReason')}
                  maxLength={500}
                  className="min-w-[260px] flex-1 rounded-xl border border-outline bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-seed)]"
                />
                <select
                  value={supportMinutes}
                  onChange={(e) => setSupportMinutes(Number(e.target.value))}
                  aria-label={t('webSupportDuration')}
                  className="rounded-xl border border-outline bg-transparent px-3 py-2 text-sm"
                >
                  {[15, 30, 60, 120, 240].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={supportBusy || supportReason.trim().length < 10 || !UUID_RE.test(crewKey)}
                  onClick={openSupportAccess}
                  className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
                >
                  {t('webSupportOpen')}
                </button>
              </>
            )}
          </div>
          {supportError && <p className="text-xs text-error" role="alert">{supportError}</p>}
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-950 border border-outline rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* User ID filter */}
          <div className="relative">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={t('webDeveloperSearchUser')}
              value={searchUser}
              onChange={(e) => { setSearchUser(e.target.value); setOffset(0); }}
              className="ps-9 pe-4 py-2 border border-outline rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-seed)] w-[240px] font-mono bg-transparent"
            />
          </div>

          {/* Log level filter (Only active for App Logs tab) */}
          {activeTab === 'logs' && (
            <select
              value={logLevel}
              onChange={(e) => { setLogLevel(e.target.value); setOffset(0); }}
              className="px-4 py-2 border border-outline rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-seed)] bg-transparent"
            >
              <option value="all">{t('webDeveloperAllLevels')}</option>
              <option value="debug">DEBUG</option>
              <option value="info">INFO</option>
              <option value="warning">WARN</option>
              <option value="error">ERROR</option>
              <option value="fatal">FATAL</option>
            </select>
          )}

          {/* Message search filter (logs, feedback, telemetry) */}
          {['logs', 'feedback', 'telemetry'].includes(activeTab) && (
            <div className="relative">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder={t('webDeveloperSearchMessage')}
                value={searchMessage}
                onChange={(e) => { setSearchMessage(e.target.value); setOffset(0); }}
                className="ps-9 pe-4 py-2 border border-outline rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-seed)] w-[280px] bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Clear logs / feedback actions */}
        {['logs', 'feedback'].includes(activeTab) && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-error text-on-error rounded-xl hover:opacity-90 transition-opacity text-sm font-semibold"
          >
            <Trash2 size={16} />
            {activeTab === 'logs' ? t('webDeveloperClearLogs') : t('webDeveloperClearFeedback')}
          </button>
        )}
      </div>

      {/* Data Table */}
      {loading && data.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={getEmptyIcon()}
          title={getEmptyTitle()}
          message={t('webDeveloperNoData')}
        />
      ) : (
        <div className="bg-white dark:bg-zinc-950 border border-outline rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <DataTable
            columns={getColumns()}
            data={data}
            pagination={{ offset, limit, total, onPageChange: setOffset }}
            onRowClick={(row) => setSelectedRow(row)}
          />
        </div>
      )}

      {/* Row detail drawer / modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRow(null)} />
          <div className="relative z-10 w-[600px] max-w-full h-full bg-surface border-s border-outline shadow-sm flex flex-col p-6 overflow-hidden dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
              <h2 className="font-heading font-bold text-lg text-on-surface flex items-center gap-2">
                <FileText className="text-zinc-400" />
                {t('webDeveloperRecordDetails')}
              </h2>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 hover:bg-surface-container rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                {t('webDeveloperClose')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {Object.entries(selectedRow).map(([key, val]) => {
                if (val === null || val === undefined) return null;
                const displayVal = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
                return (
                  <div key={key} className="space-y-1.5 border-b border-outline-variant/30 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-mono">{key}</span>
                    <pre className="text-xs bg-zinc-50 dark:bg-zinc-900 border border-outline/35 rounded-xl p-3 font-mono text-on-surface whitespace-pre-wrap break-all overflow-x-auto">
                      {displayVal}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Wipe Logs Dialog */}
      <ConfirmDialog
        open={showConfirmClear}
        title={activeTab === 'logs' ? t('webDeveloperClearAllLogs') : t('webDeveloperClearAllFeedback')}
        message={
          activeTab === 'logs'
            ? t('webDeveloperClearLogsConfirm')
            : t('webDeveloperClearFeedbackConfirm')
        }
        confirmLabel={clearing ? t('webDeveloperClearing') : t('webDeveloperWipeData')}
        destructive
        pending={clearing}
        onConfirm={handleClearData}
        onCancel={() => setShowConfirmClear(false)}
      />
    </div>
  );
}
