// src/components/settings/DangerZone.tsx
'use client';
import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export function DangerZone() {
  const { t } = useT();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  return (
    <div className="border border-error/20 rounded-lg p-lg space-y-4">
      <h3 className="font-heading font-bold text-sm text-error">{t('webSettingsDangerZoneTitle')}</h3>

      <div className="flex items-center justify-between py-2 border-b border-outline-variant">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsTransferOwnership')}</div>
          <div className="text-xs text-on-surface-variant">{t('webSettingsTransferHint')}</div>
        </div>
        <button onClick={() => setShowTransfer(true)} title={t('webSettingsComingSoon')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface-variant hover:bg-surface-container">
          {t('webSettingsTransferButton')}
        </button>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-outline-variant">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsLeaveCrew')}</div>
          <div className="text-xs text-on-surface-variant">{t('webSettingsLeaveHint')}</div>
        </div>
        <button onClick={() => setShowLeave(true)} title={t('webSettingsComingSoon')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-error/30 text-error hover:bg-error-container">
          {t('webSettingsLeaveButton')}
        </button>
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsDeleteCrew')}</div>
          <div className="text-xs text-on-surface-variant">{t('webSettingsDeleteHint')}</div>
        </div>
        <button onClick={() => setShowDelete(true)} title={t('webSettingsComingSoon')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-error text-white hover:opacity-90">
          {t('webSettingsDeleteButton')}
        </button>
      </div>

      {/* Destructive actions are not wired up yet: the dialog stays open and
          the confirm button is disabled, so the user sees feedback instead of
          a silent no-op. onConfirm is unreachable while confirmDisabled. */}
      <ConfirmDialog open={showTransfer} title={t('webSettingsTransferOwnership')} message={t('webSettingsTransferDialog')} confirmLabel={t('webSettingsComingSoon')} destructive confirmDisabled onConfirm={() => {}} onCancel={() => setShowTransfer(false)} />
      <ConfirmDialog open={showLeave} title={t('webSettingsLeaveCrew')} message={t('webSettingsLeaveDialog')} confirmLabel={t('webSettingsComingSoon')} destructive confirmDisabled onConfirm={() => {}} onCancel={() => setShowLeave(false)} />
      <ConfirmDialog open={showDelete} title={t('webSettingsDeleteCrew')} message={t('webSettingsDeleteDialog')} confirmLabel={t('webSettingsComingSoon')} destructive confirmDisabled onConfirm={() => {}} onCancel={() => setShowDelete(false)} />
    </div>
  );
}
