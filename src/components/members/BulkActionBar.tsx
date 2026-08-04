// src/components/members/BulkActionBar.tsx
// Reserved component: bulk selection is not implemented yet (no checkboxes
// exist in MembersView), so this bar is not rendered anywhere. The action
// buttons are disabled with "Coming soon" titles until the feature lands.
export function BulkActionBar({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-surface border border-outline rounded-xl shadow-lg px-lg py-3 flex items-center gap-4">
      <span className="text-sm font-semibold text-on-surface">{count} selected</span>
      <button disabled title="Coming soon"
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface-variant opacity-40 cursor-not-allowed">Change Role</button>
      <button disabled title="Coming soon"
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-error/30 text-error opacity-40 cursor-not-allowed">Remove</button>
      <button onClick={onClear} className="text-xs text-on-surface-variant underline">Clear</button>
    </div>
  );
}
