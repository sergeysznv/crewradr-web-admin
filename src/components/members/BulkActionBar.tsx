// src/components/members/BulkActionBar.tsx
'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const ROLES = ['member', 'co-captain'];

export function BulkActionBar({ count, working, onRemove, onRoleChange, onClear }: {
  count: number;
  working?: boolean;
  onRemove: () => void;
  onRoleChange: (role: string) => void;
  onClear: () => void;
}) {
  const [role, setRole] = useState(ROLES[0]);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-surface border border-outline rounded-xl shadow-lg px-lg py-3 flex items-center gap-4">
      <span className="text-sm font-semibold text-on-surface">{count} selected</span>
      <div className="flex items-center gap-2">
        <label className="text-2xs text-on-surface-variant uppercase tracking-wider" htmlFor="bulk-role">Role</label>
        <select
          id="bulk-role"
          value={role}
          onChange={e => setRole(e.target.value)}
          disabled={working}
          className="px-2 py-1.5 rounded-lg text-xs font-semibold border border-outline bg-surface text-on-surface disabled:opacity-50"
          aria-label="Change role for selected members"
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={() => onRoleChange(role)}
          disabled={working}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      <button
        onClick={onRemove}
        disabled={working}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-error/30 text-error hover:bg-error-container disabled:opacity-50"
      >
        {working && <Loader2 className="h-3 w-3 animate-spin" />}
        Remove
      </button>
      <button onClick={onClear} disabled={working} className="text-xs text-on-surface-variant underline disabled:opacity-50">Clear</button>
    </div>
  );
}
