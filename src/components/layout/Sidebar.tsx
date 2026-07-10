'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Factory } from 'lucide-react'
import { useState } from 'react'

interface MenuItem {
  label: string
  href?: string
  children?: MenuItem[]
}

// Pontosan a MainRibbonForm1 Tab/Group/Button struktúrája alapján
const menu: { tab: string; href: string; groups: { label: string; items: { label: string; href: string }[] }[] }[] = [
  {
    tab: 'Rendelések',
    href: '/rendelesek',
    groups: [
      {
        label: 'Rendelések',
        items: [
          { label: 'Új rendelés', href: '/rendelesek/uj' },
          { label: 'Rendelések', href: '/rendelesek' },
          { label: 'Rendelés másolás', href: '/rendelesek/masolas' },
        ],
      },
      {
        label: 'Számlázás',
        items: [
          { label: 'Számlázás', href: '/szamlazas' },
          { label: 'Számlák', href: '/szamlak' },
          { label: 'Szállítólevelek', href: '/szallitolevelek' },
          { label: 'Túra számlázás', href: '/tura-szamlazas' },
          { label: 'Számla okmányok', href: '/szamla-okmanyek' },
        ],
      },
      {
        label: 'Egyéb',
        items: [
          { label: 'Göngyöleg rögzítés', href: '/gongyoleg-rogzites' },
          { label: 'Túra rendszám', href: '/tura-rendszam' },
          { label: 'Termelés', href: '/termeles-rendeles' },
          { label: 'Fagyos készlet rögzítés', href: '/fagyos-keszlet' },
        ],
      },
    ],
  },
  {
    tab: 'Raktár',
    href: '/raktar',
    groups: [
      {
        label: 'Feldolgozás',
        items: [
          { label: 'Beszállítás', href: '/raktar/beszallitas' },
          { label: 'Kihozatal', href: '/raktar/kihozatal' },
        ],
      },
      {
        label: 'Készlet',
        items: [
          { label: 'Raktárkészlet', href: '/raktar/keszlet' },
          { label: 'Raktárkészlet összesítő', href: '/raktar/keszlet-osszes' },
          { label: 'Raktárkészlet szavidő', href: '/raktar/keszlet-szavido' },
          { label: 'Raktárkészlet átmeneti', href: '/raktar/keszlet-atmeneti' },
          { label: 'Napi nyitó készlet', href: '/raktar/napi-nyito' },
          { label: 'Raktáros ellenőrző', href: '/raktar/ellenorzo' },
        ],
      },
    ],
  },
  {
    tab: 'Feldolgozás',
    href: '/feldolgozas',
    groups: [
      {
        label: 'Rendelések',
        items: [
          { label: 'Rendelés csomagoló', href: '/feldolgozas/rendeles-csomagolo' },
          { label: 'Rendelések darabóló', href: '/feldolgozas/rendeles-darabolo' },
          { label: 'Rendelés napi összes', href: '/feldolgozas/rendeles-napi' },
        ],
      },
    ],
  },
  {
    tab: 'Darabóló',
    href: '/darabolo',
    groups: [
      {
        label: 'Rendelések',
        items: [
          { label: 'Rendelések', href: '/darabolo/rendelesek' },
          { label: 'Beosztások', href: '/darabolo/beosztasok' },
        ],
      },
    ],
  },
  {
    tab: 'Csomagoló',
    href: '/csomagolo',
    groups: [
      {
        label: 'Rendelések',
        items: [
          { label: 'Rendelések', href: '/csomagolo/rendelesek' },
          { label: 'Beosztások', href: '/csomagolo/beosztasok' },
        ],
      },
    ],
  },
  {
    tab: 'Üzem',
    href: '/uzem',
    groups: [
      {
        label: 'Üzem',
        items: [
          { label: 'Scannerek', href: '/uzem/scannerek' },
          { label: 'PLC Vezérlő', href: '/uzem/plc' },
          { label: 'Szalagok', href: '/uzem/szalagok' },
          { label: 'Scanner Log', href: '/uzem/scanner-log' },
          { label: 'Gépek/Állomások', href: '/uzem/gepek' },
          { label: 'Hőmérők', href: '/uzem/homerok' },
          { label: 'Mérlegek', href: '/uzem/merlegek' },
          { label: 'Csomagoló anyagok', href: '/uzem/csomagolanyag' },
          { label: 'QR kereső', href: '/uzem/qr' },
          { label: 'Szkenner PLU lista', href: '/uzem/plu' },
        ],
      },
    ],
  },
  {
    tab: 'Lekérdezések',
    href: '/lekerdezesek',
    groups: [
      {
        label: 'Túra',
        items: [
          { label: 'Túra lista', href: '/lekerdezesek/tura-lista' },
          { label: 'Túra rendelések', href: '/lekerdezesek/tura-rendelesek' },
          { label: 'Túra mennyiségek', href: '/lekerdezesek/tura-mennyisegek' },
          { label: 'Csirke átlaysúly', href: '/lekerdezesek/csirke-atlaysuly' },
        ],
      },
      {
        label: 'Pénzügyi',
        items: [
          { label: 'Forgalom', href: '/lekerdezesek/forgalom' },
          { label: 'Könyvelés export', href: '/lekerdezesek/konyv-export' },
          { label: 'EU adószám lista', href: '/lekerdezesek/eu-adoszam' },
          { label: 'Göngyöleg', href: '/lekerdezesek/gongyoleg' },
          { label: 'Pénzügyi karton', href: '/lekerdezesek/penzugyi-karton' },
          { label: 'Export igazolás', href: '/lekerdezesek/export-igazolas' },
          { label: 'Hatékonysági', href: '/lekerdezesek/hatekonysag' },
          { label: 'Forgalom Stat', href: '/lekerdezesek/forgalom-stat' },
          { label: 'Számlák LOT', href: '/lekerdezesek/szamlak-lot' },
          { label: 'Fagyos átlag', href: '/lekerdezesek/fagyos-atlag' },
          { label: 'Fagyos készlet', href: '/lekerdezesek/fagyos-keszlet' },
          { label: 'Százalékos vevők', href: '/lekerdezesek/vevo-szazalek' },
          { label: 'Kintlévőség', href: '/lekerdezesek/kintlevoseg' },
          { label: 'Kintlévőség tételes', href: '/lekerdezesek/kintlevoseg-teteles' },
        ],
      },
    ],
  },
  {
    tab: 'Alapadatok',
    href: '/alapadatok',
    groups: [
      {
        label: 'Törzsadatok',
        items: [
          { label: 'Termékek', href: '/alapadatok/termekek' },
          { label: 'Partnerek', href: '/alapadatok/partnerek' },
          { label: 'Partner termékek', href: '/alapadatok/partner-termekek' },
          { label: 'Túrák', href: '/alapadatok/turak' },
          { label: 'Raktárak', href: '/alapadatok/raktarak' },
          { label: 'Súly sablon', href: '/alapadatok/suly-sablon' },
          { label: 'Termék alap', href: '/alapadatok/termek-alap' },
          { label: 'Csomagolás', href: '/alapadatok/csomagolas' },
          { label: 'Dolgozók', href: '/alapadatok/dolgozok' },
          { label: 'Csapatok', href: '/alapadatok/csapatok' },
          { label: 'Normák', href: '/alapadatok/normak' },
          { label: 'Árfolyam', href: '/alapadatok/arfolyam' },
          { label: 'ÁFA kódok', href: '/alapadatok/afa' },
          { label: 'Számla előtag', href: '/alapadatok/szamla-elotag' },
          { label: 'Jogosultságok', href: '/alapadatok/jogosultsagok' },
          { label: 'CMR sablon', href: '/alapadatok/cmr-sablon' },
        ],
      },
    ],
  },
  {
    tab: 'Árak',
    href: '/arak',
    groups: [
      {
        label: 'Árképzés',
        items: [
          { label: 'Partner csoport', href: '/arak/partner-csoport' },
          { label: 'Árak', href: '/arak/arak' },
          { label: 'Akciók', href: '/arak/akciok' },
          { label: 'Árazás', href: '/arak/arazas' },
          { label: 'Sales partnerforgalom', href: '/arak/sales' },
        ],
      },
    ],
  },
  {
    tab: 'Statisztikák',
    href: '/statisztikak',
    groups: [
      {
        label: 'Statisztikák',
        items: [
          { label: 'Élő csirke', href: '/statisztikak/elo-csirke' },
          { label: 'Napi B oszt.', href: '/statisztikak/napi-b' },
          { label: 'ASIR értékesítés', href: '/statisztikak/asir' },
          { label: 'Termékedíj külföld', href: '/statisztikak/termekdij-kulfoldi' },
          { label: 'Termékedíj belföld', href: '/statisztikak/termekdij-belfold' },
          { label: 'Csirke papír', href: '/statisztikak/csirke-papir' },
          { label: 'Túra vevők száma', href: '/statisztikak/tura-vevok' },
          { label: 'KSH statisztika', href: '/statisztikak/ksh' },
          { label: 'Állategészség stat.', href: '/statisztikak/allategeszseg' },
          { label: 'Rendelés statisztika', href: '/statisztikak/rendeles-stat' },
          { label: 'Rendelt mennyiségek', href: '/statisztikak/rendelt-mennyisegek' },
          { label: 'Webes regisztráció', href: '/statisztikak/webes-regisztracio' },
        ],
      },
    ],
  },
  {
    tab: 'Minőségbiztosítás',
    href: '/minoseg',
    groups: [
      {
        label: 'Minőség',
        items: [
          { label: 'Csomagolóba átadott LOT', href: '/minoseg/lot-atadas' },
          { label: 'Kiszállított termékek', href: '/minoseg/kiszallitott' },
          { label: 'Számlák LOT', href: '/minoseg/szamlak-lot' },
          { label: 'Reklamációk', href: '/minoseg/reklamaciok' },
        ],
      },
    ],
  },
]

