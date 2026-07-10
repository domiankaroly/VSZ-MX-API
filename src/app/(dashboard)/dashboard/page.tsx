'use client'

import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff } from 'lucide-react'
import { PageHeader } from '@/components/ui'

interface DashboardData {
  mai_web_rendeles: string
  mai_belso_rendeles: string
  eur_arfolyam: string
  web_partner: string
  konyv_import: string
  db_online: boolean
  scanner_statuszok: { id: string; nev: string; online: boolean }[]
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

const SCANNERS = ['SC-01','SC-02','SC-03','SC-04','SC-05','SC-06','SC-07','SC-08','SC-09','SC-10']

const QUICK_LINKS = [
  { href: '/rendelesek/uj', label: 'Uj rendeles', emoji: '\u{1F4DD}' },
  { href: '/rendelesek', label: 'Rendelesek', emoji: '\u{1F4E6}' },
  { href: '/szamlazas', label: 'Szamlazas', emoji: '\u{1F9FE}' },
  { href: '/raktar/keszlet', label: 'Raktarkeszlet', emoji: '\u{1F3ED}' },
  { href: '/alapadatok/partnerek', label: 'Partnerek', emoji: '\u{1F465}' },
  { href: '/alapadatok/termekek', label: 'Termekek', emoji: '\u{1F969}' },
  { href: '/lekerdezesek/forgalom', label: 'Forgalom', emoji: '\u{1F4CA}' },
  { href: '/lekerdezesek/tura-lista', label: 'Tura lista', emoji: '\u{1F69B}' },
  { href: '/uzem/scannerek', label: 'Scannerek', emoji: '\u{1F4E1}' },
  { href: '/statisztikak/rendeles-stat', label: 'Stat.', emoji: '\u{1F4C8}' },
]

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    refetchInterval: 30_000,
  })

  const v = (val?: string) => isLoading ? '...' : (val ?? '\u2014')

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Napi attekintes" />

      <div className={`inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl text-sm font-medium border ${
        data?.db_online
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}>
        {data?.db_online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {isLoading ? 'Csatlakozas...' : data?.db_online ? 'Adatbazis: kapcsolodva' : 'Demo mod - nincs DB kapcsolat'}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBox label="WEB rendelesek (ma)" value={v(data?.mai_web_rendeles)} sub="web_rendeles=1, rend_aktiv=1" />
        <StatBox label="Belso rendelesek (ma)" value={v(data?.mai_belso_rendeles)} sub="web_rendeles=0, rend_aktiv=1" />
        <StatBox label="EUR arfolyam" value={v(data?.eur_arfolyam)} sub="arfolyam tabla, utolso" />
        <StatBox label="WEB / Partner" value={v(data?.web_partner)} sub="web_user / partner_sz" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Konyv.import</p>
          <p className="text-lg font-semibold text-slate-800">{v(data?.konyv_import)}</p>
          <p className="text-xs text-slate-400 mt-1">beallitas WHERE be_id=36</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <p className="text-sm text-slate-500 mb-3">Scanner statuszok (MQTT)</p>
          <div className="flex flex-wrap gap-2">
            {SCANNERS.map(sc => (
              <div key={sc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {sc}
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Gyors eleres</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUICK_LINKS.map(item => (
          <a key={item.href} href={item.href}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-xs font-medium text-slate-600 text-center">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
