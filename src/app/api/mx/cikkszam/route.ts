import { mxAuth } from '@/lib/mx-auth'
import { execute, queryOne } from '@/lib/db'
import { apiError } from '@/lib/utils'
import { sendMail } from '@/lib/mail'
import { publishMqtt } from '@/lib/mqtt'

const IT_ERTESITES_EMAIL = 'it@vargaszarnyas.hu'
const MQTT_SYSTEM_TOPIC = 'vsz/system'

// ── Cikkszám (termék) import a Mx ERP irányából ────────────────────────────
// POST /api/mx/cikkszam
// A Mx ERP a termék törzsadat cikkszám-rekordjait küldi erre a végpontra.
// Tábla: termek_erp_import. Ha a cikkszam_azonosito már létezik, frissítjük
// a sort (upsert), különben új rekordot szúrunk be. Egyetlen objektum vagy
// objektumok tömbje is küldhető (batch import).

interface CikkszamBody {
  cikkszamAzonosito: string
  cikkszamStatusz: string
  termekMegnevezes: string
  allatnev: string
  fogyaszthatosagiBesorolas: string
  hutottsegiBesorolas: string
  csomagolasTipus: string
  ritualisFeldolgozas?: string | null
  gongyoleg?: string | null
  gongyolegEgalizaltsag?: boolean
  gongyolegTargetSuly?: number
  gongyolegSulytartomanyMax?: number
  gongyolegSulytartomanyMin?: number
  csomagEgalizaltsag?: boolean
  csomagTargetSuly?: number
  csomagSulytartomanyMax?: number
  csomagSulytartomanyMin?: number
  csomagDarabszamEgyRekeszben?: number
  termekEgalizaltsag?: boolean
  termekSulytartomanyMax?: number
  termekSulytartomanyMin?: number
  termekDarabszamEgyCsomagban?: number
}

function validateAndMap(body: Partial<CikkszamBody>) {
  if (!body.cikkszamAzonosito) throw new Error('cikkszamAzonosito kötelező')
  if (!body.cikkszamStatusz) throw new Error('cikkszamStatusz kötelező')
  if (!body.termekMegnevezes) throw new Error('termekMegnevezes kötelező')
  if (!body.allatnev) throw new Error('allatnev kötelező')
  if (!body.fogyaszthatosagiBesorolas) throw new Error('fogyaszthatosagiBesorolas kötelező')
  if (!body.hutottsegiBesorolas) throw new Error('hutottsegiBesorolas kötelező')
  if (!body.csomagolasTipus) throw new Error('csomagolasTipus kötelező')

  return {
    cikkszam_azonosito: body.cikkszamAzonosito,
    cikkszam_statusz: body.cikkszamStatusz,
    termek_megnevezes: body.termekMegnevezes,
    allatnev: body.allatnev,
    fogyaszthatosagi_besorolas: body.fogyaszthatosagiBesorolas,
    hutottsegi_besorolas: body.hutottsegiBesorolas,
    csomagolas_tipus: body.csomagolasTipus,
    ritualis_feldolgozas: body.ritualisFeldolgozas ?? null,
    gongyoleg: body.gongyoleg ?? null,
    gongyoleg_egalizaltsag: body.gongyolegEgalizaltsag ? 1 : 0,
    gongyoleg_target_suly: body.gongyolegTargetSuly ?? 0,
    gongyoleg_sulytartomany_max: body.gongyolegSulytartomanyMax ?? 0,
    gongyoleg_sulytartomany_min: body.gongyolegSulytartomanyMin ?? 0,
    csomag_egalizaltsag: body.csomagEgalizaltsag ? 1 : 0,
    csomag_target_suly: body.csomagTargetSuly ?? 0,
    csomag_sulytartomany_max: body.csomagSulytartomanyMax ?? 0,
    csomag_sulytartomany_min: body.csomagSulytartomanyMin ?? 0,
    csomag_darabszam_egy_rekeszben: body.csomagDarabszamEgyRekeszben ?? 0,
    termek_egalizaltsag: body.termekEgalizaltsag ? 1 : 0,
    termek_sulytartomany_max: body.termekSulytartomanyMax ?? 0,
    termek_sulytartomany_min: body.termekSulytartomanyMin ?? 0,
    termek_darabszam_egy_csomagban: body.termekDarabszamEgyCsomagban ?? 0,
  }
}

