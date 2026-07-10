import { mxAuth } from '@/lib/mx-auth'
import { apiError } from '@/lib/utils'

// ── US22: Élőállat VÉGE interfész a Mx ERP irányába ───────────────────────
// POST /api/mx/eloallat-vege
// Az utolsó turnus könyvelése után hívja a VSZ a Mx ERP végpontját,
// hogy triggeреlje a készletelőrejelzés kalkulációt.
//
// Mx ERP végpont (PDF 3.2.1):
//   https://erp.vargaszarnyas.hu/rest/turalistarestapi/v1/POST_Endpoint/Eloallatvege

export async function POST(request: Request) {
  const authError = await mxAuth(request)
  //if (authError) return authError

  try {
    // PDF 3.2.1 JSON struktúra: csak a dátum
    const payload = {
      date: new Date().toISOString(),
    }

    const mxUrl = process.env.MX_ERP_VEGE_URL
      ?? 'https://erp.vargaszarnyas.hu/rest/turalistarestapi/v1/POST_Endpoint/Eloallatvege'

    let mxStatus = 'skipped'
    let mxError: string | null = null

    console.log(payload)

    if (process.env.MX_ERP_ENABLED === 'true') {
      try {
        const mxResponse = await fetch(mxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        })
        mxStatus = mxResponse.ok ? 'sent' : 'error'
        if (!mxResponse.ok) {
          mxError = `Mx ERP válasz: ${mxResponse.status} ${mxResponse.statusText}`
        }
      } catch (fetchErr) {
        mxStatus = 'error'
        mxError = String(fetchErr)
        console.error('Mx ERP VEGE hívás sikertelen:', fetchErr)
      }
    }

    return Response.json({
      success:   mxStatus === 'sent' || mxStatus === 'skipped',
      mx_status: mxStatus,
      mx_error:  mxError,
      payload,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('mx/eloallat-vege hiba:', err)
    return apiError('Hiba', 500)
  }
}
