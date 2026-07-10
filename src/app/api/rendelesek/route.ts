import { auth } from '@/lib/auth'
import { query } from '@/lib/db'
import { apiError } from '@/lib/utils'

// A Rendelesek.cs Rendeles_Load() metódusának 4 lekérdezése — változtatás nélkül

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return apiError('Nincs jogosultság', 401)

  const { searchParams } = new URL(request.url)
  const p1 = searchParams.get('p1') // szallitas_datum tól (pl. "2024.01.15.")
  const p2 = searchParams.get('p2') // szallitas_datum ig
  const tab = searchParams.get('tab') ?? '1' // melyik grid adatát kéri

  if (!p1 || !p2) return apiError('p1 és p2 dátum kötelező', 400)

  try {
    switch (tab) {
      // ── Tab 1: Fő rendelések lista (c1TrueDBGrid1) ─────────────────────────
      case '1': {
        const rows = await query(
          `SELECT rend_id,rend_sorszam,(select GROUP_CONCAT(sz_szszam) from szamla_0 where sz_rendeles=rend_id and left(sz_szszam,1)='D' group by sz_rendeles) as dijbekero,rend_helyesbitett,rend_szeloleg,rend_szszam,rend_datum,szallitas_datum,IF(rend_kirakva=0,'NEM','IGEN') as kirakva,rend_raktar_tol,rend_raktar_ig,rend_csom_tol,rend_csom_ig,rend_auto,(select cmr_rendszam from cmr_sablon where rend_cmr=cmr_id) as cmr,(select cmr_rend_info from cmr_sablon where rend_cmr=cmr_id) as cmrinfo,p_kod,p_nev,if(p_lerako_id=10415,'BILK','') as hernad,if (rend_aktiv=1,'Igen','Nem') as rend_aktiv,if (rend_tip=1,'Igen','Nem') as rend_tipp,if (web_confirm=2,'Igen','Nem') as rend_confirm,IF(web_confirm=0,'Rögzített','Másolt') as masolt,web_jegyzet,IF(web_jegyzet='','','IGEN') as jegyzetvan,p_email,t_nev,rend_brutto,dev_rovid,r_statusz,web_confirm,rend_raktar_tol,rend_raktar_ig,IF(rend_hivas_status=1,'OK','') as hstatusz,left(rend_hivas_ido,19) as rend_hivas_ido,rendeles.tura_id,(select IF(count(rk_id)!=0,'FAGY','') from raktar_keszlet inner join termek on rk_t_id=t_id where t_fagyasztos=1 and rk_rendeles=rendeles.rend_id) as fagylot FROM rendeles INNER JOIN partner_sz ON rendeles.p_id=partner_sz.p_id INNER JOIN tura on rendeles.tura_id=tura.t_id INNER JOIN deviza ON rendeles.dev_id=deviza.dev_id WHERE  szallitas_datum>=? AND szallitas_datum<=? AND rend_aktiv=1 ORDER BY szallitas_datum DESC,rend_sorszam DESC`,
          [p1, p2]
        )
        return Response.json({ data: rows, count: rows.length })
      }

      // ── Tab 2: Darabóló nézet (c1TrueDBGrid2) ──────────────────────────────
      case '2': {
        const rows = await query(
          `select szallitas_datum,rendeles_reszlet.rr_id,tura.t_nev,p_nev,megnevezes,t_plu,t_neve,menny as suly,if(rendeles.dev_id=1,egysegar,egysegar*(select ar_arfolyam from arazas where ar_datum<=szallitas_datum and ar_datumig>=szallitas_datum)) AS egysegar,if(rend_tip=0,'NEM','IGEN') as tip  from rendeles inner join rendeles_reszlet on rendeles.rend_id=rendeles_reszlet.rend_id inner join tura on tura.t_id=rendeles.tura_id inner join termek_alap on termek_alap.id=rendeles_reszlet.rr_t_alap inner join termek on rendeles_reszlet.t_id=termek.t_id inner join csomagolas on rendeles_reszlet.csom_id=csomagolas.csom_id inner join partner_sz on rendeles.p_id=partner_sz.p_id where p_dolgozo=0 and (szallitas_datum>=? AND szallitas_datum<=?)  AND rend_aktiv=1  and darablevon=1 order by id,tura.t_sorrend`,
          [p1, p2]
        )
        return Response.json({ data: rows, count: rows.length })
      }

      // ── Tab 3: LOT lista (c1TrueDBGrid3) ───────────────────────────────────
      case '3': {
        const rows = await query(
          `select rend_id,szallitas_datum,rend_sorszam,p_nev,'' as LOT from rendeles inner join partner_sz on rendeles.p_id=partner_sz.p_id where p_dolgozo=0 and (szallitas_datum>=? AND szallitas_datum<=?)  AND rend_aktiv=1  order by rend_sorszam`,
          [p1, p2]
        )
        return Response.json({ data: rows, count: rows.length })
      }

      // ── Tab 4: Raktár lista (c1TrueDBGrid4) ────────────────────────────────
      case '4': {
        const rows = await query(
          `select szallitas_datum,rendeles_reszlet.rr_id,rend_sorszam,tura.t_nev,if(rend_elvivos=1,'IGEN','NEM') as ertejovos,p_nev,megnevezes,t_plu,t_neve,csmo_nev,round((menny),2) as suly,csom_netto/1000 as rk,if(t_keszitos=1,'IGEN','NEM') as keszitos,if(rendeles.dev_id=1,egysegar,egysegar*(select ar_arfolyam from arazas where ar_datum<=szallitas_datum and ar_datumig>=szallitas_datum)) AS egysegar,round((menny),2)*if(rendeles.dev_id=1,egysegar,egysegar*(select ar_arfolyam from arazas where ar_datum<=szallitas_datum and ar_datumig>=szallitas_datum)) as ertek,if(rend_tip=0,'NEM','IGEN') as tip,sz_fizhat,rend_raktar_tol,rend_raktar_ig,rend_csom_tol,rend_csom_ig,(select fm_nev from fizmod where fm_id=p_fizmod) as fizmod,p_szallitasi_cim  from rendeles inner join rendeles_reszlet on rendeles.rend_id=rendeles_reszlet.rend_id inner join tura on tura.t_id=rendeles.tura_id inner join termek_alap on termek_alap.id=rendeles_reszlet.rr_t_alap inner join termek on rendeles_reszlet.t_id=termek.t_id inner join csomagolas on rendeles_reszlet.csom_id=csomagolas.csom_id inner join csomagolas_mo on csom_mo_id=csmo_id inner join partner_sz on rendeles.p_id=partner_sz.p_id where p_dolgozo=0 and (rend_raktar_tol>=? AND rend_raktar_ig<=?)  AND rend_aktiv=1   order by id,tura.t_sorrend`,
          [p1, p2]
        )
        return Response.json({ data: rows, count: rows.length })
      }

      default:
        return apiError('Ismeretlen tab: ' + tab, 400)
    }
  } catch (error) {
    console.error('Rendelesek API hiba (tab=' + tab + '):', error)
    return apiError('Adatbázis hiba', 500)
  }
}
