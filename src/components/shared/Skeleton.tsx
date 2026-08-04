// src/components/shared/Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container-highest rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-outline rounded-lg p-lg space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
