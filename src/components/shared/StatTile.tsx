'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  subtitle,
  tone,
  href,
  tooltip,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: 'good' | 'bad' | 'neutral';
  href?: string;
  tooltip?: string;
}) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative rounded-lg bg-surface border border-outline p-4 transition-all duration-200 select-none",
        href && "cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
          {label}
        </p>
        {href && (
          <ArrowUpRight className="h-3 w-3 text-on-surface-variant/40 hover:text-primary transition-colors shrink-0" />
        )}
      </div>
      <p
        className={cn(
          'mt-1 text-2xl font-extrabold',
          tone === 'good'
            ? 'text-success'
            : tone === 'bad'
              ? 'text-error'
              : 'text-on-surface',
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>
      )}

      {/* Tooltip */}
      {tooltip && isHovered && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-950 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 rounded-lg shadow-xl text-xs leading-normal animate-fade-in pointer-events-none">
          <div className="font-semibold mb-1 flex items-center gap-1.5 text-zinc-200">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            More Details
          </div>
          <p className="text-zinc-400 font-normal">{tooltip}</p>
          {href && (
            <p className="mt-1.5 text-[10px] text-primary font-medium flex items-center gap-0.5">
              Click to open detailed page <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
            </p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-950 dark:bg-zinc-900 rotate-45 -mt-1 border-r border-b border-transparent dark:border-zinc-800" />
        </div>
      )}
    </div>
  );
}

