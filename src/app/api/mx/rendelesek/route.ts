import { mxAuth } from '@/lib/mx-auth'
import { query } from '@/lib/db'
import { apiError } from '@/lib/utils'

// ── US13: Megrendelés Interfész a Mx ERP irányába ──────────────────────────
// GET /api/mx/rendelesek?tol=2026-02-13&ig=2026-02-15
// Hierarchikus struktúra: Túra → Partner/Rendelés → Rendelt tételek
// Ez azonos a /api/tura-lista végponttal, de a PDF által előírt mezőnevekkel.

export async function GET(request: Request) {
  const authError = await mxAuth(request)
  // if (authError) return authError

  const { searchParams } = new URL(request.url)
  const tolParam = searchParams.get('tol')
  const igParam  = searchParams.get('ig')

  if (!tolParam || !igParam) {
    return apiError('tol és ig paraméter kötelező (pl. ?tol=2026-02-13&ig=2026-02-15)', 400)
  }

  const tolVsz = tolParam.replace(/-/g, '.') + '.'
  const igVsz  = igParam.replace(/-/g, '.') + '.'

  try {
    // ── 1. SZINT: Túrák ────────────────────────────────────────────────────
    const turak = await query<{ t_id: number; t_nev: string; szallitas_datum: string }>(
      `SELECT t_id, t_nev, szallitas_datum
       FROM tura
       INNER JOIN rendeles ON rendeles.tura_id = t_id
       WHERE t_aktiv = 1
         AND szallitas_datum >= ?
         AND szallitas_datum <= ?
       GROUP BY t_id, szallitas_datum
       ORDER BY t_sorrend`,
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

    // ── 2. SZINT: Rendelések (partner + rendelés fejléc) ──────────────────
    // Forrás: Tura_lista.cs + Rendelesek.cs c1TrueDBGrid2 lekérdezés
    const rendelesek = await query<{
      t_id: number; p_id: number; p_nev: string; p_kod: string; p_dolgozo: number
      rend_id: number; rend_sorszam: number; rend_aktiv: number; rend_datum: string
      rend_tip: number; rend_elvivos: number; rend_szavido: number; rend_kirakva: number
      rend_raklap: number; rend_kirakva_fagy: number
      rend_raktar_tol: string; rend_raktar_ig: string
      rend_csom_tol: string; rend_csom_ig: string
      web_jegyzet: string | null; szallitas_datum: string
    }>(
      `SELECT
         rendeles.tura_id        AS t_id,
         partner_sz.p_id,
         partner_sz.p_nev,
         partner_sz.p_kod,
         partner_sz.p_dolgozo,
         rendeles.rend_id,
         rendeles.rend_sorszam,
         rendeles.rend_aktiv,
         rendeles.rend_datum,
         rendeles.rend_tip,
         rendeles.rend_elvivos,
         rendeles.rend_szavido,
         rendeles.rend_kirakva,
         rendeles.rend_raklap,
         rendeles.rend_kirakva_fagy,
         rendeles.rend_raktar_tol,
         rendeles.rend_raktar_ig,
         rendeles.rend_csom_tol,
         rendeles.rend_csom_ig,
         rendeles.web_jegyzet,
         rendeles.szallitas_datum
       FROM rendeles
       INNER JOIN partner_sz ON rendeles.p_id = partner_sz.p_id
       INNER JOIN tura        ON rendeles.tura_id = tura.t_id
       WHERE rendeles.rend_aktiv = 1
         AND rendeles.szallitas_datum >= ?
         AND rendeles.szallitas_datum <= ?
         AND partner_sz.p_dolgozo = 0
       ORDER BY tura.t_sorrend, rendeles.rend_sorszam`,
      [tolVsz, igVsz]
    )

    // ── 3. SZINT: Tételek ──────────────────────────────────────────────────
    // Forrás: Rendelesek.cs c1TrueDBGrid2 (tab 2) + rendeles_raktar_reszlet kiadott
    const rend_ids = rendelesek.map(r => r.rend_id)
    let tetelek: {
      rend_id: number; t_id: number; rr_id: number; t_plu: string; t_neve: string
      csgo_nev: string; csmo_nev: string; rs: number; menny_db: number
      kiadott: number; menny: number; egysegar: number; tetelar: number
      t_partner_plu: string | null
    }[] = []

    if (rend_ids.length > 0) {
      const ph = rend_ids.map(() => '?').join(',')
      tetelek = await query(
        `SELECT
           rendeles_reszlet.rend_id,
           termek.t_id,
           rendeles_reszlet.rr_id,
           termek.t_plu,
           termek.t_neve,
           csomagolas_go.csgo_nev,
           csomagolas_mo.csmo_nev,
           csomagolas.csom_netto / 1000                       AS rs,
           rendeles_reszlet.menny_db,
           COALESCE(
             (SELECT SUM(rrr.menny_db)
              FROM rendeles_raktar_reszlet rrr
              WHERE rrr.rend_id = rendeles_reszlet.rend_id
                AND rrr.t_id   = rendeles_reszlet.t_id), 0)   AS kiadott,
           rendeles_reszlet.menny,
           rendeles_reszlet.egysegar,
           rendeles_reszlet.tetelar,
           termek.t_partner_plu
         FROM rendeles_reszlet
         INNER JOIN termek        ON rendeles_reszlet.t_id    = termek.t_id
         INNER JOIN csomagolas    ON rendeles_reszlet.csom_id = csomagolas.csom_id
         INNER JOIN csomagolas_mo ON csomagolas.csom_mo_id    = csomagolas_mo.csmo_id
         INNER JOIN csomagolas_go ON csomagolas.csom_go_id    = csomagolas_go.csgo_id
         WHERE rendeles_reszlet.rend_id IN (${ph})
         ORDER BY rendeles_reszlet.rend_id, rendeles_reszlet.rr_id`,
        rend_ids
      ) as typeof tetelek
    }

    // ── Indexelés ──────────────────────────────────────────────────────────
    const tetelByRend = new Map<number, typeof tetelek>()
    for (const t of tetelek) {
      const arr = tetelByRend.get(t.rend_id) ?? []
      arr.push(t)
      tetelByRend.set(t.rend_id, arr)
    }

    const rendByTura = new Map<number, typeof rendelesek>()
    for (const r of rendelesek) {
      const arr = rendByTura.get(r.t_id) ?? []
      arr.push(r)
      rendByTura.set(r.t_id, arr)
    }

    const fmtDate = (d: string | null) =>
      d ? d.replace(/\./g, '-').replace(/-$/, '') : null

    // ── Összerakás ─────────────────────────────────────────────────────────
    const result = turak.map(tura => {
      const rendArr = rendByTura.get(tura.t_id) ?? []
      const kesz = rendArr.filter(r => r.rend_kirakva === 1).length

      return {
        t_id:            tura.t_id,
        t_nev:           tura.t_nev,
        szallitas_datum: fmtDate(tura.szallitas_datum),
        db:              rendArr.length,
        kesz,
        rendelesek: rendArr.map(rend => ({
          p_id:              rend.p_id,
          p_nev:             rend.p_nev,
          p_kod:             rend.p_kod,
          p_dolgozo:         rend.p_dolgozo,
          rend_id:           rend.rend_id,
          rend_sorszam:      rend.rend_sorszam,
          rend_aktiv:        rend.rend_aktiv,
          rend_datum:        fmtDate(rend.rend_datum),
          rend_tip:          rend.rend_tip,
          rend_elvivos:      rend.rend_elvivos,
          rend_szavido:      rend.rend_szavido,
          rend_kirakva:      rend.rend_kirakva,
          rend_raklap:       rend.rend_raklap,
          rend_kirakva_fagy: rend.rend_kirakva_fagy,
          rend_raktar_tol:   fmtDate(rend.rend_raktar_tol),
          rend_raktar_ig:    fmtDate(rend.rend_raktar_ig),
          rend_csom_tol:     fmtDate(rend.rend_csom_tol),
          rend_csom_ig:      fmtDate(rend.rend_csom_ig),
          web_jegyzet:       rend.web_jegyzet ?? null,
          tetelek: (tetelByRend.get(rend.rend_id) ?? []).map(t => ({
            t_id:          t.t_id,
            rr_id:         t.rr_id,
            t_plu:         t.t_plu,
            t_neve:        t.t_neve,
            csgo_nev:      t.csgo_nev,
            csmo_nev:      t.csmo_nev,
            rs:            Number(t.rs),
            menny_db:      Number(t.menny_db),
            kiadott:       Number(t.kiadott),
            menny:         Number(t.menny),
            egysegar:      Number(t.egysegar),
            tetelar:       Number(t.tetelar),
            t_partner_plu: t.t_partner_plu ?? null,
          })),
        })),
      }
    })

    return Response.json({
      success:             true,
      szallitas_datum_tol: tolParam,
      szallitas_datum_ig:  igParam,
      turak_szama:         result.length,
      turak:               result,
      timestamp:           new Date().toISOString(),
    })
  } catch (err) {
    console.error('mx/rendelesek hiba:', err)
    return apiError('Adatbázis hiba', 500)
  }
}
