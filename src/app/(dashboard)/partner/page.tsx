'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, Button, Label, Input, Badge } from '@/components/ui'
import type { Partner } from '@/types'

const columns: ColumnDef<Partner>[] = [
  { accessorKey: 'p_nev', header: 'Név' },
  { accessorKey: 'p_adoszam', header: 'Adószám' },
  { accessorKey: 'p_varos', header: 'Város' },
  { accessorKey: 'p_telefon', header: 'Telefon' },
  { accessorKey: 'p_email', header: 'Email' },
  {
    accessorKey: 'p_aktiv',
    header: 'Státusz',
    cell: ({ getValue }) => (
      <Badge color={getValue() ? 'green' : 'slate'}>
        {getValue() ? 'Aktív' : 'Inaktív'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <Pencil className="w-3.5 h-3.5 text-slate-400" />
    ),
  },
]

type PartnerForm = Omit<Partner, 'p_id' | 'p_aktiv'>

export default function PartnerPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Partner | null>(null)

  const { data, isLoading } = useQuery<{ data: Partner[]; count: number }>({
    queryKey: ['partnerek'],
    queryFn: () => fetch('/api/partner').then(r => r.json()),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PartnerForm>()

  const saveMutation = useMutation({
    mutationFn: async (formData: PartnerForm) => {
      const method = selected ? 'PUT' : 'POST'
      const body = selected ? { ...formData, p_id: selected.p_id, p_aktiv: selected.p_aktiv } : formData
      const res = await fetch('/api/partner', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Mentési hiba')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partnerek'] })
      setModalOpen(false)
      reset()
      setSelected(null)
    },
  })

  function openNew() {
    setSelected(null)
    reset()
    setModalOpen(true)
  }

  function openEdit(partner: Partner) {
    setSelected(partner)
    reset(partner)
    setModalOpen(true)
  }

  function handleExcel() {
    window.open('/api/export/excel/partner', '_blank')
  }

  return (
    <div>
      <PageHeader
        title="Partnerek"
        subtitle={`${data?.count ?? 0} partner`}
        actions={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Új partner
          </Button>
        }
      />

      <DataTable
        fillHeight
        data={data?.data ?? []}
        columns={columns}
        loading={isLoading}
        onRowClick={openEdit}
        onExcelExport={handleExcel}
        emptyMessage="Nincsenek partnerek."
      />

      {/* Partner form modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null); reset() }}
        title={selected ? `Partner szerkesztése: ${selected.p_nev}` : 'Új partner'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button
              onClick={handleSubmit(data => saveMutation.mutate(data))}
              loading={saveMutation.isPending}
            >
              Mentés
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="p_nev" required>Megnevezés</Label>
            <Input
              id="p_nev"
              {...register('p_nev', { required: 'Kötelező mező' })}
              error={errors.p_nev?.message}
              placeholder="Partner neve"
            />
          </div>
          <div>
            <Label htmlFor="p_rovidnev">Rövidnév</Label>
            <Input id="p_rovidnev" {...register('p_rovidnev')} placeholder="Rövidnév" />
          </div>
          <div>
            <Label htmlFor="p_adoszam">Adószám</Label>
            <Input id="p_adoszam" {...register('p_adoszam')} placeholder="12345678-1-12" />
          </div>
          <div>
            <Label htmlFor="p_irsz">Irányítószám</Label>
            <Input id="p_irsz" {...register('p_irsz')} placeholder="1234" />
          </div>
          <div>
            <Label htmlFor="p_varos">Város</Label>
            <Input id="p_varos" {...register('p_varos')} placeholder="Budapest" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="p_cim">Cím</Label>
            <Input id="p_cim" {...register('p_cim')} placeholder="Utca, házszám" />
          </div>
          <div>
            <Label htmlFor="p_telefon">Telefon</Label>
            <Input id="p_telefon" {...register('p_telefon')} placeholder="+36 1 234 5678" />
          </div>
          <div>
            <Label htmlFor="p_email">Email</Label>
            <Input id="p_email" type="email" {...register('p_email')} placeholder="partner@example.com" />
          </div>
        </div>

        {saveMutation.isError && (
          <p className="mt-3 text-sm text-red-600">Hiba történt a mentés során.</p>
        )}
      </Modal>
    </div>
  )
}
