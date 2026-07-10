import { auth } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { apiError } from '@/lib/utils'

// POST /api/szamlazas/lock
// Body: { sz_id: number, action: 'acquire' | 'release' }
//
// MySQL GET_LOCK / RELEASE_LOCK alapú konkurencia védelem.
// Ha két munkaállomás egyszerre próbál számlát generálni ugyanarra
// az sz_id-re, a második azonnal HTTP 423-at kap.
//
// A lock neve: "szamla_<sz_id>" — globális a MySQL szerveren belül,
// automatikusan felszabadul ha a kapcsolat megszakad (crash-safe).

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  const body = await request.json() as { sz_id?: number; action?: string }
  const { sz_id, action } = body

  if (!sz_id || !action) {
    return apiError('sz_id és action kötelező', 400)
  }

  const lockName = `szamla_${sz_id}`

  if (action === 'acquire') {
    // GET_LOCK(name, timeout=0): azonnali visszatérés
    //   1 = lock megszerzve
    //   0 = már valaki más tartja
    //  null = hiba
    const result = await queryOne<{ lock_result: number }>(
      'SELECT GET_LOCK(?, 0) AS lock_result',
      [lockName]
    )

    const lockResult = result?.lock_result

    if (lockResult === 1) {
      return Response.json({
        ok: true,
        acquired: true,
        lock_name: lockName,
        message: 'Lock megszerzve, számlázás elindítható.',
      })
    }

    if (lockResult === 0) {
      return Response.json(
        {
          ok: false,
          acquired: false,
          lock_name: lockName,
          message: 'Ez a szállítólevél már számlázás alatt áll egy másik munkaállomáson!',
        },
        { status: 423 } // 423 Locked — szabványos HTTP státusz erre az esetre
      )
    }

    // null = belső MySQL hiba
    return apiError('Lock hiba (MySQL)', 500)
  }

  if (action === 'release') {
    // RELEASE_LOCK: felszabadítja a lockot
    //  1 = sikeresen felszabadítva
    //  0 = a lock létezik, de más session tartja
    // null = ilyen nevű lock nem létezik
    await queryOne('SELECT RELEASE_LOCK(?)', [lockName])
    return Response.json({ ok: true, released: true, lock_name: lockName })
  }

  return apiError('Ismeretlen action: ' + action, 400)
}
