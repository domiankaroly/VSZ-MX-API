'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, Button, Label, Input, Badge } from '@/components/ui'
import { Plus, Trash2, RefreshCw } from 'lucide-react'

// ── Típusok ─────────────────────────────────────────────────────────────────
type Termek = Record<string, unknown>
type DropdownItem = { value: string | number; label: string }

// ── Fő termék lista oszlopok (partnerC1TrueDBGrid caption-jei alapján) ─────
const termekCols: ColumnDef<Termek>[] = [
  { accessorKey: 't_plu',        header: 'PLU',         size: 70 },
  { accessorKey: 't_neve',       header: 'Termék neve' },
  { accessorKey: 'tm_nev',       header: 'Mód' },
  { accessorKey: 'ta_nev',       header: 'Állat' },
  { accessorKey: 'megnevezes',   header: 'Alap' },
  { accessorKey: 'csgo_nev',     header: 'Go' },
  { accessorKey: 'csmo_nev',     header: 'Mo' },
  { accessorKey: 'csom_megnevezes', header: 'Csomagolás' },
  { accessorKey: 't_halal',      header: 'Halal',
    cell: ({ getValue }) => getValue() ? <Badge color="green">✓</Badge> : null },
  { accessorKey: 't_aktiv',      header: 'Aktív',
    cell: ({ getValue }) => (
      <Badge color={Number(getValue()) === 1 ? 'green' : 'slate'}>
        {Number(getValue()) === 1 ? 'Igen' : 'Nem'}
      </Badge>
    )},
  { accessorKey: 't_fagyasztos', header: 'Fagy.',
    cell: ({ getValue }) => getValue() ? <Badge color="blue">FAGY</Badge> : null },
  { accessorKey: 't_szorta',     header: 'Szorta',
    cell: ({ getValue }) => getValue() ? <Badge color="orange">✓</Badge> : null },
  { accessorKey: 't_egysegar',   header: 'Egységár' },
  { accessorKey: 't_vonalkod',   header: 'Vonalkód' },
  { accessorKey: 't_kod',        header: 'Kód' },
  { accessorKey: 't_cikkszam',   header: 'Cikkszám' },
]

