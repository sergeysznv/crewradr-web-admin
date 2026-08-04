import { type ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface Pagination {
  offset: number;
  limit: number;
  total: number;
  onPageChange: (offset: number) => void;
}

export function DataTable<T extends { id: string }>({
  columns, data, pagination, onRowClick
}: {
  columns: Column<T>[];
  data: T[];
  pagination?: Pagination;
  onRowClick?: (row: T) => void;
}) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            {columns.map(col => (
              <th key={col.key} className={`text-left text-2xs uppercase text-on-surface-variant tracking-wider font-semibold px-3 py-2 ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-outline-variant min-h-[48px] ${onRowClick ? 'cursor-pointer hover:bg-surface-container' : ''}`}>
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-2.5 ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between px-3 py-3 text-xs text-on-surface-variant">
          <span>Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}</span>
          <div className="flex gap-2">
            <button disabled={pagination.offset === 0}
              onClick={() => pagination.onPageChange(Math.max(0, pagination.offset - pagination.limit))}
              className="px-3 py-1 rounded-md border border-outline disabled:opacity-30 hover:bg-surface-container">Prev</button>
            <span className="px-2 py-1">{currentPage} / {totalPages}</span>
            <button disabled={pagination.offset + pagination.limit >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.offset + pagination.limit)}
              className="px-3 py-1 rounded-md border border-outline disabled:opacity-30 hover:bg-surface-container">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
