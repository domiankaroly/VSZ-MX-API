import { auth } from '@/lib/auth'
import { query, queryOne, execute } from '@/lib/db'
import { apiError } from '@/lib/utils'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultsag', 401)

  const { searchParams } = new URL(request.url)
  const tipus = searchParams.get('tipus') ?? 'lista'
  const aktiv = searchParams.get('aktiv') ?? '1'
  const id = searchParams.get('id')

  try {
    switch (tipus) {
      case 'lista': {
        const aktivFilter = aktiv === 'all' ? '' : ('where t_aktiv=' + (aktiv === '1' ? 1 : 0))
        const rows = await query(
          `SELECT termek.t_id,t_plu,tm_nev,ta_nev,megnevezes,csgo_nev,csmo_nev,t_neve,csom_megnevezes,t_halal,t_szorta,t_szorta_tol,t_szorta_ig,termek.t_kod,termek.t_hbsys_kod,termek.cs_id,termek.t_cikkszam,termek.csm_id,t_allat,t_mod,termek.t_vonalkod,termek.t_tipus,termek.m_id,termek.af_id,termek.t_sajat,termek.t_raktell,termek.t_rendelesre,termek.t_meresre,termek.t_jegyzet,termek.t_szavido,termek.t_sorrend,termek.t_egysegar,termek.csom_id,termek.t_feldolg,termek.t_cimke,termek.t_vonal_ar,termek.t_aktiv,termek.t_allateledel,termek.t_norma,termek.t_alap,t_penznem,t_csomagolas,t_raktar_termek_id,t_gep_id,csmo_szin,t_darabolo_kiad,t_min_dolgozo,termek.t_alap_norma,t_igeny_szorzo,t_szamla_hu,t_szamla_en,t_szamla_de,t_bizerba_plu,t_fagyasztos,t_lab,t_vasarolt,t_bizerba_layout,t_hely_plu,t_partner_plu,t_arazasi_ref FROM termek INNER JOIN csomagolas on termek.csom_id=csomagolas.csom_id INNER JOIN csomagolas_mo ON csom_mo_id=csmo_id inner join csomagolas_go on csgo_id=csom_go_id inner join termek_mod on t_mod=tm_id inner join termek_alap on t_alap=id inner join termek_allat on t_allat=ta_id ${aktivFilter} ORDER BY t_sorrend`
        )
        return Response.json({ data: rows, count: rows.length })
      }
      case 'egy': {
        if (!id) return apiError('id kotelezo', 400)
        const row = await queryOne(
          `SELECT termek.t_id,t_plu,tm_nev,ta_nev,megnevezes,csgo_nev,csmo_nev,t_neve,csom_megnevezes,t_halal,t_szorta,t_szorta_tol,t_szorta_ig,termek.t_kod,termek.t_hbsys_kod,termek.cs_id,termek.t_cikkszam,termek.csm_id,t_allat,t_mod,termek.t_vonalkod,termek.t_tipus,termek.m_id,termek.af_id,termek.t_sajat,termek.t_raktell,termek.t_rendelesre,termek.t_meresre,termek.t_jegyzet,termek.t_szavido,termek.t_sorrend,termek.t_egysegar,termek.csom_id,termek.t_feldolg,termek.t_cimke,termek.t_vonal_ar,termek.t_aktiv,termek.t_allateledel,termek.t_norma,termek.t_alap,t_penznem,t_csomagolas,t_raktar_termek_id,t_gep_id,csmo_szin,t_darabolo_kiad,t_min_dolgozo,termek.t_alap_norma,t_igeny_szorzo,t_szamla_hu,t_szamla_en,t_szamla_de,t_bizerba_plu,t_fagyasztos,t_lab,t_vasarolt,t_bizerba_layout,t_hely_plu,t_partner_plu,t_arazasi_ref FROM termek INNER JOIN csomagolas on termek.csom_id=csomagolas.csom_id INNER JOIN csomagolas_mo ON csom_mo_id=csmo_id inner join csomagolas_go on csgo_id=csom_go_id inner join termek_mod on t_mod=tm_id inner join termek_alap on t_alap=id inner join termek_allat on t_allat=ta_id WHERE termek.t_id=?`,
          [id]
        )
        return Response.json(row)
      }
      case 'csomagolas':
        return Response.json(await query('SELECT csom_id,csom_megnevezes FROM csomagolas WHERE csom_aktiv=1 ORDER by csom_megnevezes'))
      case 'allat':
        return Response.json(await query('SELECT ta_id,ta_nev FROM termek_allat'))
      case 'gepek':
        return Response.json(await query('SELECT g_id,g_name FROM gepek ORDER BY g_id'))
      case 'termek_alap':
        return Response.json(await query('SELECT id,megnevezes FROM termek_alap order by megnevezes'))
      case 'termek_mod':
        return Response.json(await query('SELECT tm_id,tm_nev FROM termek_mod'))
      case 'afa':
        return Response.json(await query('SELECT af_id,megnevezes FROM afa WHERE aktiv=1'))
      case 'termek_plu':
        return Response.json(await query("SELECT t_id,concat(t_plu,' - ' ,t_neve) as t_kiir FROM termek ORDER by t_neve"))
      case 'partner_lista':
        return Response.json(await query('SELECT p_id,p_nev,p_szallitasi_cim FROM partner_sz ORDER BY p_nev'))
      case 'partner_arak': {
        if (!id) return apiError('id kotelezo', 400)
        return Response.json(await query(
          'SELECT p_nev,pt_ar,dev_rovid,p_szallitasi_cim,pt_id FROM partner_sz INNER JOIN partner_sz_termek ON pt_p_id=p_id INNER JOIN deviza ON pt_penznem=dev_id WHERE pt_t_id=?',
          [id]
        ))
      }
      case 'cimke_jovahagyas': {
        if (!id) return apiError('id kotelezo', 400)
        return Response.json(await query(
          'SELECT f_neve,tc_datum from termek_cimke_jovahagyas inner join felhasznalok on tc_f_id=f_id WHERE tc_t_id=?',
          [id]
        ))
      }
      default:
        return apiError('Ismeretlen tipus', 400)
    }
  } catch (err) {
    console.error('aru-adat GET hiba:', err)
    return apiError('Adatbazis hiba', 500)
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultsag', 401)
  try {
    const b = await request.json() as Record<string, unknown>
    if (!b.t_id) return apiError('t_id kotelezo', 400)
    if (!b.t_neve) return apiError('A termek neve kotelezo', 400)
    if (b.t_allateledel && String(b.af_id) !== '27')
      return apiError('Ha allateledel, csak 27%-os AFA lehet!', 400)

    await execute(
      `UPDATE termek SET t_neve=?,t_szamla_hu=?,t_szamla_en=?,t_szamla_de=?,t_darabolo_kiad=?,t_allat=?,t_szorta=?,t_alap_norma=?,t_egysegar=?,t_min_dolgozo=?,t_szorta_tol=?,t_szorta_ig=?,t_igeny_szorzo=?,t_alap=?,t_vonalkod=?,t_tipus=?,t_mod=?,af_id=?,t_sajat=?,t_vasarolt=?,t_jegyzet=?,t_hely_plu=?,t_partner_plu=?,t_szavido=?,t_aktiv=?,csom_id=?,t_feldolg=?,t_csomagolas=?,t_fagyasztos=?,t_halal=?,t_lab=?,t_arazasi_ref=?,t_kod=?,t_hbsys_kod=?,t_allateledel=?,t_raktar_termek_id=?,t_gep_id=? WHERE t_id=?`,
      [b.t_neve,b.t_szamla_hu??'',b.t_szamla_en??'',b.t_szamla_de??'',b.t_darabolo_kiad??'',b.t_allat,b.t_szorta??0,b.t_alap_norma??0,b.t_egysegar??0,b.t_min_dolgozo??0,b.t_szorta_tol??0,b.t_szorta_ig??0,b.t_igeny_szorzo??1,b.t_alap,b.t_vonalkod??'',b.t_tipus??0,b.t_mod,b.af_id,b.t_sajat??0,b.t_vasarolt??0,b.t_jegyzet??'',b.t_hely_plu??'',b.t_partner_plu??'',b.t_szavido??0,b.t_aktiv??1,b.csom_id,b.t_feldolg??0,b.t_csomagolas??0,b.t_fagyasztos??0,b.t_halal??0,b.t_lab??0,b.t_arazasi_ref??'',b.t_kod??'',b.t_hbsys_kod??'',b.t_allateledel??0,b.t_raktar_termek_id??0,b.t_gep_id??0,b.t_id]
    )
    return Response.json({ ok: true })
  } catch (err) {
    console.error('aru-adat PUT hiba:', err)
    return apiError('Mentesi hiba', 500)
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultsag', 401)
  try {
    const b = await request.json() as Record<string, unknown>
    if (!b.t_neve) return apiError('A termek neve kotelezo', 400)
    if (b.t_allateledel && String(b.af_id) !== '27')
      return apiError('Ha allateledel, csak 27%-os AFA lehet!', 400)

    const result = await execute(
      `INSERT INTO termek (t_halal,t_neve,t_allat,t_szorta,t_alap_norma,t_igeny_szorzo,t_szorta_tol,t_szorta_ig,t_alap,t_vonalkod,t_tipus,t_mod,af_id,t_sajat,t_jegyzet,t_szavido,t_aktiv,csom_id,t_feldolg,t_csomagolas,t_kod,t_hbsys_kod,t_allateledel,t_raktar_termek_id,t_gep_id,t_darabolo_kiad,t_min_dolgozo,t_szamla_hu,t_szamla_en,t_szamla_de,t_egysegar,t_hely_plu,t_partner_plu,t_fagyasztos,t_lab,t_vasarolt,t_arazasi_ref) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.t_halal??0,b.t_neve,b.t_allat,b.t_szorta??0,b.t_alap_norma??0,b.t_igeny_szorzo??1,b.t_szorta_tol??0,b.t_szorta_ig??0,b.t_alap,b.t_vonalkod??'',b.t_tipus??0,b.t_mod,b.af_id,b.t_sajat??0,b.t_jegyzet??'',b.t_szavido??0,b.t_aktiv??1,b.csom_id,b.t_feldolg??0,b.t_csomagolas??0,b.t_kod??'',b.t_hbsys_kod??'',b.t_allateledel??0,b.t_raktar_termek_id??0,b.t_gep_id??0,b.t_darabolo_kiad??'',b.t_min_dolgozo??0,b.t_szamla_hu??'',b.t_szamla_en??'',b.t_szamla_de??'',b.t_egysegar??0,b.t_hely_plu??'',b.t_partner_plu??'',b.t_fagyasztos??0,b.t_lab??0,b.t_vasarolt??0,b.t_arazasi_ref??'']
    )
    await execute("UPDATE termek SET t_plu=t_id WHERE t_plu='' AND t_id=?", [result.insertId])
    return Response.json({ id: result.insertId }, { status: 201 })
  } catch (err) {
    console.error('aru-adat POST hiba:', err)
    return apiError('Mentesi hiba', 500)
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultsag', 401)
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id kotelezo', 400)
  try {
    const hasRendeles = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM rendeles_reszlet WHERE t_id=?', [id]
    )
    if ((hasRendeles?.cnt ?? 0) > 0)
      return apiError('A termek nem torolheto! Rendelesi tetelek kapcsolodnak hozza.', 409)
    await execute('DELETE FROM termek WHERE t_id=?', [id])
    return Response.json({ ok: true })
  } catch (err) {
    console.error('aru-adat DELETE hiba:', err)
    return apiError('Torlesi hiba', 500)
  }
}
