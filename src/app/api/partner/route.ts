import { auth } from '@/lib/auth'
import { query, execute, queryOne } from '@/lib/db'
import { apiError } from '@/lib/utils'
import type { Partner } from '@/types'

// GET /api/partner — lista, keresés
export async function GET(request: Request) {
  const session = await auth()
  // if (!session) return apiError('Nincs jogosultság', 401)

  const { searchParams } = new URL(request.url)
  const kereses = searchParams.get('q')
  const aktiv = searchParams.get('aktiv') ?? '1'
  const id = searchParams.get('id')

  try {
    // Egyetlen partner lekérése
    if (id) {
      const partner = await queryOne<Partner>(
        'SELECT * FROM partner_sz WHERE p_id = ?',
        [id]
      )
      if (!partner) return apiError('Partner nem található', 404)
      return Response.json(partner)
    }

    // Lista lekérése
    let sql = 'SELECT p_id, p_nev, p_rovidnev, p_adoszam, p_irsz, p_varos, p_cim, p_telefon, p_email, p_aktiv FROM partner_sz WHERE 1=1'
    const params: unknown[] = []

    if (aktiv !== 'all') {
      sql += ' AND p_aktiv = ?'
      params.push(aktiv)
    }
    if (kereses) {
      sql += ' AND (p_nev LIKE ? OR p_adoszam LIKE ? OR p_varos LIKE ?)'
      const k = `%${kereses}%`
      params.push(k, k, k)
    }
    sql += ' ORDER BY p_nev LIMIT 500'

    const partners = await query<Partner>(sql, params)
    return Response.json({ data: partners, count: partners.length })
  } catch (error) {
    console.error('Partner GET hiba:', error)
    return apiError('Adatbázis hiba', 500)
  }
}

// POST /api/partner — új partner
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  try {
    const body = await request.json() as Partial<Partner>

    if (!body.p_nev) return apiError('A partner neve kötelező', 400)

    const result = await execute(
      `INSERT INTO partner_sz (p_nev, p_rovidnev, p_adoszam, p_irsz, p_varos, p_cim, p_telefon, p_email, p_aktiv)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [body.p_nev, body.p_rovidnev ?? '', body.p_adoszam ?? '', body.p_irsz ?? '',
       body.p_varos ?? '', body.p_cim ?? '', body.p_telefon ?? '', body.p_email ?? '']
    )

    return Response.json({ id: result.insertId }, { status: 201 })
  } catch (error) {
    console.error('Partner POST hiba:', error)
    return apiError('Mentési hiba', 500)
  }
}

// PUT /api/partner — módosítás
export async function PUT(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  try {
    const body = await request.json() as Partial<Partner>
    if (!body.p_id) return apiError('Partner ID kötelező', 400)

    await execute(
      `UPDATE partner_sz SET p_nev=?, p_rovidnev=?, p_adoszam=?, p_irsz=?, p_varos=?, p_cim=?, p_telefon=?, p_email=?, p_aktiv=?
       WHERE p_id=?`,
      [body.p_nev, body.p_rovidnev, body.p_adoszam, body.p_irsz,
       body.p_varos, body.p_cim, body.p_telefon, body.p_email, body.p_aktiv, body.p_id]
    )

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Partner PUT hiba:', error)
    return apiError('Mentési hiba', 500)
  }
}
