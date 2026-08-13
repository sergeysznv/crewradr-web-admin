// src/components/members/CsvImportModal.tsx
'use client';
import { useState, useCallback, useRef } from 'react';
import { useBulkImport } from '@/hooks/queries/useMutations';
import { useCrew } from '@/hooks/useCrew';
import { useT } from '@/hooks/use-translations';
import { X, Upload, Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const CSV_TEMPLATE = 'email,role\ncrewmate@example.com,member\nfirst.mate@example.com,co-captain\ndriver@example.com,member\n';

const VALID_ROLES = ['member', 'co-captain'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRow {
  email: string;
  role: string;
  line: number;
}

interface RowError {
  email: string;
  line: number;
  error: string;
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'crewradr-member-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 1 || !parts[0]) continue;
    rows.push({
      email: parts[0],
      role: parts[1] || 'member',
      line: i + 1,
    });
  }
  return rows;
}

function validateRows(rows: ParsedRow[]): { valid: ParsedRow[]; errors: RowError[] } {
  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];
  for (const row of rows) {
    if (!EMAIL_RE.test(row.email)) {
      errors.push({ email: row.email || '(empty)', line: row.line, error: 'Invalid email format' });
      continue;
    }
    if (!VALID_ROLES.includes(row.role)) {
      errors.push({ email: row.email, line: row.line, error: `Invalid role "${row.role}". Use: ${VALID_ROLES.join(', ')}` });
      continue;
    }
    valid.push(row);
  }
  return { valid, errors };
}

export function CsvImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { crewId } = useCrew();
  const importMutation = useBulkImport(crewId!);
  const [text, setText] = useState('');
  const [importDone, setImportDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [clientErrors, setClientErrors] = useState<RowError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = useCallback((content: string) => {
    setText(content);
    const rows = parseCsv(content);
    const { valid, errors } = validateRows(rows);
    setPreview(valid.length > 0 ? valid : null);
    setClientErrors(errors);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processText(content);
    };
    reader.readAsText(file);
  }, [processText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file);
    }
  }, [handleFile]);

  const handlePasteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    processText(e.target.value);
  }, [processText]);

  if (!open) return null;

  const handleImport = () => {
    if (!preview || preview.length === 0) return;
    const members = preview.map(r => ({ email: r.email, role: r.role }));
    importMutation.mutate(members, {
      onSuccess: () => {
        setImportDone(true);
        setTimeout(() => { setImportDone(false); onClose(); }, 2500);
      },
    });
  };

  const serverErrors: RowError[] = importMutation.data?.errors.map((e: { email: string; error: string }, i: number) => ({
    email: e.email,
    line: 0,
    error: e.error,
  })) ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-surface border border-outline rounded-xxl p-sz-xl max-w-[560px] w-full mx-sz-lg pointer-events-auto shadow-sm max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-sz-lg">
            <h2 className="font-heading font-extrabold text-lg text-on-surface">{t('webMembersImportDialogTitle')}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container"><X size={18} /></button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-sz-xl text-center mb-sz-lg cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary-container/20' : 'border-outline hover:bg-surface-container'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Upload size={32} className="mx-auto mb-2 text-on-surface-variant opacity-40" />
            <p className="text-sm text-on-surface-variant">{t('webMembersImportPaste')}</p>
            <p className="text-2xs text-on-surface-variant mt-1">{t('webMembersImportFormat')}</p>
            <button
              onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-outline px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <Download size={12} />
              {t('webMembersImportDownloadTemplate')}
            </button>
          </div>

          {/* Textarea fallback */}
          <textarea value={text} onChange={handlePasteChange}
            placeholder={t('webMembersImportHint')}
            className="w-full h-24 rounded-lg border border-outline bg-surface-container p-3 text-sm font-mono resize-none"
          />

          {/* Client-side validation errors */}
          {clientErrors.length > 0 && (
            <div className="mt-sz-md rounded-lg border border-warning/30 bg-warning-container/50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={14} className="text-warning shrink-0" />
                <span className="text-xs font-semibold text-warning">{t('webMembersImportErrors', { errors: clientErrors.length })}</span>
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {clientErrors.map((e, i) => (
                  <li key={i} className="text-xs text-on-surface-variant">
                    <span className="font-mono text-on-surface">{e.email}</span>
                    {e.line > 0 && <span className="text-on-surface-variant/60"> (line {e.line})</span>}
                    {' — '}{e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="mt-sz-md rounded-lg border border-outline p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={14} className="text-on-surface-variant shrink-0" />
                <span className="text-xs font-semibold text-on-surface-variant">{t('webMembersImportPreview')} ({preview.length})</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {preview.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="font-mono text-on-surface truncate flex-1">{r.email}</span>
                    <span className="rounded-full px-1.5 py-0 text-[10px] font-semibold bg-surface-container">{r.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Server-side errors after import */}
          {importMutation.data && serverErrors.length > 0 && (
            <div className="mt-sz-md rounded-lg border border-error/30 bg-error-container/30 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={14} className="text-error shrink-0" />
                <span className="text-xs font-semibold text-error">{t('webMembersImportErrors', { errors: serverErrors.length })}</span>
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {serverErrors.map((e, i) => (
                  <li key={i} className="text-xs text-on-surface-variant">
                    <span className="font-mono text-on-surface">{e.email}</span>
                    {' — '}{e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-sz-md text-2xs text-on-surface-variant/60 leading-relaxed">
            {t('webMembersImportNote')}
          </p>

          <div className="flex gap-3 mt-sz-lg justify-end">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">{t('webMembersImportCancel')}</button>
            <button onClick={handleImport} disabled={!preview || preview.length === 0 || importMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 disabled:opacity-50">
              {importMutation.isPending ? t('webMembersImportImporting') : importDone ? t('webAccountProfileSaved') : t('webMembersImportCsv')}
            </button>
          </div>

          {(importMutation.data || importDone) && importMutation.data && serverErrors.length === 0 && (
            <div className="mt-sz-lg p-3 rounded-lg text-sm bg-primary-container text-primary">
              <CheckCircle size={14} className="inline mr-1.5" />
              {t('webMembersImportResult', { added: importMutation.data.added })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
