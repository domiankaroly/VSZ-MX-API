// Felhasználó
export interface User {
  f_id: number
  f_neve: string
  f_email?: string
  f_admin: number
  f_uzem?: number
  f_telephely?: number
  f_aktiv: number
  f_jelszo?: string
}

// Session user (NextAuth)
export interface SessionUser {
  id: number
  name: string
  admin: boolean
  uzem?: number
  telephely?: number
}

// Partner
export interface Partner {
  p_id: number
  p_nev: string
  p_rovidnev?: string
  p_adoszam?: string
  p_irsz?: string
  p_varos?: string
  p_cim?: string
  p_telefon?: string
  p_email?: string
  p_aktiv: number
}

// Termék
export interface Termek {
  t_id: number
  t_cikkszam: string
  t_nev: string
  t_egyseg?: string
  t_brutto_ar?: number
  t_afa?: number
  t_aktiv: number
  t_csoport?: string
}

// Rendelés
export interface Rendeles {
  rend_id: number
  rend_sorszam: string
  p_nev: string
  p_id: number
  szallitas_datum: string
  rend_datum: string
  rend_aktiv: number
  web_rendeles: number
  rend_megjegyzes?: string
  rend_osszeg?: number
}

// Rendelés tétel
export interface RendelesTétel {
  rt_id: number
  rend_id: number
  t_id: number
  t_nev: string
  t_cikkszam: string
  rt_mennyiseg: number
  rt_egyseg_ar: number
  rt_osszeg: number
}

// Raktárkészlet
export interface Keszlet {
  k_id: number
  t_id: number
  t_nev: string
  t_cikkszam: string
  k_keszlet: number
  k_egyseg: string
  k_raktar: string
  k_datum: string
}

// API válasz wrapper
export interface ApiResponse<T> {
  data?: T
  error?: string
  count?: number
}

// Dashboard statisztika
export interface DashboardStats {
  mai_rendelesek: number
  aktiv_rendelesek: number
  web_rendelesek: number
  belso_rendelesek: number
  eur_arfolyam: string
  online_partnerek: number
  scanner_statuszok: ScannerStatus[]
}

export interface ScannerStatus {
  id: string
  nev: string
  online: boolean
  utolso_uzenet?: string
}

// Tábla oszlop definíció (egyszerűsített)
export interface TableColumn<T> {
  key: keyof T
  header: string
  width?: number
  format?: (val: unknown, row: T) => string
  className?: string
}
