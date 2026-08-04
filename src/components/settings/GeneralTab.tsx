// src/components/settings/GeneralTab.tsx
'use client';
import { useCrew } from '@/hooks/useCrew';

export function GeneralTab() {
  const { crewName, tier } = useCrew();
  return (
    <div className="space-y-lg">
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Crew Name</label>
        <input defaultValue={crewName}
          className="mt-1 w-full px-4 py-2 rounded-lg border border-outline bg-surface text-sm text-on-surface" />
      </div>
      <div className="flex items-center justify-between bg-surface-container rounded-lg p-lg">
        <div>
          <div className="text-sm font-semibold text-on-surface">Subscription Tier</div>
          <div className="text-xs text-on-surface-variant mt-0.5">Current plan</div>
        </div>
        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-primary-container text-primary">{tier}</span>
      </div>
      <div className="flex items-center justify-between bg-surface-container rounded-lg p-lg">
        <div>
          <div className="text-sm font-semibold text-on-surface">Billing</div>
          <div className="text-xs text-on-surface-variant mt-0.5">Managed via App Store / Google Play</div>
        </div>
      </div>
    </div>
  );
}
