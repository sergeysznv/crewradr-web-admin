// src/components/settings/DangerZone.tsx
'use client';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export function DangerZone() {
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  return (
    <div className="border border-error/20 rounded-lg p-lg space-y-4">
      <h3 className="font-heading font-bold text-sm text-error">Danger Zone</h3>

      <div className="flex items-center justify-between py-2 border-b border-outline-variant">
        <div>
          <div className="text-sm font-semibold text-on-surface">Transfer Ownership</div>
          <div className="text-xs text-on-surface-variant">Transfer captaincy to another member</div>
        </div>
        <button onClick={() => setShowTransfer(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface-variant hover:bg-surface-container">
          Transfer
        </button>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-outline-variant">
        <div>
          <div className="text-sm font-semibold text-on-surface">Leave Crew</div>
          <div className="text-xs text-on-surface-variant">Remove yourself from this crew</div>
        </div>
        <button onClick={() => setShowLeave(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-error/30 text-error hover:bg-error-container">
          Leave
        </button>
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm font-semibold text-on-surface">Delete Crew</div>
          <div className="text-xs text-on-surface-variant">Permanently delete this crew and all its data</div>
        </div>
        <button onClick={() => setShowDelete(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-error text-white hover:opacity-90">
          Delete
        </button>
      </div>

      <ConfirmDialog open={showTransfer} title="Transfer Ownership" message="Select a new captain. You will become a member." confirmLabel="Transfer" destructive onConfirm={() => setShowTransfer(false)} onCancel={() => setShowTransfer(false)} />
      <ConfirmDialog open={showLeave} title="Leave Crew" message="Are you sure you want to leave this crew?" confirmLabel="Leave" destructive onConfirm={() => setShowLeave(false)} onCancel={() => setShowLeave(false)} />
      <ConfirmDialog open={showDelete} title="Delete Crew" message="This permanently deletes the crew and all its data. This cannot be undone." confirmLabel="Delete Crew" destructive onConfirm={() => setShowDelete(false)} onCancel={() => setShowDelete(false)} />
    </div>
  );
}
