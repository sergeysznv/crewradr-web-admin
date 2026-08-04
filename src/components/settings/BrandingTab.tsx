// src/components/settings/BrandingTab.tsx
'use client';
import { useState } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { updateCrewBranding } from '@/lib/rpc';
import { tierRank } from '@/lib/utils';
import { normalizeSeedColor } from '@/hooks/use-branding';

const PRESETS = ['#8EA595', '#6E8679', '#DDCFB5', '#4A90D9', '#E68A00', '#D9534F'];

export function BrandingTab({ seedColor = null }: { seedColor?: string | number | null }) {
  const { crewId, tier } = useCrew();
  const supabase = useSupabase();
  const { showSuccess, showError } = useSnackbar();
  const [color, setColor] = useState<string>(normalizeSeedColor(seedColor) ?? PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isAdmiral = tierRank(tier) >= 3;

  async function save() {
    if (!crewId || !isAdmiral) return;
    setSaving(true);
    try {
      await updateCrewBranding(supabase, crewId, color);
      setSaved(true);
      showSuccess('Branding saved');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save branding');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-lg">
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Primary Color</label>
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
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Logo</label>
        <div className="mt-2 border-2 border-dashed border-outline rounded-lg p-xl text-center">
          <Upload size={28} className="mx-auto mb-2 text-on-surface-variant opacity-40" />
          <p className="text-sm text-on-surface-variant">Upload a PNG or SVG (max 2MB)</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Live Preview</label>
        <div className="mt-2 bg-surface border border-outline rounded-lg p-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: `${color}20`, color }}>
              C
            </div>
            <div>
              <div className="text-sm font-semibold text-on-surface">Sample Crew Card</div>
              <div className="text-2xs text-on-surface-variant">This is how your crew sees the app</div>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: color }}>Button</button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-lg border-t border-outline-variant">
        {!isAdmiral ? (
          <p className="text-xs text-on-surface-variant">Enterprise branding requires Admiral tier.</p>
        ) : (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saved ? <Check size={14} /> : null}
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save Branding'}
          </button>
        )}
      </div>
    </div>
  );
}
