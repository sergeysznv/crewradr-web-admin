// src/components/settings/BrandingTab.tsx
'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, Check, Image, X } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { updateCrewBranding } from '@/lib/rpc';
import { tierRank } from '@/lib/utils';
import { normalizeSeedColor } from '@/hooks/use-branding';

const PRESETS = ['#8EA595', '#6E8679', '#DDCFB5', '#4A90D9', '#E68A00', '#D9534F'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/svg+xml'];

export function BrandingTab({ seedColor = null, logoUrl = null }: { seedColor?: string | number | null; logoUrl?: string | null }) {
  const { t } = useT();
  const { crewId, tier } = useCrew();
  const supabase = useSupabase();
  const { showSuccess, showError } = useSnackbar();
  const [color, setColor] = useState<string>(normalizeSeedColor(seedColor) ?? PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmiral = tierRank(tier) >= 3;

  async function save() {
    if (!crewId || !isAdmiral) return;
    setSaving(true);
    try {
      await updateCrewBranding(supabase, crewId, color, currentLogo);
      setSaved(true);
      showSuccess(t('webCrewSettingsBrandingSaved'));
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webCrewSettingsSaveFailed'));
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !crewId) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showError(t('webCrewSettingsLogoType'));
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      showError(t('webCrewSettingsLogoSize'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.type === 'image/svg+xml' ? 'svg' : 'png';
      const path = `crew-logos/${crewId}.${ext}`;

      // Remove old logo first (ignore 404 if it doesn't exist)
      await supabase.storage.from('crew-branding').remove([path]);

      const { error } = await supabase.storage
        .from('crew-branding')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('crew-branding').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      setCurrentLogo(publicUrl);
      showSuccess(t('webCrewSettingsLogoUploaded'));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webCrewSettingsLogoFailed'));
    }
    setUploading(false);
    // Reset the input so re-uploading the same file works
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeLogo() {
    setCurrentLogo(null);
  }

  return (
    <div className="space-y-lg">
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webSettingsPrimaryColor')}</label>
        <div className="flex items-center gap-4 mt-2">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-outline cursor-pointer" />
          <div className="flex gap-2">
            {PRESETS.map(c => (
              <button key={c} onClick={() => setColor(c)} type="button" aria-label={`Set color ${c}`}
                className={`w-7 h-7 rounded-full border-2 ${c === color ? 'border-primary' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webSettingsLogo')}</label>

        {currentLogo ? (
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-outline bg-surface-container">
              <img src={currentLogo} alt="" className="h-full w-full object-contain p-1" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {t('webSettingsLogoReplace')}
              </button>
              <button
                onClick={removeLogo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error hover:bg-error-container"
              >
                <X className="h-3.5 w-3.5" />
                {t('webSettingsLogoRemove')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 w-full border-2 border-dashed border-outline rounded-lg p-xl text-center hover:border-primary/40 transition-colors"
          >
            {uploading ? (
              <Loader2 size={28} className="mx-auto mb-2 text-on-surface-variant animate-spin" />
            ) : (
              <Image size={28} className="mx-auto mb-2 text-on-surface-variant opacity-40" />
            )}
            <p className="text-sm text-on-surface-variant">
              {uploading ? t('webSettingsLogoUploading') : t('webSettingsLogoHint')}
            </p>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/svg+xml"
          onChange={handleLogoUpload}
          className="hidden"
          aria-label={t('webSettingsLogoUploadAria')}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webSettingsLivePreview')}</label>
        <div className="mt-2 bg-surface border border-outline rounded-lg p-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold overflow-hidden"
              style={{ backgroundColor: `${color}20`, color }}>
              {currentLogo ? (
                <img src={currentLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                'C'
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-on-surface">{t('webSettingsPreviewCard')}</div>
              <div className="text-2xs text-on-surface-variant">{t('webSettingsPreviewCardHint')}</div>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: color }}>{t('webSettingsPreviewButton')}</button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-lg border-t border-outline-variant">
        {!isAdmiral ? (
          <p className="text-xs text-on-surface-variant">{t('webSettingsAdmiralRequired')}</p>
        ) : (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saved ? <Check size={14} /> : null}
            {saved ? t('webSettingsSaved') : saving ? t('webSettingsSaving') : t('webSettingsSaveBranding')}
          </button>
        )}
      </div>
    </div>
  );
}
