'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader, Badge, Button } from '@/components/ui'

// ── Dátum helpers ──────────────────────────────────────────────────────────
function toInputVal(vszDate: string) {
  // "2024.01.15." -> "2024-01-15"
  return vszDate.replace(/\./g, '-').replace(/-$/, '')
}
function toVszDate(inputVal: string) {
  // "2024-01-15" -> "2024.01.15."
  return inputVal.replace(/-/g, '.') + '.'
}
function today() {
  return new Date().toISOString().slice(0, 10)
}
function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ── Oszlop definíciók — pontosan a C# Columns[].Caption alapján ───────────

// Tab 1: Fő rendelések lista
const cols1: ColumnDef<Record<string, unknown>>[] = [
  { accessorKey: 'rend_sorszam',     header: 'Sorszám' },
  { accessorKey: 'dijbekero',        header: 'Díjbekérő' },
  { accessorKey: 'rend_helyesbitett',header: 'Helyesbített' },
  { accessorKey: 'rend_szeloleg',    header: 'Előleg számla' },
  { accessorKey: 'rend_szszam',      header: 'Számlaszám' },
  { accessorKey: 'szallitas_datum',  header: 'Szállítás' },
  { accessorKey: 'kirakva',          header: 'Kirakva' },
  { accessorKey: 'rend_raktar_tol',  header: 'Raktár(tól)' },
  { accessorKey: 'rend_raktar_ig',   header: 'Raktár(ig)' },
  { accessorKey: 'rend_csom_tol',    header: 'Csom.(tól)' },
  { accessorKey: 'rend_csom_ig',     header: 'Csom.(ig)' },
  { accessorKey: 'rend_auto',        header: 'Rendszám' },
  { accessorKey: 'cmr',              header: 'CMR rendszám' },
  { accessorKey: 'cmrinfo',          header: 'CMR info' },
  { accessorKey: 'p_kod',            header: 'Partner kód' },
  { accessorKey: 'p_nev',            header: 'Partner' },
  { accessorKey: 'hernad',           header: 'Bilk' },
  { accessorKey: 'rend_aktiv',       header: 'Aktív',
    cell: ({ getValue }) => {
      const v = getValue() as string
      return <Badge color={v === 'Igen' ? 'green' : 'slate'}>{v}</Badge>
    }
  },
  { accessorKey: 'rend_tipp',        header: 'Tipp',
    cell: ({ getValue }) => getValue() === 'Igen' ? <Badge color="blue">Igen</Badge> : <span className="text-slate-400">Nem</span>
  },
  { accessorKey: 'rend_confirm',     header: 'Jóváhagyta',
    cell: ({ getValue }) => getValue() === 'Igen' ? <Badge color="green">Igen</Badge> : <span className="text-slate-400">Nem</span>
  },
  { accessorKey: 'masolt',           header: 'Típus' },
  { accessorKey: 'jegyzetvan',       header: 'WEB jegyzet',
    cell: ({ getValue }) => getValue() ? <Badge color="orange">IGEN</Badge> : null
  },
  { accessorKey: 't_nev',            header: 'Túra' },
  { accessorKey: 'rend_brutto',      header: 'Bruttó' },
  { accessorKey: 'dev_rovid',        header: 'Deviza' },
  { accessorKey: 'hstatusz',         header: 'Hívás státusz',
    cell: ({ getValue }) => getValue() === 'OK' ? <Badge color="green">OK</Badge> : null
  },
  { accessorKey: 'rend_hivas_ido',   header: 'Hívás ideje' },
  { accessorKey: 'fagylot',          header: 'Fagy.LOT',
    cell: ({ getValue }) => getValue() ? <Badge color="blue">FAGY</Badge> : null
  },
]

// Tab 2: Darabóló nézet
const cols2: ColumnDef<Record<string, unknown>>[] = [
  { accessorKey: 'szallitas_datum', header: 'Szállítás' },
  { accessorKey: 't_nev',           header: 'Túra' },
  { accessorKey: 'p_nev',           header: 'Partner' },
  { accessorKey: 'megnevezes',      header: 'Megnevezés' },
  { accessorKey: 't_plu',           header: 'PLU' },
  { accessorKey: 't_neve',          header: 'Termék' },
  { accessorKey: 'suly',            header: 'Súly' },
  { accessorKey: 'egysegar',        header: 'Egységár' },
  { accessorKey: 'tip',             header: 'Tipp' },
]

// Tab 3: LOT lista
const cols3: ColumnDef<Record<string, unknown>>[] = [
  { accessorKey: 'rend_id',         header: 'Rend. ID' },
  { accessorKey: 'szallitas_datum', header: 'Szállítás' },
  { accessorKey: 'rend_sorszam',    header: 'Sorszám' },
  { accessorKey: 'p_nev',           header: 'Partner' },
  { accessorKey: 'LOT',             header: 'LOT' },
]

