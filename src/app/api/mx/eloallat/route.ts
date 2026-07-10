import { mxAuth } from '@/lib/mx-auth'
import { queryOne } from '@/lib/db'
import { apiError } from '@/lib/utils'

// ── US21: Élőállat interfész a Mx ERP irányába ─────────────────────────────
// POST /api/mx/eloallat
// Minden kamion megérkezése és VSZ könyvelése után a VSZ automatikusan hívja
// a Mx ERP végpontját. Ez a route fogadja a trigger eseményt, lekéri az adatot
// a DB-ből (beszallitas_fej + partner_sz), és továbbítja a Mx ERP felé.
//
// Mx ERP végpont (PDF 3.1.1): 
//   https://erp.vargaszarnyas.hu/rest/turalistarestapi/v1/POST_Endpoint/eloallat

interface EloallatBody {
  bf_id: number  // a VSZ által könyvelt beszállítás fej ID-ja
}

export async function POST(request: Request) {
  const authError = await mxAuth(request)
  //if (authError) return authError

  try {
    const body = await request.json() as Partial<EloallatBody>
    if (!body.bf_id) return apiError('bf_id kötelező', 400)

    // ── Adat lekérése a DB-ből ────────────────────────────────────────────
    // Forrás: napi_vagas.cs — bf_turnusszam, bf_datum, bf_lot, be_csirkedb*be_rekeszdb,
    //         be_atlag, be_suly_erkezes mezők
    const record = await queryOne<{
      p_id: number; p_nev: string
      bf_datum: string; bf_turnusszam: string
      bf_darab: number; bf_atlag_szamolt: number; bf_atlag: number; bf_lot: number
    }>(
      `SELECT
         partner_sz.p_id,
         partner_sz.p_nev,
         bf_datum,
         bf_turnusszam,
         (SELECT SUM(be_rekeszdb * be_csirkedb) FROM beszallitas WHERE be_fej = bf_id) AS bf_darab,
         bf_atlag_szamolt,
         bf_atlag,
         bf_lot
       FROM beszallitas_fej
       INNER JOIN partner_sz ON bf_termelo = partner_sz.p_id
       WHERE bf_id = ?`,
      [body.bf_id]
    )

    if (!record) return apiError('Nem található a beszállítás: ' + body.bf_id, 404)

    // ── PDF 3.1.1 JSON struktúra összerakása ──────────────────────────────
    const payload = {
      partner_sz: {
        p_id:  record.p_id,
        p_nev: record.p_nev,
      },
      beszallitas_fej: {
        bf_datum:         new Date(record.bf_datum).toISOString(),
        bf_turnusszam:    record.bf_turnusszam,
        bf_darab:         Number(record.bf_darab),
        bf_atlag_szamolt: Number(record.bf_atlag_szamolt),
        bf_atlag:         Number(record.bf_atlag),
        LOT:              Number(record.bf_lot),
      },
    }

    console.log(payload);
    // ── Továbbítás a Mx ERP felé ──────────────────────────────────────────
    const mxUrl = process.env.MX_ERP_URL
      ?? 'https://erp.vargaszarnyas.hu/rest/turalistarestapi/v1/POST_Endpoint/eloallat'

    let mxStatus = 'skipped'
    let mxError: string | null = null

    if (process.env.MX_ERP_ENABLED === 'true') {
      try {
        const mxResponse = await fetch(mxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000), // 10 mp timeout
        })
        mxStatus = mxResponse.ok ? 'sent' : 'error'
        if (!mxResponse.ok) {
          mxError = `Mx ERP válasz: ${mxResponse.status} ${mxResponse.statusText}`
        }
      } catch (fetchErr) {
        mxStatus = 'error'
        mxError = String(fetchErr)
        console.error('Mx ERP hívás sikertelen:', fetchErr)
      }
    }

    return Response.json({
      success:    mxStatus === 'sent' || mxStatus === 'skipped',
      mx_status:  mxStatus,
      mx_error:   mxError,
      payload,    // visszaküldjük a küldött adatot is ellenőrzéshez
      timestamp:  new Date().toISOString(),
    })
  } catch (err) {
    console.error('mx/eloallat hiba:', err)
    return apiError('Hiba', 500)
  }
}
