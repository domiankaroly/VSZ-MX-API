import { mxAuth } from '@/lib/mx-auth'
import { execute, queryOne } from '@/lib/db'
import { apiError } from '@/lib/utils'

// ── US23: Megrendelések módosítása a Vsz ERP irányába ─────────────────────
// PUT /api/mx/rendeles-modositas
// A Mx ERP hívja ezt a végpontot, amikor módosított rendelési tételt küld.
// A VSZ frissíti a rendeles_reszlet táblát a kapott adatokkal.
//
// PDF 3.3.1 JSON struktúra (bejövő):
// {
//   "rr_id": 1,
//   "menny_db": 30,
//   "plu": 30,
//   "tura_id": 30,
//   "egysegar": 30.2,
//   "partner_id": 30,
//   "rend_csom_ig": "2023-08-17T15:20:28+02:00",
//   "rend_raktar_ig": "2023-08-17T15:20:28+02:00"
// }

interface RendelesModositasBody {
  rr_id:          number
  menny_db:       number
  plu:            number | string
  tura_id:        number
  egysegar:       number
  partner_id:     number
  rend_csom_ig:   string
  rend_raktar_ig: string
}

export async function PUT(request: Request) {
  const authError = await mxAuth(request)
  //if (authError) return authError

  try {
    const body = await request.json() as Partial<RendelesModositasBody>

    // Validáció
    if (!body.rr_id)      return apiError('rr_id kötelező', 400)
    if (!body.partner_id) return apiError('partner_id kötelező', 400)
    if (!body.tura_id)    return apiError('tura_id kötelező', 400)

    // ── Létező rekord ellenőrzése ──────────────────────────────────────────
    const existing = await queryOne<{ rr_id: number; rend_id: number }>(
      `SELECT rr_id, rend_id FROM rendeles_reszlet WHERE rr_id = ?`,
      [body.rr_id]
    )

    if (!existing) {
      return apiError(`Nem található rendeles_reszlet.rr_id = ${body.rr_id}`, 404)
    }

    // ── Dátum konverzió: ISO → VSZ formátum ───────────────────────────────
    // "2023-08-17T15:20:28+02:00" → "2023.08.17."
    const isoToVsz = (iso: string | null | undefined): string | null => {
      if (!iso) return null
      try {
        const d = new Date(iso)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}.${m}.${day}.`
      } catch {
        return null
      }
    }

    const rendCsomIg   = isoToVsz(body.rend_csom_ig)
    const rendRaktarIg = isoToVsz(body.rend_raktar_ig)

    // ── rendeles_reszlet frissítése ────────────────────────────────────────
    await execute(
      `UPDATE rendeles_reszlet
       SET menny_db  = ?,
           egysegar  = ?
       WHERE rr_id = ?`,
      [body.menny_db ?? 0, body.egysegar ?? 0, body.rr_id]
    )


    return Response.json({
      success:   true,
      rr_id:     body.rr_id,
      rend_id:   existing.rend_id,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('mx/rendeles-modositas hiba:', err)
    return apiError('Hiba', 500)
  }
}
