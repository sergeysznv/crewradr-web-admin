// src/components/account/AccountView.tsx
'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useT, useLocale } from '@/hooks/use-translations';
import { useAuth } from '@/hooks/use-auth';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { tierLabel, tierColor } from '@/lib/utils';
import { Globe, Users, Loader2, Check, LogOut } from 'lucide-react';

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
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const account = useAccountProfile();

  const profile = account.data?.profile ?? null;
  const crews = account.data?.crews ?? [];

  // Draft = null until the user edits; the input shows the profile value
  // otherwise. No effect needed to sync — avoids setState-in-effect.
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayNameValue = displayName ?? profile?.display_name ?? '';

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
    <div className="max-w-3xl space-y-lg animate-fade-in">
      <h1 className="text-2xl font-bold text-on-surface">{t('webAccountTitle')}</h1>

      {/* Profile Card */}
      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-xl font-bold text-primary overflow-hidden">
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
      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
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

      {/* Crews */}
      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
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
      <div className="pt-lg border-t border-outline-variant flex justify-end">
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
