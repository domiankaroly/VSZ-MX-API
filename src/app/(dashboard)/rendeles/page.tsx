'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader, Badge, Button } from '@/components/ui'
import { formatVszDate, formatFt, honapKezdete, maiNap } from '@/lib/utils'
import type { Rendeles } from '@/types'

const columns: ColumnDef<Rendeles>[] = [
  { accessorKey: 'rend_sorszam', header: 'Sorszám', size: 120 },
  { accessorKey: 'p_nev', header: 'Partner' },
  {
    accessorKey: 'szallitas_datum',
    header: 'Szállítás',
    cell: ({ getValue }) => formatVszDate(getValue() as string),
  },
  {
    accessorKey: 'rend_osszeg',
    header: 'Összeg',
    cell: ({ getValue }) => formatFt(getValue() as number),
  },
  {
    accessorKey: 'web_rendeles',
    header: 'Forrás',
    cell: ({ getValue }) => (
      <Badge color={getValue() ? 'blue' : 'slate'}>
        {getValue() ? 'Web' : 'Belső'}
      </Badge>
    ),
  },
  {
    accessorKey: 'rend_aktiv',
    header: 'Státusz',
    cell: ({ getValue }) => (
      <Badge color={getValue() ? 'green' : 'slate'}>
        {getValue() ? 'Aktív' : 'Lezárt'}
      </Badge>
    ),
  },
]

export default function RendelesPage() {
  const [datumTol, setDatumTol] = useState(honapKezdete().slice(0, -1)) // remove trailing dot for input
  const [datumIg, setDatumIg] = useState(maiNap().slice(0, -1))

  const { data, isLoading, refetch } = useQuery<{ data: Rendeles[]; count: number }>({
    queryKey: ['rendelesek', datumTol, datumIg],
    queryFn: () =>
      fetch(`/api/rendeles?tol=${datumTol}.&ig=${datumIg}.`).then(r => r.json()),
  })

  function handleExcel() {
    window.open(`/api/export/excel/rendeles?tol=${datumTol}.&ig=${datumIg}.`, '_blank')
  }

  return (
    <div>
      <PageHeader
        title="Rendelések"
        subtitle={`${data?.count ?? 0} rendelés`}
      />

      {/* Szűrő sáv */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Dátumtól</label>
          <input
            type="date"
            value={datumTol}
            onChange={e => setDatumTol(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Dátumig</label>
          <input
            type="date"
            value={datumIg}
            onChange={e => setDatumIg(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          Frissítés
        </Button>
      </div>

      <DataTable
        fillHeight
        data={data?.data ?? []}
        columns={columns}
        loading={isLoading}
        onExcelExport={handleExcel}
        emptyMessage="Nincsenek rendelések a kiválasztott időszakban."
      />
    </div>
  )
}