// ── Dropdown hook ────────────────────────────────────────────────────────────
function useDropdown(tipus: string) {
  return useQuery<DropdownItem[]>({
    queryKey: ['aru-adat-dd', tipus],
    queryFn: async () => {
      const r = await fetch('/api/aru-adat?tipus=' + tipus)
      const rows = await r.json() as Record<string, unknown>[]
      // Minden dropdown más kulcsokkal jön - generikusan kezeljük
      const kvMap: Record<string, [string, string]> = {
        csomagolas:  ['csom_id', 'csom_megnevezes'],
        allat:       ['ta_id', 'ta_nev'],
        gepek:       ['g_id', 'g_name'],
        termek_alap: ['id', 'megnevezes'],
        termek_mod:  ['tm_id', 'tm_nev'],
        afa:         ['af_id', 'megnevezes'],
      }
      const [vk, lk] = kvMap[tipus] ?? ['id', 'nev']
      return rows.map(r => ({ value: r[vk] as string | number, label: String(r[lk] ?? '') }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Szerkesztő panel tabjai ──────────────────────────────────────────────────
type FormTab = 'alap' | 'szamlazas' | 'keszlet' | 'egyeb'

// ── Fő komponens ─────────────────────────────────────────────────────────────
export default function AruAdatPage() {
  const qc = useQueryClient()
  const [aktivFilter, setAktivFilter] = useState<'1' | '0' | 'all'>('1')
  const [selected, setSelected] = useState<Termek | null>(null)
  const [formTab, setFormTab] = useState<FormTab>('alap')
  const [ujModal, setUjModal] = useState(false)
  const [torlesConfirm, setTorlesConfirm] = useState(false)

  // Dropdownok
  const { data: csomagolasDD } = useDropdown('csomagolas')
  const { data: allatDD }      = useDropdown('allat')
  const { data: gepekDD }      = useDropdown('gepek')
  const { data: alapDD }       = useDropdown('termek_alap')
  const { data: modDD }        = useDropdown('termek_mod')
  const { data: afaDD }        = useDropdown('afa')

  // Fő lista
  const { data: listaData, isLoading, refetch } = useQuery<{ data: Termek[]; count: number }>({
    queryKey: ['aru-adat-lista', aktivFilter],
    queryFn: () => fetch(`/api/aru-adat?tipus=lista&aktiv=${aktivFilter}`).then(r => r.json()),
  })

  // Partner árak (kiválasztott termékhez)
  const { data: partnerArak } = useQuery<Termek[]>({
    queryKey: ['aru-adat-partner', selected?.t_id],
    queryFn: () => fetch(`/api/aru-adat?tipus=partner_arak&id=${selected?.t_id}`).then(r => r.json()),
    enabled: !!selected?.t_id,
  })

  // Cimke jóváhagyások
  const { data: cimkeJov } = useQuery<Termek[]>({
    queryKey: ['aru-adat-cimke', selected?.t_id],
    queryFn: () => fetch(`/api/aru-adat?tipus=cimke_jovahagyas&id=${selected?.t_id}`).then(r => r.json()),
    enabled: !!selected?.t_id,
  })

  // Form
  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<Record<string, unknown>>()

  // Ha más sort választunk, betöltjük a form mezőket (PartnerC1TrueDBGrid_RowColChange)
  useEffect(() => {
    if (selected) {
      reset(selected)
      setFormTab('alap')
    }
  }, [selected, reset])

  // Mentés (UPDATE)
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/aru-adat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, t_id: selected?.t_id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Mentési hiba')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aru-adat-lista'] })
      refetch()
    },
  })

  // Új termék (INSERT)
  const ujMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/aru-adat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Mentési hiba')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aru-adat-lista'] })
      setUjModal(false)
    },
  })

  // Törlés
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/aru-adat?id=${selected?.t_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Törlési hiba')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aru-adat-lista'] })
      setSelected(null)
      setTorlesConfirm(false)
    },
  })

  const ddSelect = (opts?: DropdownItem[]) =>
    (opts ?? []).map(o => <option key={o.value} value={String(o.value)}>{o.label}</option>)

  const cbField = (name: string, label: string) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" className="w-4 h-4 accent-blue-600"
        {...register(name, { setValueAs: v => v ? 1 : 0 })} />
      {label}
    </label>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Termékek karbantartása"
        subtitle={`${listaData?.count ?? 0} termék`}
        actions={
          <div className="flex gap-2">
            <select
              value={aktivFilter}
              onChange={e => setAktivFilter(e.target.value as '1' | '0' | 'all')}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
            >
              <option value="1">Aktív termékek</option>
              <option value="0">Inaktív termékek</option>
              <option value="all">Összes</option>
            </select>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" onClick={() => { reset({}); setUjModal(true) }}>
              <Plus className="w-3.5 h-3.5" /> Új termék
            </Button>
          </div>
        }
      />

      {/* ── Fő layout: bal = lista, jobb = szerkesztő ── */}
      <div className="flex flex-1 min-h-0 gap-4">

        {/* Bal: termék lista */}
        <div className="flex flex-col w-[55%] min-h-0">
          <DataTable
            data={listaData?.data ?? []}
            columns={termekCols}
            loading={isLoading}
            fillHeight
            searchable
            onRowClick={row => setSelected(row)}
            emptyMessage="Nincs termék."
          />
        </div>

        {/* Jobb: szerkesztő panel */}
        <div className="flex flex-col w-[45%] min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Válassz ki egy terméket a listából
            </div>
          ) : (
            <>
              {/* Fejléc */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div>
                  <span className="font-semibold text-slate-800">{String(selected.t_neve ?? '')}</span>
                  <span className="ml-2 text-xs text-slate-400">PLU: {String(selected.t_plu ?? '')}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger"
                    onClick={() => setTorlesConfirm(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm"
                    loading={saveMutation.isPending}
                    disabled={!isDirty}
                    onClick={handleSubmit(d => saveMutation.mutate(d))}>
                    Mentés
                  </Button>
                </div>
              </div>

              {/* Tabok */}
              <div className="flex border-b border-slate-100 flex-shrink-0">
                {(['alap', 'szamlazas', 'keszlet', 'egyeb'] as FormTab[]).map(t => (
                  <button key={t}
                    onClick={() => setFormTab(t)}
                    className={`px-4 py-2 text-xs font-medium transition-colors ${
                      formTab === t
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {{ alap: 'Alap adatok', szamlazas: 'Számlázás', keszlet: 'Készlet', egyeb: 'Egyéb / Partner' }[t]}
                  </button>
                ))}
              </div>

              {/* Tab tartalom */}
              <div className="flex-1 overflow-auto p-4 text-sm">

                {/* ── Tab: Alap adatok ── */}
                {formTab === 'alap' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="t_neve" required>Termék neve</Label>
                      <Input id="t_neve" {...register('t_neve', { required: 'Kötelező' })}
                        error={errors.t_neve?.message as string} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_plu">PLU</Label>
                        <Input id="t_plu" {...register('t_plu')} />
                      </div>
                      <div>
                        <Label htmlFor="t_vonalkod">Vonalkód</Label>
                        <Input id="t_vonalkod" {...register('t_vonalkod')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_allat">Állat fajta</Label>
                        <select id="t_allat" {...register('t_allat')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {ddSelect(allatDD)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="t_mod">Módosítás</Label>
                        <select id="t_mod" {...register('t_mod')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {ddSelect(modDD)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_alap">Alap</Label>
                        <select id="t_alap" {...register('t_alap')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {ddSelect(alapDD)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="csom_id">Csomagolás</Label>
                        <select id="csom_id" {...register('csom_id')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {ddSelect(csomagolasDD)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="af_id">ÁFA</Label>
                        <select id="af_id" {...register('af_id')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {ddSelect(afaDD)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="t_egysegar">Egységár</Label>
                        <Input id="t_egysegar" type="number" step="0.01" {...register('t_egysegar')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_gep_id">Gép</Label>
                        <select id="t_gep_id" {...register('t_gep_id')}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">—</option>
                          {ddSelect(gepekDD)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="t_szavido">Szavatosság (nap)</Label>
                        <Input id="t_szavido" type="number" {...register('t_szavido')} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="t_jegyzet">Megjegyzés</Label>
                      <textarea id="t_jegyzet" rows={2}
                        {...register('t_jegyzet')}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-1">
                      {cbField('t_aktiv',      'Aktív')}
                      {cbField('t_halal',      'Halal')}
                      {cbField('t_fagyasztos', 'Fagyasztós')}
                      {cbField('t_szorta',     'Szorta')}
                      {cbField('t_sajat',      'Saját')}
                      {cbField('t_vasarolt',   'Vásárolt')}
                      {cbField('t_allateledel','Állateledel')}
                      {cbField('t_lab',        'Labor')}
                      {cbField('t_feldolg',    'Feldolgozós')}
                      {cbField('t_rendelesre', 'Rendelésre')}
                      {cbField('t_meresre',    'Mérésre')}
                    </div>
                  </div>
                )}

                {/* ── Tab: Számlázás ── */}
                {formTab === 'szamlazas' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="t_szamla_hu">Számla megnevezés (HU)</Label>
                      <Input id="t_szamla_hu" {...register('t_szamla_hu')} />
                    </div>
                    <div>
                      <Label htmlFor="t_szamla_en">Számla megnevezés (EN)</Label>
                      <Input id="t_szamla_en" {...register('t_szamla_en')} />
                    </div>
                    <div>
                      <Label htmlFor="t_szamla_de">Számla megnevezés (DE)</Label>
                      <Input id="t_szamla_de" {...register('t_szamla_de')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_hely_plu">Hely PLU</Label>
                        <Input id="t_hely_plu" {...register('t_hely_plu')} />
                      </div>
                      <div>
                        <Label htmlFor="t_partner_plu">Partner PLU</Label>
                        <Input id="t_partner_plu" {...register('t_partner_plu')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_bizerba_plu">Bizerba PLU</Label>
                        <Input id="t_bizerba_plu" {...register('t_bizerba_plu')} />
                      </div>
                      <div>
                        <Label htmlFor="t_arazasi_ref">Árazási ref</Label>
                        <Input id="t_arazasi_ref" {...register('t_arazasi_ref')} />
                      </div>
                    </div>
                    {/* Cimke jóváhagyások (c1TrueDBGrid2) */}
                    {cimkeJov && cimkeJov.length > 0 && (
                      <div>
                        <Label>Cimke jóváhagyások</Label>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-1.5 text-left text-slate-500">Felhasználó</th>
                                <th className="px-3 py-1.5 text-left text-slate-500">Időpont</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cimkeJov.map((r, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="px-3 py-1.5">{String(r.f_neve ?? '')}</td>
                                  <td className="px-3 py-1.5">{String(r.tc_datum ?? '')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab: Készlet ── */}
                {formTab === 'keszlet' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_kod">Kód</Label>
                        <Input id="t_kod" {...register('t_kod')} />
                      </div>
                      <div>
                        <Label htmlFor="t_hbsys_kod">HBSYS kód</Label>
                        <Input id="t_hbsys_kod" {...register('t_hbsys_kod')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_norma">Norma</Label>
                        <Input id="t_norma" type="number" step="0.01" {...register('t_norma')} />
                      </div>
                      <div>
                        <Label htmlFor="t_alap_norma">Alap norma</Label>
                        <Input id="t_alap_norma" type="number" step="0.01" {...register('t_alap_norma')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_szorta_tol">Szorta tól</Label>
                        <Input id="t_szorta_tol" type="number" step="0.01" {...register('t_szorta_tol')} />
                      </div>
                      <div>
                        <Label htmlFor="t_szorta_ig">Szorta ig</Label>
                        <Input id="t_szorta_ig" type="number" step="0.01" {...register('t_szorta_ig')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="t_min_dolgozo">Min. dolgozó</Label>
                        <Input id="t_min_dolgozo" type="number" {...register('t_min_dolgozo')} />
                      </div>
                      <div>
                        <Label htmlFor="t_igeny_szorzo">Igény szorzó</Label>
                        <Input id="t_igeny_szorzo" type="number" step="0.01" {...register('t_igeny_szorzo')} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="t_darabolo_kiad">Darabóló kiadás</Label>
                      <Input id="t_darabolo_kiad" {...register('t_darabolo_kiad')} />
                    </div>
                    {cbField('t_raktell', 'Raktár ellátás')}
                  </div>
                )}

                {/* ── Tab: Egyéb / Partner árak ── */}
                {formTab === 'egyeb' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Partner árak
                    </p>
                    {!partnerArak || partnerArak.length === 0 ? (
                      <p className="text-slate-400 text-xs">Nincs partner ár ehhez a termékhez.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-slate-500">Partner</th>
                              <th className="px-3 py-1.5 text-left text-slate-500">Ár</th>
                              <th className="px-3 py-1.5 text-left text-slate-500">Deviza</th>
                              <th className="px-3 py-1.5 text-left text-slate-500">Szállítási cím</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partnerArak.map((r, i) => (
                              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-3 py-1.5">{String(r.p_nev ?? '')}</td>
                                <td className="px-3 py-1.5">{String(r.pt_ar ?? '')}</td>
                                <td className="px-3 py-1.5">{String(r.dev_rovid ?? '')}</td>
                                <td className="px-3 py-1.5 text-slate-400">{String(r.p_szallitasi_cim ?? '')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Mentési hiba */}
                {saveMutation.isError && (
                  <p className="mt-2 text-xs text-red-600">
                    {(saveMutation.error as Error)?.message ?? 'Hiba történt'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Törlés megerősítés ── */}
      <Modal open={torlesConfirm} onClose={() => setTorlesConfirm(false)}
        title="Termék törlése"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTorlesConfirm(false)}>Mégse</Button>
            <Button variant="danger" loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}>
              Törlés
            </Button>
          </>
        }>
        <p className="text-sm text-slate-700">
          Biztosan törli a következő terméket?
        </p>
        <p className="font-semibold mt-1">{String(selected?.t_neve ?? '')}</p>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(deleteMutation.error as Error)?.message}
          </p>
        )}
      </Modal>

      {/* ── Új termék modal ── */}
      <Modal open={ujModal} onClose={() => setUjModal(false)}
        title="Új termék rögzítése" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUjModal(false)}>Mégse</Button>
            <Button loading={ujMutation.isPending}
              onClick={handleSubmit(d => ujMutation.mutate(d))}>
              Rögzítés
            </Button>
          </>
        }>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="uj_neve" required>Termék neve</Label>
            <Input id="uj_neve" {...register('t_neve', { required: 'Kötelező' })}
              error={errors.t_neve?.message as string} />
          </div>
          <div>
            <Label htmlFor="uj_allat">Állat fajta</Label>
            <select id="uj_allat" {...register('t_allat')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              {ddSelect(allatDD)}
            </select>
          </div>
          <div>
            <Label htmlFor="uj_mod">Módosítás típus</Label>
            <select id="uj_mod" {...register('t_mod')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              {ddSelect(modDD)}
            </select>
          </div>
          <div>
            <Label htmlFor="uj_alap">Alap</Label>
            <select id="uj_alap" {...register('t_alap')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              {ddSelect(alapDD)}
            </select>
          </div>
          <div>
            <Label htmlFor="uj_csom">Csomagolás</Label>
            <select id="uj_csom" {...register('csom_id')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              {ddSelect(csomagolasDD)}
            </select>
          </div>
          <div>
            <Label htmlFor="uj_afa">ÁFA</Label>
            <select id="uj_afa" {...register('af_id')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              {ddSelect(afaDD)}
            </select>
          </div>
          <div>
            <Label htmlFor="uj_egysegar">Egységár</Label>
            <Input id="uj_egysegar" type="number" step="0.01" {...register('t_egysegar')} />
          </div>
        </div>
        {ujMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {(ujMutation.error as Error)?.message}
          </p>
        )}
      </Modal>
    </div>
  )
}