interface NavTabProps {
  tab: typeof menu[0]
  isActive: boolean
  isOpen: boolean
  onToggle: () => void
  collapsed: boolean
}

function NavTab({ tab, isActive, isOpen, onToggle, collapsed }: NavTabProps) {
  const pathname = usePathname()

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left',
          isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
        )}
        title={collapsed ? tab.tab : undefined}
      >
        <span className={cn(
          'flex-shrink-0 w-1.5 h-1.5 rounded-full',
          isActive ? 'bg-white' : 'bg-slate-500'
        )} />
        {!collapsed && (
          <>
            <span className="flex-1 font-medium">{tab.tab}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform flex-shrink-0', isOpen ? 'rotate-180' : '')} />
          </>
        )}
      </button>

      {/* Almenük */}
      {isOpen && !collapsed && (
        <div className="bg-slate-950/40">
          {tab.groups.map(group => (
            <div key={group.label}>
              <p className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.label}
              </p>
              {group.items.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center pl-7 pr-3 py-1.5 text-xs transition-colors',
                      active
                        ? 'text-blue-400 bg-blue-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openTab, setOpenTab] = useState<string | null>(() => {
    // Alapból nyissa ki az aktív tabot
    for (const tab of menu) {
      if (pathname.startsWith(tab.href)) return tab.tab
    }
    return null
  })

  return (
    <aside className={cn(
      'flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 overflow-hidden flex-shrink-0',
      collapsed ? 'w-12' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-slate-700">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Factory className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-none">Varga Szárnyas</p>
            <p className="text-slate-400 text-xs mt-0.5">Termelésirányítás</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
        >
          <ChevronRight className={cn('w-4 h-4 transition-transform', collapsed ? '' : 'rotate-180')} />
        </button>
      </div>

      {/* Dashboard link */}
      <div className="px-2 py-2 border-b border-slate-800">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/dashboard'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {!collapsed && <span className="font-medium">Dashboard</span>}
        </Link>
      </div>

      {/* Főmenü — tab-onként */}
      <nav className="flex-1 overflow-y-auto py-1">
        {menu.map(tab => (
          <NavTab
            key={tab.tab}
            tab={tab}
            isActive={pathname.startsWith(tab.href) && tab.href !== '/'}
            isOpen={openTab === tab.tab}
            onToggle={() => setOpenTab(openTab === tab.tab ? null : tab.tab)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Verzió */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">v1.0.0-web</p>
        </div>
      )}
    </aside>
  )
}
