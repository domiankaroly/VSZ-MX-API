'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, Button, Label, Input, Badge } from '@/components/ui'
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'

// ── Típusok ────────────────────────────────────────────────────────────────
interface Termek {
  t_id: number; t_plu: string; t_neve: string; t_aktiv: number
  tm_nev: string; ta_nev: string; megnevezes: string
  csgo_nev: string; csmo_nev: string; csom_megnevezes: string
  t_halal: number; t_szorta: number; t_szorta_tol: number; t_szorta_ig: number
  t_kod: string; t_hbsys_kod: string; t_cikkszam: string; t_vonalkod: string
  t_tipus: number; t_egysegar: number; t_sorrend: number
  t_sajat: number; t_raktell: number; t_rendelesre: number; t_meresre: number
  t_feldolg: number; t_cimke: number; t_vonal_ar: number
  t_allateledel: number; t_norma: number; t_szavido: number
  t_alap_norma: number; t_igeny_szorzo: number
  t_szamla_hu: string; t_szamla_en: string; t_szamla_de: string
  t_bizerba_plu: string; t_fagyasztos: number; t_lab: number; t_vasarolt: number
  t_bizerba_layout: string; t_hely_plu: string; t_partner_plu: string
  t_darabolo_kiad: string; t_min_dolgozo: number; t_jegyzet: string
  t_allat: number; t_mod: number; af_id: number; csom_id: number
  t_alap: number; t_gep_id: number | null; t_raktar_termek_id: number | null
  csmo_szin: string; t_penznem: number
}
interface PartnerAr { p_nev: string; pt_ar: number; dev_rovid: string; p_szallitasi_cim: string; pt_id: number; p_rovnev: string }
interface Dropdown { id?: number; ta_id?: number; tm_id?: number; af_id?: number; csom_id?: number; g_id?: number; t_id?: number; megnevezes?: string; ta_nev?: string; tm_nev?: string; csom_megnevezes?: string; g_name?: string; t_kiir?: string }
interface Dropdowns { allat: Dropdown[]; alap: Dropdown[]; mod: Dropdown[]; afa: Dropdown[]; csomagolas: Dropdown[]; gepek: Dropdown[]; termekek: Dropdown[] }

// ── Segéd: checkbox mező ───────────────────────────────────────────────────
function CbField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

// ── Fő lista oszlopok (partnerC1TrueDBGrid) ────────────────────────────────
const cols: ColumnDef<Termek>[] = [
  { accessorKey: 't_plu',           header: 'PLU',        size: 70 },
  { accessorKey: 't_neve',          header: 'Termék neve' },
  { accessorKey: 'tm_nev',          header: 'Mód' },
  { accessorKey: 'ta_nev',          header: 'Állat' },
  { accessorKey: 'megnevezes',      header: 'Alap' },
  { accessorKey: 'csgo_nev',        header: 'Csom.csoport' },
  { accessorKey: 'csmo_nev',        header: 'Csom.mód' },
  { accessorKey: 'csom_megnevezes', header: 'Csomagolás' },
  { accessorKey: 't_halal',         header: 'Halal',
    cell: ({ getValue }) => getValue() ? <Badge color="green">✓</Badge> : null },
  { accessorKey: 't_szorta',        header: 'Szorta',
    cell: ({ getValue }) => getValue() ? <Badge color="blue">✓</Badge> : null },
  { accessorKey: 't_aktiv',         header: 'Aktív',
    cell: ({ getValue }) => <Badge color={getValue() ? 'green' : 'slate'}>{getValue() ? 'Igen' : 'Nem'}</Badge> },
  { accessorKey: 't_sorrend',       header: 'Sor.',       size: 60 },
  { accessorKey: 't_egysegar',      header: 'Egységár',   size: 80 },
  { accessorKey: 't_cikkszam',      header: 'Cikkszám' },
  { accessorKey: 't_vonalkod',      header: 'Vonalkód' },
]

// ── Partner ár oszlopok ────────────────────────────────────────────────────
const partnerArCols: ColumnDef<PartnerAr>[] = [
  { accessorKey: 'p_nev',            header: 'Partner' },
  { accessorKey: 'p_rovnev',         header: 'Rövidnév' },
  { accessorKey: 'pt_ar',            header: 'Ár' },
  { accessorKey: 'dev_rovid',        header: 'Deviza' },
  { accessorKey: 'p_szallitasi_cim', header: 'Szállítási cím' },
]

