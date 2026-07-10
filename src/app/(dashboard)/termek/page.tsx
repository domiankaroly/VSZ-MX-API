'use client'

import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader, Badge } from '@/components/ui'
import { formatFt } from '@/lib/utils'
import type { Termek } from '@/types'

const columns: ColumnDef<Termek>[] = [
  { accessorKey: 't_cikkszam', header: 'Cikkszám', size: 120 },
  { accessorKey: 't_nev', header: 'Megnevezés' },
  { accessorKey: 't_csoport', header: 'Csoport' },
  { accessorKey: 't_egyseg', header: 'Egység', size: 80 },
  {
    accessorKey: 't_brutto_ar',
    header: 'Bruttó ár',
    cell: ({ getValue }) => formatFt(getValue() as number),
  },
  {
    accessorKey: 't_aktiv',
    header: 'Státusz',
    cell: ({ getValue }) => (
      <Badge color={getValue() ? 'green' : 'slate'}>
        {getValue() ? 'Aktív' : 'Inaktív'}
      </Badge>
    ),
  },
]

export default function TermekPage() {
  const { data, isLoading } = useQuery<{ data: Termek[]; count: number }>({
    queryKey: ['termekek'],
    queryFn: () => fetch('/api/termek').then(r => r.json()),
  })

  return (
    <div>
      <PageHeader
        title="Termékek"
        subtitle={`${data?.count ?? 0} termék`}
      />
      <DataTable
        fillHeight
        data={data?.data ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nincsenek termékek."
      />
    </div>
  )
}
