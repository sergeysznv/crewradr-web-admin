// src/components/members/CsvImportModal.tsx
'use client';
import { useState } from 'react';
import { useBulkImport } from '@/hooks/queries/useMutations';
import { useCrew } from '@/hooks/useCrew';
import { useT } from '@/hooks/use-translations';
import { X, Upload } from 'lucide-react';

export function CsvImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { crewId } = useCrew();
  const importMutation = useBulkImport(crewId!);
  const [text, setText] = useState('');

  if (!open) return null;

  const handleImport = () => {
    const lines = text.trim().split('\n');
    const members = lines.slice(1).map(line => {
      const [email, role] = line.split(',').map(s => s.trim());
      return { email, role: role || 'member' };
    }).filter(m => m.email);
    importMutation.mutate(members, { onSuccess: () => onClose() });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-surface border border-outline rounded-xxl p-xl max-w-[520px] w-full mx-lg pointer-events-auto shadow-xl">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-heading font-extrabold text-lg text-on-surface">{t('webMembersImportDialogTitle')}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container"><X size={18} /></button>
          </div>

          <div className="border-2 border-dashed border-outline rounded-lg p-xl text-center mb-lg">
            <Upload size={32} className="mx-auto mb-2 text-on-surface-variant opacity-40" />
            <p className="text-sm text-on-surface-variant">{t('webMembersImportPaste')}</p>
            <p className="text-2xs text-on-surface-variant mt-1">{t('webMembersImportFormat')}</p>
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={t('webMembersImportHint')}
            className="w-full h-32 rounded-lg border border-outline bg-surface-container p-3 text-sm font-mono resize-none"
          />

          <div className="flex gap-3 mt-lg justify-end">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">{t('webMembersImportCancel')}</button>
            <button onClick={handleImport} disabled={!text.trim() || importMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 disabled:opacity-50">
              {importMutation.isPending ? t('webMembersImportImporting') : t('webMembersImportCsv')}
            </button>
          </div>

          {importMutation.data && (
            <div className={`mt-lg p-3 rounded-lg text-sm ${importMutation.data.errors.length ? 'bg-warning-container text-warning' : 'bg-primary-container text-primary'}`}>
              {t('webMembersImportResult', { added: importMutation.data.added })}
              {importMutation.data.errors.length > 0 && ` · ${t('webMembersImportErrors', { errors: importMutation.data.errors.length })}`}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