// Tab 4: Raktár lista
const cols4: ColumnDef<Record<string, unknown>>[] = [
  { accessorKey: 'szallitas_datum', header: 'Szállítás' },
  { accessorKey: 'rend_sorszam',    header: 'Sorszám' },
  { accessorKey: 't_nev',           header: 'Túra' },
  { accessorKey: 'ertejovos',       header: 'Érte jövős' },
  { accessorKey: 'p_nev',           header: 'Partner' },
  { accessorKey: 'megnevezes',      header: 'Megnevezés' },
  { accessorKey: 't_plu',           header: 'PLU' },
  { accessorKey: 't_neve',          header: 'Termék' },
  { accessorKey: 'csmo_nev',        header: 'Csomagolás' },
  { accessorKey: 'suly',            header: 'Súly' },
  { accessorKey: 'rk',              header: 'Rekesz' },
  { accessorKey: 'keszitos',        header: 'Készítős' },
  { accessorKey: 'egysegar',        header: 'Egységár' },
  { accessorKey: 'ertek',           header: 'Érték' },
  { accessorKey: 'tip',             header: 'Tipp' },
  { accessorKey: 'rend_raktar_tol', header: 'Raktár(tól)' },
  { accessorKey: 'rend_raktar_ig',  header: 'Raktár(ig)' },
  { accessorKey: 'rend_csom_tol',   header: 'Csom.(tól)' },
  { accessorKey: 'rend_csom_ig',    header: 'Csom.(ig)' },
  { accessorKey: 'fizmod',          header: 'Fizetési mód' },
  { accessorKey: 'p_szallitasi_cim',header: 'Szállítási cím' },
]

const TABS = [
  { id: '1', label: 'Rendelések',   cols: cols1 },
  { id: '2', label: 'Darabóló',     cols: cols2 },
  { id: '3', label: 'LOT lista',    cols: cols3 },
  { id: '4', label: 'Raktár lista', cols: cols4 },
]

// ── Főkomponens ────────────────────────────────────────────────────────────
export default function RendelesekPage() {
  const [p1, setP1] = useState(today())          // szallitas_datum tól
  const [p2, setP2] = useState(tomorrow())        // szallitas_datum ig
  const [activeTab, setActiveTab] = useState('1')
  const [searchText, setSearchText] = useState('')

  const vszP1 = toVszDate(p1)
  const vszP2 = toVszDate(p2)

  const { data, isLoading, refetch } = useQuery<{ data: Record<string, unknown>[]; count: number }>({
    queryKey: ['rendelesek', activeTab, vszP1, vszP2],
    queryFn: () =>
      fetch(`/api/rendelesek?tab=${activeTab}&p1=${encodeURIComponent(vszP1)}&p2=${encodeURIComponent(vszP2)}`)
        .then(r => r.json()),
  })

  // Kliens oldali szűrés a keresőmezőre (partner neve, sorszám stb.)
  const filteredData = useMemo(() => {
    if (!searchText || !data?.data) return data?.data ?? []
    const q = searchText.toLowerCase()
    return data.data.filter(row =>
      Object.values(row).some(v => v != null && String(v).toLowerCase().includes(q))
    )
  }, [data, searchText])

  const currentTab = TABS.find(t => t.id === activeTab)!

  function handleExcel() {
    window.open(
      `/api/export/excel/rendelesek?tab=${activeTab}&p1=${encodeURIComponent(vszP1)}&p2=${encodeURIComponent(vszP2)}`,
      '_blank'
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Rendelések"
        subtitle={`${data?.count ?? 0} sor · ${vszP1} – ${vszP2}`}
      />

      {/* ── Szűrő sáv ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3 flex flex-wrap items-end gap-3 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Szállítás dátumtól
          </label>
          <input
            type="date"
            value={p1}
            onChange={e => setP1(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Szállítás dátumig
          </label>
          <input
            type="date"
            value={p2}
            onChange={e => setP2(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Lekérdezés
        </Button>
        <div className="flex-1 min-w-0 max-w-xs">
          <label className="block text-xs font-medium text-slate-500 mb-1">Keresés</label>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Partner, sorszám..."
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleExcel}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel
        </Button>
      </div>

      {/* ── Tabok — a C# form 4 gridjének megfelelően ── */}
      <div className="flex gap-1 mb-0 px-0.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-white border-slate-200 text-blue-600'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && data?.count != null && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {filteredData.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Adattábla ── */}
      <DataTable
        key={activeTab}
        data={filteredData}
        columns={currentTab.cols as ColumnDef<Record<string, unknown>>[]}
        loading={isLoading}
        searchable={false}
        fillHeight
        className="flex-1 min-h-0 rounded-t-none"
        emptyMessage={
          isLoading ? 'Betöltés...' : 'Nincsenek rendelések a megadott időszakban.'
        }
      />
    </div>
  )
}
