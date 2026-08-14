// src/components/account/AccountView.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useT, useLocale } from '@/hooks/use-translations';
import { useAuth } from '@/hooks/use-auth';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';
import { useSupabase } from '@/hooks/useSupabase';
import { useCrew } from '@/hooks/useCrew';
import { useSnackbar } from '@/components/shared/Snackbar';
import { MeasurementToggle } from '@/components/settings/MeasurementToggle';
import { FontScalePicker } from '@/components/settings/FontScalePicker';
import { tierLabel, tierColor } from '@/lib/utils';
import { Globe, Users, Loader2, Check, LogOut, Home, Lock } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'Русский' },
];

export function AccountView() {
  const { t } = useT();
  const { locale, setLocale } = useLocale();
  const { signOut } = useAuth();
  const supabase = useSupabase();
  const { tier } = useCrew();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const account = useAccountProfile();

  const profile = account.data?.profile ?? null;
  const crews = account.data?.crews ?? [];

  // Smart Home tier check: First Mate+ (first_mate, captain, admiral)
  const isFirstMatePlus =
    tier === 'first_mate' ||
    tier === 'firstMate' ||
    tier === 'captain' ||
    tier === 'admiral';

  // Seed locale from profile language_preference on first load.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !profile?.language_preference) return;
    if (profile.language_preference !== locale) {
      setLocale(profile.language_preference);
    }
    seededRef.current = true;
  }, [profile?.language_preference, locale, setLocale]);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [smartHomeUrl, setSmartHomeUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const displayNameValue = displayName ?? profile?.display_name ?? '';
  const smartHomeUrlValue = smartHomeUrl ?? profile?.smart_home_webhook_url ?? '';

  async function saveProfile() {
    if (!profile?.user_id) return;
    setSaving(true);
    try {
      await supabase.from('profiles').upsert({
        user_id: profile.user_id,
        display_name: displayNameValue.trim(),
      });
      setDisplayName(null);
      queryClient.invalidateQueries({ queryKey: ['accountProfile'] });
      setSaved(true);
      showSuccess(t('webAccountProfileSaved'));
      setTimeout(() => setSaved(false), 2500);
    } catch {
      showError(t('webAccountProfileFailed'));
    }
    setSaving(false);
  }

  async function saveSmartHomeWebhook() {
    if (!profile?.user_id) return;
    setSavingWebhook(true);
    try {
      await supabase.from('profiles').upsert({
        user_id: profile.user_id,
        smart_home_webhook_url: smartHomeUrlValue.trim() || null,
      });
      setSmartHomeUrl(null);
      queryClient.invalidateQueries({ queryKey: ['accountProfile'] });
      showSuccess(t('webSmartHomeUrlSaved') || 'Smart Home webhook URL saved.');
    } catch {
      showError(t('webSmartHomeUrlFailed') || 'Failed to save Smart Home webhook URL.');
    }
    setSavingWebhook(false);
  }

  async function testSmartHomeWebhook() {
    if (!smartHomeUrlValue.trim()) return;
    setTestingWebhook(true);
    try {
      const res = await fetch(smartHomeUrlValue.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test_arrival',
          member: displayNameValue || profile?.email || 'Unknown Member',
          timestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        showSuccess(t('webSmartHomeTestSuccess') || 'Webhook tested successfully! Response OK.');
      } else {
        showError((t('webSmartHomeTestFailure') || 'Webhook failed with status: ') + res.status);
      }
    } catch (err) {
      showError(t('webSmartHomeTestError') || 'Failed to connect to webhook URL. Verify the address.');
    } finally {
      setTestingWebhook(false);
    }
  }

  async function changeLanguage(code: string) {
    if (code === locale) return;
    setLocale(code);
    try {
      if (profile?.user_id) {
        await supabase.from('profiles').upsert({
          user_id: profile.user_id,
          language_preference: code,
        });
        queryClient.invalidateQueries({ queryKey: ['accountProfile'] });
      }
    } catch { /* locale still applies locally */ }
  }

  const email = profile?.email ?? '';
  const initial = (displayNameValue || email).charAt(0).toUpperCase() || '?';

  return (
    <div className="max-w-3xl space-y-sz-lg animate-fade-in">
      <h1 className="text-2xl font-bold text-on-surface">{t('webAccountTitle')}</h1>

      {/* Profile Card */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-xl font-bold text-on-primary-container overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-semibold text-on-surface">{displayNameValue || email}</h2>
              <p className="text-sm text-on-surface-variant">{email}</p>
            </div>
            <div>
              <label htmlFor="display-name" className="mb-1 block text-xs font-medium text-on-surface-variant">
                {t('displayName')}
              </label>
              <input
                id="display-name"
                name="display-name"
                value={displayNameValue}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
                autoComplete="name"
              />
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved ? <Check className="h-4 w-4" /> : null}
              {saved ? t('webAccountProfileSaved') : saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-on-surface">{t('webAccountLanguage')}</h2>
        </div>
        <div>
          <label htmlFor="language-preference" className="sr-only">{t('webAccountLanguage')}</label>
          <select
            id="language-preference"
            value={locale}
            onChange={(e) => changeLanguage(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Font Scale */}
      <FontScalePicker />

      {/* Measuring System */}
      <MeasurementToggle />

      {/* Smart Home (Matter) Automation */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl relative overflow-hidden">
        {!isFirstMatePlus && (
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center z-10">
            <Lock className="h-8 w-8 text-on-surface-variant opacity-60" />
            <h3 className="font-semibold text-on-surface mt-2">{t('webSmartHomeLockedTitle') || 'Smart Home Automation Locked'}</h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
              {t('webSmartHomeLockedDesc') || 'Smart Home automation is available on First Mate tier and above. Upgrade your crew subscription to connect home automations.'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Home className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-on-surface">{t('webSmartHomeTitle') || 'Smart Home (Matter) Automation'}</h2>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            {t('webSmartHomeDesc') || 'Trigger smart home systems (like Home Assistant, IFTTT, or Zapier) when you arrive at a Safe Landing zone.'}
          </p>

          <div className="space-y-1">
            <label htmlFor="smart-home-url" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
              {t('webSmartHomeUrlLabel') || 'Webhook URL'}
            </label>
            <input
              id="smart-home-url"
              type="url"
              placeholder="https://your-home-assistant.com/api/webhook/safe_landing"
              value={smartHomeUrlValue}
              onChange={(e) => setSmartHomeUrl(e.target.value)}
              disabled={!isFirstMatePlus}
              className="w-full rounded-xl border border-outline bg-surface px-4 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveSmartHomeWebhook}
              disabled={savingWebhook || !isFirstMatePlus}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {savingWebhook && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save') || 'Save URL'}
            </button>
            <button
              onClick={testSmartHomeWebhook}
              disabled={testingWebhook || !smartHomeUrlValue.trim() || !isFirstMatePlus}
              className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              {testingWebhook && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('webSmartHomeTest') || 'Test Webhook'}
            </button>
          </div>
        </div>
      </div>

      {/* Crews */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-on-surface">{t('webAccountYourCrews')}</h2>
        </div>
        {crews.length === 0 ? (
          <div className="py-8 text-center text-sm text-on-surface-variant">
            <Users className="mx-auto h-8 w-8 text-on-surface-variant opacity-40" />
            <p className="mt-2 font-medium">{t('webAccountNoCrews')}</p>
            <p className="mt-1">{t('webAccountNoCrewsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {crews.map((c) => (
              <div key={c.crew_id} className="flex items-center justify-between rounded-xl border border-outline p-3">
                <div>
                  <p className="font-medium text-sm text-on-surface">{c.crew_name}</p>
                  <p className="text-xs text-on-surface-variant capitalize">{c.role.replace(/_/g, ' ')}</p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `${tierColor(c.tier)}20`, color: tierColor(c.tier) }}
                >
                  {tierLabel(c.tier)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="pt-sz-lg border-t border-outline-variant flex justify-end">
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 rounded-xl border border-error/30 px-4 py-2 text-sm font-semibold text-error hover:bg-error-container"
        >
          <LogOut className="h-4 w-4" />
          {t('webSignOut')}
        </button>
      </div>
    </div>
  );
}
