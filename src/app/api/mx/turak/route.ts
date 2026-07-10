import { mxAuth } from '@/lib/mx-auth'
import { query } from '@/lib/db'
import { apiError } from '@/lib/utils'

// ── US12: Túra Interfész a Mx ERP irányába ─────────────────────────────────
// GET /api/mx/turak?tol=2026-02-13&ig=2026-02-15
// Túra adatok + partnerek (boltok) az adott szállítási dátumtartományra.
// Forrás: Tura.cs + Tura_lista.cs + tura_bolt tábla

export async function GET(request: Request) {
  const authError = await mxAuth(request)
  //if (authError) return authError

  const { searchParams } = new URL(request.url)
  const tolParam = searchParams.get('tol')
  const igParam  = searchParams.get('ig')

  if (!tolParam || !igParam) {
    return apiError('tol és ig paraméter kötelező (pl. ?tol=2026-02-13&ig=2026-02-15)', 400)
  }

  const tolVsz = tolParam.replace(/-/g, '.') + '.'
  const igVsz  = igParam.replace(/-/g, '.') + '.'

  try {
    // ── 1. Aktív túrák a dátumtartományban ────────────────────────────────
    // Forrás: Tura.cs line 95
    const turak = await query<{
      t_id: number; t_nev: string; t_sorrend: number; t_rendszam: string
      t_aktiv: number; t_lezart: number; t_megjegyzes: string | null
      szallitas_datum: string; rendelesek_szama: number; lezart_rendelesek: number
    }>(
      `SELECT
         tura.t_id, tura.t_nev, tura.t_sorrend, tura.t_rendszam,
         tura.t_aktiv, tura.t_megjegyzes,
         rendeles.szallitas_datum,
         COUNT(rendeles.rend_id) AS rendelesek_szama,
         SUM(CASE WHEN rendeles.rend_aktiv = 0 THEN 1 ELSE 0 END) AS lezart_rendelesek
       FROM tura
       INNER JOIN rendeles ON rendeles.tura_id = tura.t_id
       WHERE tura.t_aktiv = 1
         AND rendeles.szallitas_datum >= ?
         AND rendeles.szallitas_datum <= ?
       GROUP BY tura.t_id, rendeles.szallitas_datum
       ORDER BY tura.t_sorrend, rendeles.szallitas_datum`,
      [tolVsz, igVsz]
    )

    if (turak.length === 0) {
      return Response.json({
        success: true,
        szallitas_datum_tol: tolParam,
        szallitas_datum_ig:  igParam,
        turak_szama: 0,
        turak: [],
        timestamp: new Date().toISOString(),
      })
    }

    // ── 2. Boltok (partner-túra kapcsolat) ────────────────────────────────
    // Forrás: Tura_lista.cs — tura_bolt tábla
    const turaIds = [...new Set(turak.map(t => t.t_id))]
    const placeholders = turaIds.map(() => '?').join(',')

    const boltok = await query<{
      t_id: number; tb_sorrend: number
      p_id: number; p_kod: string; p_nev: string; p_szallitasi_cim: string
    }>(
      `SELECT
         tura_bolt.tb_tura_id AS t_id,
         tura_bolt.tb_sorrend,
         partner_sz.p_id,
         partner_sz.p_kod,
         partner_sz.p_nev,
         partner_sz.p_szallitasi_cim
       FROM tura_bolt
       INNER JOIN partner_sz ON partner_sz.p_id = tura_bolt.tb_bolt_id
       WHERE tura_bolt.tb_tura_id IN (${placeholders})
       ORDER BY tura_bolt.tb_tura_id, tura_bolt.tb_sorrend`,
      turaIds
    )

    // Index: t_id → boltok[]
    const boltByTura = new Map<number, typeof boltok>()
    for (const b of boltok) {
      const arr = boltByTura.get(b.t_id) ?? []
      arr.push(b)
      boltByTura.set(b.t_id, arr)
    }

    // Dátum helper
    const fmtDate = (d: string | null) =>
      d ? d.replace(/\./g, '-').replace(/-$/, '') : null

    // ── 3. Összerakás ──────────────────────────────────────────────────────
    const result = turak.map(t => ({
      t_id:                t.t_id,
      t_nev:               t.t_nev,
      t_sorrend:           t.t_sorrend,
      t_rendszam:          t.t_rendszam ?? null,
      t_aktiv:             t.t_aktiv,
      t_lezart:            t.t_lezart ?? 0,
      t_megjegyzes:        t.t_megjegyzes ?? null,
      szallitas_datum:     fmtDate(t.szallitas_datum),
      rendelesek_szama:    Number(t.rendelesek_szama),
      lezart_rendelesek:   Number(t.lezart_rendelesek),
      boltok: (boltByTura.get(t.t_id) ?? []).map(b => ({
        tb_sorrend:       b.tb_sorrend,
        p_id:             b.p_id,
        p_kod:            b.p_kod,
        p_nev:            b.p_nev,
        p_szallitasi_cim: b.p_szallitasi_cim,
      })),
    }))

    return Response.json({
      success:             true,
      szallitas_datum_tol: tolParam,
      szallitas_datum_ig:  igParam,
      turak_szama:         result.length,
      turak:               result,
      timestamp:           new Date().toISOString(),
    })
  } catch (err) {
    console.error('mx/turak hiba:', err)
    return apiError('Adatbázis hiba', 500)
  }
}
