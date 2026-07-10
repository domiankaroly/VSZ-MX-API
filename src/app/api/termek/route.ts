import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import { apiError } from '@/lib/utils'
import type { Termek } from '@/types'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  const { searchParams } = new URL(request.url)
  const kereses = searchParams.get('q')
  const aktiv = searchParams.get('aktiv') ?? '1'

  try {
    let sql = `
      SELECT t_id, t_cikkszam, t_nev, t_egyseg, t_brutto_ar, t_afa, t_aktiv, t_csoport
      FROM termek_keszlet
      WHERE 1=1
    `
    const params: unknown[] = []

    if (aktiv !== 'all') {
      sql += ' AND t_aktiv = ?'
      params.push(aktiv)
    }
    if (kereses) {
      sql += ' AND (t_nev LIKE ? OR t_cikkszam LIKE ?)'
      const k = `%${kereses}%`
      params.push(k, k)
    }
    sql += ' ORDER BY t_nev LIMIT 500'

    const rows = await query<Termek>(sql, params)
    return Response.json({ data: rows, count: rows.length })
  } catch (error) {
    console.error('Termek GET hiba:', error)
    return apiError('Adatbázis hiba', 500)
  }
}