// ── Üres form ──────────────────────────────────────────────────────────────
const EMPTY: Partial<Termek> = {
  t_neve: '', t_plu: '', t_cikkszam: '', t_vonalkod: '', t_kod: '', t_hbsys_kod: '',
  t_szamla_hu: '', t_szamla_en: '', t_szamla_de: '',
  t_hely_plu: '', t_partner_plu: '', t_darabolo_kiad: '', t_jegyzet: '',
  t_egysegar: 0, t_sorrend: 0, t_norma: 0, t_alap_norma: 0, t_igeny_szorzo: 1,
  t_szavido: 0, t_szorta_tol: 0, t_szorta_ig: 0, t_min_dolgozo: 0,
  t_aktiv: 1, t_tipus: 0, t_penznem: 1,
  t_halal: 0, t_szorta: 0, t_sajat: 0, t_raktell: 0, t_rendelesre: 0,
  t_meresre: 0, t_feldolg: 0, t_cimke: 0, t_vonal_ar: 0,
  t_allateledel: 0, t_lab: 0, t_vasarolt: 0, t_fagyasztos: 0,
}

// ── Főkomponens ────────────────────────────────────────────────────────────
export default function AruAdatPage() {
  const qc = useQueryClient()
  const [aktiv, setAktiv] = useState(true)    // c1CheckBox1
  const [selected, setSelected] = useState<Termek | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState<Partial<Termek>>(EMPTY)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Lekérdezések ──────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery<{ data: Termek[]; count: number }>({
    queryKey: ['aru-adat-list', aktiv],
    queryFn: () => fetch(`/api/aru-adat?action=list&aktiv=${aktiv ? '1' : 'all'}`).then(r => r.json()),
  })

  const { data: dd } = useQuery<Dropdowns>({
    queryKey: ['aru-adat-dropdowns'],
    queryFn: () => fetch('/api/aru-adat?action=dropdowns').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const { data: partnerArakData } = useQuery<{ data: PartnerAr[] }>({
    queryKey: ['aru-adat-partner-arak', selected?.t_id],
    queryFn: () => fetch(`/api/aru-adat?action=partner-arak&t_id=${selected?.t_id}`).then(r => r.json()),
    enabled: !!selected?.t_id,
  })

  // ── Mutációk ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Termek>) => {
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch('/api/aru-adat', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aru-adat-list'] })
      setModalOpen(false)
      setErrorMsg('')
    },
    onError: (e: Error) => setErrorMsg(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (tid: number) => {
      const res = await fetch(`/api/aru-adat?t_id=${tid}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aru-adat-list'] })
      setSelected(null)
      setDeleteConfirm(false)
    },
    onError: (e: Error) => setErrorMsg(e.message),
  })

  // ── Sor kiválasztás — PartnerC1TrueDBGrid_RowColChange ────────────────
  function handleRowClick(row: Termek) {
    setSelected(row)
    setForm(row)
  }

  function handleNew() {
    setIsNew(true)
    setForm({ ...EMPTY, t_allat: dd?.allat[0]?.ta_id, t_alap: dd?.alap[0]?.id, t_mod: dd?.mod[0]?.tm_id, af_id: dd?.afa[0]?.af_id, csom_id: dd?.csomagolas[0]?.csom_id })
    setModalOpen(true)
  }

  function handleEdit() {
    if (!selected) return
    setIsNew(false)
    setForm(selected)
    setModalOpen(true)
  }

  function f(k: keyof Termek) { return (form[k] ?? '') as string }
  function n(k: keyof Termek) { return Number(form[k] ?? 0) }
  function b(k: keyof Termek) { return !!form[k] }
  function set(k: keyof Termek, v: unknown) { setForm(prev => ({ ...prev, [k]: v })) }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Termékek karbantartása"
        subtitle={`${listData?.count ?? 0} termék`}
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!aktiv} onChange={e => setAktiv(!e.target.checked)}
                className="w-4 h-4 accent-blue-600" />
              Inaktívak is
            </label>
            {selected && (
              <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Törlés
              </Button>
            )}
            {selected && (
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                <Pencil className="w-3.5 h-3.5" /> Szerkesztés
              </Button>
            )}
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-3.5 h-3.5" /> Új termék
            </Button>
          </div>
        }
      />

      {/* ── Bal: termék lista + Jobb: partner árak ── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Fő lista */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          {selected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 mb-2 text-sm text-blue-800 font-medium flex items-center gap-2">
              <span>Kijelölve:</span>
              <span className="font-bold">{selected.t_plu}</span>
              <span>—</span>
              <span>{selected.t_neve}</span>
            </div>
          )}
          <DataTable
            data={listData?.data ?? []}
            columns={cols}
            loading={isLoading}
            onRowClick={handleRowClick}
            fillHeight
            emptyMessage="Nincsenek termékek."
          />
        </div>

        {/* Partner árak panel — csak ha van kiválasztott termék */}
        {selected && (
          <div className="w-96 flex flex-col flex-shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Partner árak</p>
            <DataTable
              data={partnerArakData?.data ?? []}
              columns={partnerArCols}
              fillHeight
              searchable={false}
              emptyMessage="Nincs partner ár."
            />
          </div>
        )}
      </div>

      {/* ── Szerkesztő modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setErrorMsg('') }}
        title={isNew ? 'Új termék' : `Termék szerkesztése: ${selected?.t_neve ?? ''}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button onClick={() => saveMutation.mutate(form)} loading={saveMutation.isPending}>
              {isNew ? 'Rögzítés' : 'Módosítás'}
            </Button>
          </>
        }
      >
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="space-y-5">
          {/* ── Alapadatok ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Alapadatok</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Label htmlFor="t_neve" required>Termék neve (HU)</Label>
                <Input id="t_neve" value={f('t_neve')} onChange={e => set('t_neve', e.target.value)} placeholder="pl. Csirkemell filé" />
              </div>
              <div>
                <Label htmlFor="t_szamla_hu">Számlán (HU)</Label>
                <Input id="t_szamla_hu" value={f('t_szamla_hu')} onChange={e => set('t_szamla_hu', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_szamla_en">Számlán (EN)</Label>
                <Input id="t_szamla_en" value={f('t_szamla_en')} onChange={e => set('t_szamla_en', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_szamla_de">Számlán (DE)</Label>
                <Input id="t_szamla_de" value={f('t_szamla_de')} onChange={e => set('t_szamla_de', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_plu">PLU</Label>
                <Input id="t_plu" value={f('t_plu')} onChange={e => set('t_plu', e.target.value)} placeholder="pl. 1001" />
              </div>
              <div>
                <Label htmlFor="t_cikkszam">Cikkszám</Label>
                <Input id="t_cikkszam" value={f('t_cikkszam')} onChange={e => set('t_cikkszam', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_vonalkod">Vonalkód</Label>
                <Input id="t_vonalkod" value={f('t_vonalkod')} onChange={e => set('t_vonalkod', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_kod">Kód</Label>
                <Input id="t_kod" value={f('t_kod')} onChange={e => set('t_kod', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_hbsys_kod">HBSYS kód</Label>
                <Input id="t_hbsys_kod" value={f('t_hbsys_kod')} onChange={e => set('t_hbsys_kod', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t_sorrend">Sorrend</Label>
                <Input id="t_sorrend" type="number" value={n('t_sorrend')} onChange={e => set('t_sorrend', +e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Besorolás ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Besorolás</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Állatfaj</Label>
                <select value={n('t_allat')} onChange={e => set('t_allat', +e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {dd?.allat.map(a => <option key={a.ta_id} value={a.ta_id}>{a.ta_nev}</option>)}
                </select>
              </div>
              <div>
                <Label>Termék alap</Label>
                <select value={n('t_alap')} onChange={e => set('t_alap', +e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {dd?.alap.map(a => <option key={a.id} value={a.id}>{a.megnevezes}</option>)}
                </select>
              </div>
              <div>
                <Label>Mód</Label>
                <select value={n('t_mod')} onChange={e => set('t_mod', +e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {dd?.mod.map(m => <option key={m.tm_id} value={m.tm_id}>{m.tm_nev}</option>)}
                </select>
              </div>
              <div>
                <Label>ÁFA</Label>
                <select value={n('af_id')} onChange={e => set('af_id', +e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {dd?.afa.map(a => <option key={a.af_id} value={a.af_id}>{a.megnevezes}</option>)}
                </select>
              </div>
              <div>
                <Label>Csomagolás</Label>
                <select value={n('csom_id')} onChange={e => set('csom_id', +e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {dd?.csomagolas.map(c => <option key={c.csom_id} value={c.csom_id}>{c.csom_megnevezes}</option>)}
                </select>
              </div>
              <div>
                <Label>Gép</Label>
                <select value={n('t_gep_id') || ''} onChange={e => set('t_gep_id', e.target.value ? +e.target.value : null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">—</option>
                  {dd?.gepek.map(g => <option key={g.g_id} value={g.g_id}>{g.g_name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── Árak és mértékegységek ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Árak / Mértékegységek</h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Egységár</Label>
                <Input type="number" step="0.01" value={n('t_egysegar')} onChange={e => set('t_egysegar', +e.target.value)} />
              </div>
              <div>
                <Label>Típus</Label>
                <select value={n('t_tipus')} onChange={e => set('t_tipus', +e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value={0}>Kg</option>
                  <option value={1}>Db</option>
                </select>
              </div>
              <div>
                <Label>Norma</Label>
                <Input type="number" step="0.01" value={n('t_norma')} onChange={e => set('t_norma', +e.target.value)} />
              </div>
              <div>
                <Label>Alap norma</Label>
                <Input type="number" step="0.01" value={n('t_alap_norma')} onChange={e => set('t_alap_norma', +e.target.value)} />
              </div>
              <div>
                <Label>Igény szorzó</Label>
                <Input type="number" step="0.01" value={n('t_igeny_szorzo')} onChange={e => set('t_igeny_szorzo', +e.target.value)} />
              </div>
              <div>
                <Label>Szavatosság (nap)</Label>
                <Input type="number" value={n('t_szavido')} onChange={e => set('t_szavido', +e.target.value)} />
              </div>
              <div>
                <Label>Szortát (-tól)</Label>
                <Input type="number" step="0.01" value={n('t_szorta_tol')} onChange={e => set('t_szorta_tol', +e.target.value)} />
              </div>
              <div>
                <Label>Szortát (-ig)</Label>
                <Input type="number" step="0.01" value={n('t_szorta_ig')} onChange={e => set('t_szorta_ig', +e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Tulajdonságok checkboxok ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tulajdonságok</h3>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2">
              <CbField label="Aktív"           checked={b('t_aktiv')}      onChange={v => set('t_aktiv', v ? 1 : 0)} />
              <CbField label="Halal"            checked={b('t_halal')}      onChange={v => set('t_halal', v ? 1 : 0)} />
              <CbField label="Szorta"           checked={b('t_szorta')}     onChange={v => set('t_szorta', v ? 1 : 0)} />
              <CbField label="Saját"            checked={b('t_sajat')}      onChange={v => set('t_sajat', v ? 1 : 0)} />
              <CbField label="Raktárellátott"   checked={b('t_raktell')}    onChange={v => set('t_raktell', v ? 1 : 0)} />
              <CbField label="Rendelésre"       checked={b('t_rendelesre')} onChange={v => set('t_rendelesre', v ? 1 : 0)} />
              <CbField label="Mérésre"          checked={b('t_meresre')}    onChange={v => set('t_meresre', v ? 1 : 0)} />
              <CbField label="Feldolgoz."       checked={b('t_feldolg')}    onChange={v => set('t_feldolg', v ? 1 : 0)} />
              <CbField label="Cimke"            checked={b('t_cimke')}      onChange={v => set('t_cimke', v ? 1 : 0)} />
              <CbField label="Vonalár"          checked={b('t_vonal_ar')}   onChange={v => set('t_vonal_ar', v ? 1 : 0)} />
              <CbField label="Állateledel"      checked={b('t_allateledel')}onChange={v => set('t_allateledel', v ? 1 : 0)} />
              <CbField label="Labor"            checked={b('t_lab')}        onChange={v => set('t_lab', v ? 1 : 0)} />
              <CbField label="Vásárolt"         checked={b('t_vasarolt')}   onChange={v => set('t_vasarolt', v ? 1 : 0)} />
              <CbField label="Fagyasztós"       checked={b('t_fagyasztos')} onChange={v => set('t_fagyasztos', v ? 1 : 0)} />
            </div>
          </section>

          {/* ── Egyéb mezők ── */}
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Egyéb</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Hely PLU</Label>
                <Input value={f('t_hely_plu')} onChange={e => set('t_hely_plu', e.target.value)} />
              </div>
              <div>
                <Label>Partner PLU</Label>
                <Input value={f('t_partner_plu')} onChange={e => set('t_partner_plu', e.target.value)} />
              </div>
              <div>
                <Label>Bizerba layout</Label>
                <Input value={f('t_bizerba_layout')} onChange={e => set('t_bizerba_layout', e.target.value)} />
              </div>
              <div>
                <Label>Min. dolgozó</Label>
                <Input type="number" value={n('t_min_dolgozo')} onChange={e => set('t_min_dolgozo', +e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Darabóló kiad</Label>
                <Input value={f('t_darabolo_kiad')} onChange={e => set('t_darabolo_kiad', e.target.value)} placeholder="PLU lista vesszővel" />
              </div>
              <div className="col-span-3">
                <Label>Megjegyzés</Label>
                <textarea value={f('t_jegyzet')} onChange={e => set('t_jegyzet', e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </section>
        </div>
      </Modal>

      {/* ── Törlés megerősítő modal ── */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Termék törlése"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Mégse</Button>
            <Button variant="danger" onClick={() => selected && deleteMutation.mutate(selected.t_id)} loading={deleteMutation.isPending}>
              Törlés
            </Button>
          </>
        }
      >
        <p className="text-slate-700">Biztosan törli a <strong>{selected?.t_neve}</strong> terméket?</p>
        {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
      </Modal>
    </div>
  )
}
