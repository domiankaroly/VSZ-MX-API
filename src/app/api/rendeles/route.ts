import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import { apiError, maiNap, honapKezdete } from '@/lib/utils'
import type { Rendeles } from '@/types'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  const { searchParams } = new URL(request.url)
  const datumTol = searchParams.get('tol') ?? honapKezdete()
  const datumIg = searchParams.get('ig') ?? maiNap()
  const aktiv = searchParams.get('aktiv')
  const partnerId = searchParams.get('partner_id')

  try {
    let sql = `
      SELECT 
        r.rend_id, r.rend_sorszam, p.p_nev, r.p_id,
        r.szallitas_datum, r.rend_datum, r.rend_aktiv,
        r.web_rendeles, r.rend_megjegyzes,
        COALESCE(SUM(rt.rt_mennyiseg * rt.rt_egyseg_ar), 0) as rend_osszeg
      FROM rendeles r
      INNER JOIN partner_sz p ON r.p_id = p.p_id
      LEFT JOIN rendeles_tetel rt ON r.rend_id = rt.rend_id
      WHERE r.szallitas_datum >= ? AND r.szallitas_datum <= ?
    `
    const params: unknown[] = [datumTol, datumIg]

    if (aktiv != null) {
      sql += ' AND r.rend_aktiv = ?'
      params.push(aktiv)
    }
    if (partnerId) {
      sql += ' AND r.p_id = ?'
      params.push(partnerId)
    }

    sql += ' GROUP BY r.rend_id ORDER BY r.szallitas_datum DESC, r.rend_sorszam LIMIT 1000'

    const rows = await query<Rendeles>(sql, params)
    return Response.json({ data: rows, count: rows.length })
  } catch (error) {
    console.error('Rendeles GET hiba:', error)
    return apiError('Adatbázis hiba', 500)
  }
}
