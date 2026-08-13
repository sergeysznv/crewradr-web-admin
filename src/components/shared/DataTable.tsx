// src/components/shared/DataTable.tsx
'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/hooks/use-translations';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface PaginationConfig {
  offset: number;
  limit: number;
  total: number;
  onPageChange: (offset: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  pagination,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: DataTableProps<T>) {
  const { t } = useT();
  const showCheckbox = !!onToggleSelect && !!onToggleSelectAll;
  const currentPage = pagination
    ? Math.floor(pagination.offset / pagination.limit) + 1
    : 1;
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              {showCheckbox && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={
                      data.length > 0 &&
                      data.every((d) => selectedIds?.has(d.id))
                    }
                    onChange={onToggleSelectAll}
                    className="rounded border-outline accent-primary"
                    aria-label={t('webSharedSelectAll')}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isSelected = selectedIds?.has(row.id) ?? false;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-outline-variant transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-surface-container' : ''
                  } ${isSelected ? 'bg-primary-container' : ''}`}
                >
                  {showCheckbox && (
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(row.id)}
                        className="rounded border-outline accent-primary"
                        aria-label={t('webSharedSelectItem', { id: row.id })}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-outline-variant px-4 py-2">
          <p className="text-xs text-on-surface-variant">
            {t('webSharedShowing', {
              from: pagination.offset + 1,
              to: Math.min(pagination.offset + pagination.limit, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0}
              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
              aria-label={t('webSharedPrevPage')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-on-surface-variant">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                pagination.onPageChange(
                  pagination.offset + pagination.limit < pagination.total
                    ? pagination.offset + pagination.limit
                    : pagination.offset,
                )
              }
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
              aria-label={t('webSharedNextPage')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