async function upsertOne(body: Partial<CikkszamBody>) {
  const row = validateAndMap(body)

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM termek_erp_import WHERE cikkszam_azonosito = ?',
    [row.cikkszam_azonosito]
  )

  if (existing) {
    await execute(
      `UPDATE termek_erp_import SET
         cikkszam_statusz = ?, termek_megnevezes = ?, allatnev = ?,
         fogyaszthatosagi_besorolas = ?, hutottsegi_besorolas = ?, csomagolas_tipus = ?,
         ritualis_feldolgozas = ?, gongyoleg = ?,
         gongyoleg_egalizaltsag = ?, gongyoleg_target_suly = ?,
         gongyoleg_sulytartomany_max = ?, gongyoleg_sulytartomany_min = ?,
         csomag_egalizaltsag = ?, csomag_target_suly = ?,
         csomag_sulytartomany_max = ?, csomag_sulytartomany_min = ?,
         csomag_darabszam_egy_rekeszben = ?,
         termek_egalizaltsag = ?, termek_sulytartomany_max = ?,
         termek_sulytartomany_min = ?, termek_darabszam_egy_csomagban = ?
       WHERE id = ?`,
      [
        row.cikkszam_statusz, row.termek_megnevezes, row.allatnev,
        row.fogyaszthatosagi_besorolas, row.hutottsegi_besorolas, row.csomagolas_tipus,
        row.ritualis_feldolgozas, row.gongyoleg,
        row.gongyoleg_egalizaltsag, row.gongyoleg_target_suly,
        row.gongyoleg_sulytartomany_max, row.gongyoleg_sulytartomany_min,
        row.csomag_egalizaltsag, row.csomag_target_suly,
        row.csomag_sulytartomany_max, row.csomag_sulytartomany_min,
        row.csomag_darabszam_egy_rekeszben,
        row.termek_egalizaltsag, row.termek_sulytartomany_max,
        row.termek_sulytartomany_min, row.termek_darabszam_egy_csomagban,
        existing.id,
      ]
    )
    return { id: existing.id, action: 'updated' as const }
  }

  const result = await execute(
    `INSERT INTO termek_erp_import
       (cikkszam_azonosito, cikkszam_statusz, termek_megnevezes, allatnev,
        fogyaszthatosagi_besorolas, hutottsegi_besorolas, csomagolas_tipus,
        ritualis_feldolgozas, gongyoleg,
        gongyoleg_egalizaltsag, gongyoleg_target_suly,
        gongyoleg_sulytartomany_max, gongyoleg_sulytartomany_min,
        csomag_egalizaltsag, csomag_target_suly,
        csomag_sulytartomany_max, csomag_sulytartomany_min,
        csomag_darabszam_egy_rekeszben,
        termek_egalizaltsag, termek_sulytartomany_max,
        termek_sulytartomany_min, termek_darabszam_egy_csomagban)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.cikkszam_azonosito, row.cikkszam_statusz, row.termek_megnevezes, row.allatnev,
      row.fogyaszthatosagi_besorolas, row.hutottsegi_besorolas, row.csomagolas_tipus,
      row.ritualis_feldolgozas, row.gongyoleg,
      row.gongyoleg_egalizaltsag, row.gongyoleg_target_suly,
      row.gongyoleg_sulytartomany_max, row.gongyoleg_sulytartomany_min,
      row.csomag_egalizaltsag, row.csomag_target_suly,
      row.csomag_sulytartomany_max, row.csomag_sulytartomany_min,
      row.csomag_darabszam_egy_rekeszben,
      row.termek_egalizaltsag, row.termek_sulytartomany_max,
      row.termek_sulytartomany_min, row.termek_darabszam_egy_csomagban,
    ]
  )
  return { id: result.insertId, action: 'inserted' as const }
}

export async function POST(request: Request) {
  const authError = await mxAuth(request)
  //if (authError) return authError

  try {
    const body = await request.json()
    const items: Partial<CikkszamBody>[] = Array.isArray(body) ? body : [body]

    if (items.length === 0) return apiError('Üres import lista', 400)

    const eredmenyek = []
    for (const item of items) {
      try {
        const r = await upsertOne(item)
        eredmenyek.push({ cikkszamAzonosito: item.cikkszamAzonosito, ...r })
      } catch (itemErr) {
        eredmenyek.push({
          cikkszamAzonosito: item.cikkszamAzonosito,
          action: 'error' as const,
          error: itemErr instanceof Error ? itemErr.message : 'Ismeretlen hiba',
        })
      }
    }

    const hibaVan = eredmenyek.some(e => e.action === 'error')

    // ── IT értesítő email — minden híváskor, a beérkezett cikkszám(ok)ról ──
    try {
      const azonositok = items.map(i => i.cikkszamAzonosito ?? '(hiányzó)')
      await sendMail({
        to: IT_ERTESITES_EMAIL,
        subject: `Cikkszám import — ${azonositok.length} tétel`,
        text:
          `Mx ERP cikkszám import érkezett.\n\n` +
          `Cikkszám azonosító(k):\n${azonositok.map(a => '- ' + a).join('\n')}\n\n` +
          `Eredmény: ${eredmenyek.map(e => `${e.cikkszamAzonosito ?? '(hiányzó)'} → ${e.action}`).join(', ')}`,
      })
    } catch (mailErr) {
      // Az email küldés hibája nem buktathatja el a tényleges importot
      console.error('mx/cikkszam email értesítés hiba:', mailErr)
    }

    // ── MQTT értesítés — NEWERPPLU;<cikkszamAzonosito> a vsz/system topicra ──
    for (const item of items) {
      try {
        await publishMqtt(MQTT_SYSTEM_TOPIC, `NEWERPPLU;${item.cikkszamAzonosito ?? ''}`)
      } catch (mqttErr) {
        console.error('mx/cikkszam MQTT értesítés hiba:', mqttErr)
      }
    }

    return Response.json(
      { success: !hibaVan, feldolgozva: eredmenyek.length, eredmenyek },
      { status: hibaVan ? 207 : 200 }
    )
  } catch (err) {
    console.error('mx/cikkszam POST hiba:', err)
    return apiError('Feldolgozási hiba', 500)
  }
}
