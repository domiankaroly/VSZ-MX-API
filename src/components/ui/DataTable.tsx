'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Printer, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onRowClick?: (row: T) => void
  loading?: boolean
  onExcelExport?: () => void
  onPrint?: () => void
  searchable?: boolean
  emptyMessage?: string
  className?: string
  // Ha true, a tábla kitölti a szülő magasságát és görget benne
  // Ha false (default), a tábla annyi helyet foglal amennyit a tartalom igényel
  fillHeight?: boolean
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  loading,
  onExcelExport,
  onPrint,
  searchable = true,
  emptyMessage = 'Nincs megjeleníthető adat.',
  className,
  fillHeight = false,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className={cn(
      'flex flex-col gap-3',
      fillHeight && 'h-full min-h-0',
      className
    )}>
      {/* Toolbar */}
      {(searchable || onExcelExport || onPrint) && (
        <div className="flex items-center gap-2 no-print flex-shrink-0">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="Keresés..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex-1" />
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Nyomtatás
            </button>
          )}
          {onExcelExport && (
            <button
              onClick={onExcelExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>
          )}
        </div>
      )}

      {/* Táblázat wrapper */}
      <div className={cn(
        'border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col',
        fillHeight ? 'flex-1 min-h-0 overflow-hidden' : 'overflow-hidden'
      )}>
        {/* Görgetési terület: vízszintesen és függőlegesen is */}
        <div className={cn(
          'overflow-auto',
          fillHeight ? 'flex-1 min-h-0' : 'max-h-[calc(100vh-280px)]'
        )}>
          <table className="w-max min-w-full text-sm">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="bg-slate-50 border-b border-slate-200">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-800' : ''
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-slate-300">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronsUpDown className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <span className="text-sm">Betöltés...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-slate-400 text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'transition-colors',
                      i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white',
                      onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50/80'
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Lábléc */}
        {!loading && table.getRowModel().rows.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 no-print flex-shrink-0">
            {table.getFilteredRowModel().rows.length} sor
            {globalFilter && ` (szűrve: ${data.length} összesből)`}
          </div>
        )}
      </div>
    </div>
  )
}
