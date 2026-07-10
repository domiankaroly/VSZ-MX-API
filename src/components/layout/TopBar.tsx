'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'

interface TopBarProps {
  user: { name?: string | null }
}

export function TopBar({ user }: TopBarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleDateString('hu-HU') + ' ' + now.toLocaleTimeString('hu-HU'))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shadow-sm flex-shrink-0">
      {/* Bal oldal - dátum/idő */}
      <div className="text-sm text-slate-500 font-mono">{time}</div>

      <div className="flex-1" />

      {/* Jobb oldal */}
      <div className="flex items-center gap-3">
        {/* Értesítések */}
        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* Felhasználó */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">{user?.name ?? 'Felhasználó'}</span>
        </div>

        {/* Kijelentkezés */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Kilépés</span>
        </button>
      </div>
    </header>
  )
}
