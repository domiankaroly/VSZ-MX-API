import { auth } from '@/lib/auth'
import { apiError } from '@/lib/utils'
import { testConnection, queryOne } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  const dbOnline = await testConnection()

  if (!dbOnline) {
    return Response.json({
      mai_web_rendeles: '—',
      mai_belso_rendeles: '—',
      eur_arfolyam: '—',
      web_partner: '—',
      konyv_import: '—',
      db_online: false,
      scanner_statuszok: [],
    })
  }

  try {
    const [webRendeles, belsoRendeles, eurArfolyam, webPartner, konyvImport] = await Promise.all([
      queryOne<{ cnt: string }>(
        `SELECT COUNT(rend_id) as cnt FROM rendeles WHERE web_rendeles=1 AND rend_aktiv=1 AND rend_datum=DATE_FORMAT(NOW(),'%Y.%m.%d.')`
      ),
      queryOne<{ cnt: string }>(
        `SELECT COUNT(rend_id) as cnt FROM rendeles WHERE web_rendeles=0 AND rend_aktiv=1 AND rend_datum=DATE_FORMAT(NOW(),'%Y.%m.%d.')`
      ),
      queryOne<{ eur: string }>(
        `SELECT CONCAT('EUR ',ar_arfolyam,' [',ar_datum,']') as eur FROM arfolyam ORDER BY ar_id DESC LIMIT 1`
      ),
      queryOne<{ val: string }>(
        `select CONCAT((select count(*)-3 from web_user where active=1),'/',count(*)) as val from (select count(p_nev) from partner_sz inner join rendeles on rendeles.p_id=partner_sz.p_id group by partner_sz.p_id) as DerivedTableAlias`
      ),
      queryOne<{ val: string }>(
        `SELECT be_text as val FROM beallitas WHERE be_id=36`
      ),
    ])

    return Response.json({
      mai_web_rendeles: webRendeles?.cnt ?? '0',
      mai_belso_rendeles: belsoRendeles?.cnt ?? '0',
      eur_arfolyam: eurArfolyam?.eur ?? '—',
      web_partner: webPartner?.val ?? '—',
      konyv_import: (konyvImport?.val ?? '').replace(/-/g, '.'),
      db_online: true,
      scanner_statuszok: [],
    })
  } catch (error) {
    console.error('Dashboard API hiba:', error)
    return apiError('Adatbázis hiba', 500)
  }
}
