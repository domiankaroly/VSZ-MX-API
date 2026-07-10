import { mxAuth } from '@/lib/mx-auth'
import { query } from '@/lib/db'
import { apiError } from '@/lib/utils'

// ── US11: Partner Interfész a Mx ERP irányába ──────────────────────────────
// GET /api/mx/partnerek
// Teljes partner adatbázis szinkronizáció a Mx ERP számára.
// Ismételt híváskor az adatok frissülnek.

export async function GET(request: Request) {
  const authError = await mxAuth(request)
  // if (authError) return authError

  try {
    // ── 1. Partnerek ────────────────────────────────────────────────────────
    // Forrás: Partner_adat.cs line 292 — teljes partner lekérdezés
    const partnerek = await query<Record<string, unknown>>(
      `SELECT p_id,p_kod,p_nev,p_rovnev,p_aktiv,p_tipus,p_dolgozo,
              p_orszag,p_irsz,p_telepules,p_postacim,p_kerulet,p_kozterulet,p_ktjelleg,p_hazszam,
              p_szamlazasi_cim,p_szallitasi_cim,
              p_kapcs_neve,p_telefon,p_email,
              p_adoszam,p_euadoszam,p_szavido,p_fizmod,p_limit,p_bankszamla,p_bankneve,
              p_raklap,p_elvivos,p_szallitolevel,p_lerako,p_lerakocim,p_lerako_id,p_tavolsag,
              p_jegyzet,p_szamla_jegyzet,p_szallito_jegyzet,
              p_szall_orszag,p_szall_irsz,p_szall_varos,p_szall_utca,p_szall_hazszam
       FROM partner_sz
       ORDER BY p_nev`
    )

    // ── 2. Minden partnerhez: hozzárendelt túrák (tura_bolt) ───────────────
    // Forrás: Tura_lista.cs — tura_bolt tábla tartalmazza a partner-túra kapcsolatot
    const turaBolt = await query<{ p_id: number; t_id: number; t_nev: string; tb_sorrend: number }>(
      `SELECT tb_bolt_id as p_id, tura.t_id, tura.t_nev, tb_sorrend
       FROM tura_bolt
       INNER JOIN tura ON tura.t_id = tura_bolt.tb_tura_id
       WHERE tura.t_aktiv = 1
       ORDER BY tb_sorrend`
    )

    // Index: p_id → túrák[]
    const turByPartner = new Map<number, { t_id: number; t_nev: string; tb_sorrend: number }[]>()
    for (const tb of turaBolt) {
      const arr = turByPartner.get(tb.p_id) ?? []
      arr.push({ t_id: tb.t_id, t_nev: tb.t_nev, tb_sorrend: tb.tb_sorrend })
      turByPartner.set(tb.p_id, arr)
    }

    // ── 3. Raklaptyipusok ──────────────────────────────────────────────────
    const raklapok = await query<{ r_id: number; r_nev: string }>(
      `SELECT r_id, r_nev FROM raklapok ORDER BY r_id`
    )
    const raklapNev = new Map(raklapok.map(r => [r.r_id, r.r_nev]))

    // ── 4. Összerakás — PDF JSON struktúra szerint ─────────────────────────
    const result = partnerek.map(p => ({
      p_id:       p.p_id,
      p_kod:      p.p_kod,
      p_nev:      p.p_nev,
      p_rovnev:   p.p_rovnev,
      p_aktiv:    p.p_aktiv,
      p_tipus:    p.p_tipus,
      p_dolgozo:  p.p_dolgozo,
      cim: {
        p_orszag:         p.p_orszag,
        p_irsz:           p.p_irsz,
        p_telepules:      p.p_telepules,
        p_kerulet:        p.p_kerulet ?? null,
        p_kozterulet:     p.p_kozterulet ?? null,
        p_ktjelleg:       p.p_ktjelleg ?? null,
        p_hazszam:        p.p_hazszam ?? null,
        p_szamlazasi_cim: p.p_szamlazasi_cim,
        p_szallitasi_cim: p.p_szallitasi_cim,
      },
      kapcsolat: {
        p_kapcs_neve: p.p_kapcs_neve ?? null,
        p_telefon:    p.p_telefon ?? null,
        p_email:      p.p_email ?? null,
      },
      penzugyi: {
        p_adoszam:    p.p_adoszam ?? null,
        p_euadoszam:  p.p_euadoszam ?? null,
        p_szavido:    Number(p.p_szavido ?? 0),
        p_fizmod:     p.p_fizmod,
        p_limit:      Number(p.p_limit ?? 0),
        p_bankszamla: p.p_bankszamla ?? null,
        p_bankneve:   p.p_bankneve ?? null,
      },
      szallitas: {
        p_raklap:         p.p_raklap,
        p_raklap_nev:     raklapNev.get(Number(p.p_raklap)) ?? null,
        p_elvivos:        p.p_elvivos,
        p_szallitolevel:  p.p_szallitolevel,
        p_szavido:        Number(p.p_szavido ?? 0),
        p_lerako:         p.p_lerako ?? null,
        p_lerakocim:      p.p_lerakocim ?? null,
        p_lerako_id:      p.p_lerako_id ?? 0,
        p_tavolsag:       Number(p.p_tavolsag ?? 0),
        turak:            turByPartner.get(Number(p.p_id)) ?? [],
        megjegyzesek: {
          p_jegyzet:         p.p_jegyzet ?? null,
          p_szamla_jegyzet:  p.p_szamla_jegyzet ?? null,
          p_szallito_jegyzet: p.p_szallito_jegyzet ?? null,
        },
      },
    }))

    return Response.json({
      success:          true,
      partnerek_szama:  result.length,
      partnerek:        result,
      timestamp:        new Date().toISOString(),
    })
  } catch (err) {
    console.error('mx/partnerek hiba:', err)
    return apiError('Adatbázis hiba', 500)
  }
}
