# NEXUS — tekninen arkkitehtuuri

## Tavoite

NEXUS on paikallisesti toimiva React + TypeScript -sovellus. Käyttöliittymä, profiili, eteneminen ja demosisältö eivät vaadi käyttäjätiliä tai omaa palvelinta; Creator League on rajattu poikkeus, jolla on erillinen palvelinpuolinen tili- ja tulostaulutoiminto.

## Nykyinen toteutus

- `src/App.tsx` sisältää sovelluksen rungon, hash-navigoinnin, näkymät, skeemavalidoinnin sekä paikallisten toimintojen käsittelijät.
- `src/data.ts` sisältää demoprofiilin, pelit, projektit, yhteisöt, tapahtumat ja navigaation.
- `src/types.ts` määrittelee profiilin, progression, projektien, pelien, creator-luonnosten ja tapahtumien tietotyypit.
- `src/styles.css` sisältää responsiivisen käyttöliittymän, teemat, pienpelit ja saavutettavuuden perustyylit.
- `public/manifest.webmanifest`, `public/nexus-icon.svg` ja `public/sw.js` määrittelevät PWA:n asennustiedot ja tuotannon offline app shell -välimuistin.
- Vite käynnistää kehityspalvelimen ja muodostaa tuotantobuildin.

## Tietovirta ja tilan omistajuus

`NexusState` on MVP:n sovellustilan lähde, mutta XP:n yhteinen totuuden lähde on saman alkuperän ONE AETHER `one-xp-v1`-tietue. Sovelluksen näkymät lukevat XP:n sovellustilasta; kelvollinen One Aether -tietue korvaa mahdollisen vanhan NEXUS-XP:n latauksessa ja päivittyy jokaisen XP-muutoksen yhteydessä. Muutokset myös välittyvät avoimien välilehtien välillä. XP:n säännöt käyttävät yhteistä kokonais-XP:tä sekä Activity-, Gaming-, Creator- ja Social-kategorioita. Kokonaislevel on `min(450, floor(total XP / 500) + 1)` ja kategoriatasot ovat Creator-, Gaming- ja Social-XP:lle `min(150, floor(category XP / 500) + 1)`. Kokonais-XP:n katto on 224 500 ja kunkin tason saavan kategorian katto 74 500 XP. XP-tapahtumista säilytetään viimeisimmät 100 historiariviä; tapahtumatunnisteet estävät saman palkinnon toistamisen.

Sovellustallennus toimii avaimella `nexus.local.v3` selaimen `localStorage`-rajapinnassa. Aiemmat `nexus.local.v1`- ja `nexus.local.v2`-profiilit migroidaan. XP-tietue käyttää ONE AETHERin yhteensopivaa `one-xp-v1`-avainta ja tietuemuotoa; sen kelpoisuus tarkistetaan ennen käyttöä, eikä virheellistä yhteistä tietuetta ylikirjoiteta. Tallennetut ja tuodut JSON-tiedot validoidaan ennen käyttöönottoa. Virheellinen tuonti ilmoitetaan käyttäjälle eikä se korvaa nykyistä tilaa. Export luo `nexus-backup.json`-tiedoston.

`localStorage` sopii nykyiseen pieneen demotilaan. XP-tietue säilyttää kategoriakohtaiset XP:t, paikallisen päivän laskurit, aktiiviset sekunnit, käytetyt tapahtumatunnisteet ja viimeisimmät 100 historiatapahtumaa ONE AETHERin `one-xp-v1`-muodossa. Jos yhteistä XP-tietuetta ei vielä ole, olemassa oleva NEXUS-XP alustaa sen; kun tietue on olemassa, se on ensisijainen ja NEXUSin päivitykset kirjoitetaan siihen. Näkyvää sovellusistuntoa kertyy enintään 60 sekuntia kutakin 30 sekunnin päivitystä kohden vain, kun välilehti on näkyvä, fokus on sovelluksessa ja käyttäjätoiminnosta on enintään viisi minuuttia; viiden minuutin aktiivisuudesta saa yhden Activity XP:n, enintään 250 päivässä. Viestin lähetys antaa 2 Social XP:tä enintään 20 viestistä päivässä. Yhteisöön liittyminen antaa 10 Social XP:tä. Kuva- ja videotarinat tallennetaan `nexus.media` IndexedDB -tietokantaan; tallennettu tarina antaa 10 Social XP:tä ja videotarinasta voi lisäksi saada 25 Creator XP:tä enintään kahdesti päivässä. Creator Studio -videoluonnoksen voi julkaista valitsemalla videotiedoston (enintään 100 Mt); tiedosto tallentuu samaan IndexedDB-tietokantaan, julkaisu antaa 25 Creator XP:tä ja jakaa videoiden kahden päivittäisen XP-palkkion rajan videotarinan kanssa. Gaming XP:tä kertyy vahvistetusta peliajasta 2 XP:tä per 10 minuuttia ilman päiväkohtaista ylärajaa. NEXUS hakee peliajan samasta alkuperästä kirjautuneena `/api/activity`-palvelusta ja Creator Battle -voitot `/api/social/creator-battles`-palvelusta (+500 Creator XP:tä voittoa kohti). Tapahtumat tunnistetaan uniikeilla tunnisteilla, joten säännöllinen synkronointi ei palkitse samaa voittoa uudelleen; API- tai kirjautumisvirheet näkyvät XP-näkymässä. Progression- ja XP-näkymät käyttävät ONE AETHERin reward-katalogia: kahdeksan päätason merkkipaalun titteliä, esinettä ja badgea sekä bonus-tittelit ja -badget. Profiilin saavutuksissa näkyvät lisäksi ensimmäinen lähetetty viesti, oman projektin luominen ja seitsemän päivän aktiivisuusputki; ehdot perustuvat NEXUSin paikallisiin keskusteluihin, käyttäjän projekteihin ja aktiivisuusputkeen. Alkutilan demoprojektit ja alkustreakki (0 päivää) eivät avaa saavutuksia. ONE AETHERin sallittujen profiiliteemojen tunnisteet löytyvät palvelinvalidoinnista, mutta niiden teemojen nimiä, tasovaatimuksia tai väripalettikatalogia ei löytynyt projektin lähdekoodista, joten niitä ei vielä peilata NEXUSiin. NEXUSin kategoriakohtaiset title-, badge-, theme- ja border-palkinnot on poistettu; vanhat profiilireunukset nollataan ja vanha palkintotitteli vaihdetaan viimeisimpään avattuun ONE AETHER -titteliin tilaa ladattaessa. Katalogi on NEXUSissa lähdekoodiin peilattu; päivitä kopio, jos ONE AETHERin reward-lähde muuttuu. Tarinat ja Creator-videot eivät vielä sisälly JSON-varmuuskopioon, eikä paikallisia viestejä tai Creator-julkaisuja toimiteta muille käyttäjille. Laajempi IndexedDB-repository lisätään ennen editoriprojektien tai muun kasvavan datan toteutusta.

## Creator League -palvelu

League on erillinen Node HTTP -palvelu (`server/creator-league.mjs`), jonka kehityspalvelin käynnistää yhdessä Viten ja puhelusignaloinnin kanssa. Vite välittää saman alkuperän `/api/creator-league`-pyynnöt oletuksena osoitteeseen `127.0.0.1:8788`. Julkaisussa reverse proxyn on reititettävä sama API-polku League-palvelimelle HTTPS:n kautta. Palvelin käyttää `LEAGUE_HOST`, `LEAGUE_PORT` ja `LEAGUE_DATA_DIR` -asetuksia.

Palvelin omistaa sähköposti-/salasanatilien, scrypt-salasanatiivisteiden, hashattujen seitsemän päivän istuntojen, UTC:n neljän kuukauden kausien, rankingien ja pisteytyksen totuuden. Kirjautunut käyttäjä voi lähettää videon (100 MiB, enintään kaksi päivässä); videot tallennetaan pysyvästi ja julkaistaan kirjautuneiden League-käyttäjien yhteisessä kausifeedissä. Score on painotettu yhdistelmä: Content 40%, Creator 25%, Quality 35%. Contentin sisällä uniikkien katselujen osuus on 15%, katseluminuuttien 25% ja tykkäysten, kommenttien, tallennusten sekä jakojen kunkin 15%. Kukin mittari skaalataan erikseen `min(100, ln(1 + määrä) / ln(1 + tavoite) * 100)`-kaavalla (tavoitteet: 2 000 katselua, 6 000 katseluminuuttia, 100 tykkäystä sekä 50 kommenttia/tallennusta/jakoa), mikä rajaa klikkien hyötyä. Quality on vähintään `min(3 sekuntia, videon kesto)` katsoneiden uniikkien katsojien yhteenlaskettu katseluaika jaettuna heidän katselujensa koko kestolla. Katsojan watch-timea ei lasketa yhdelle videolle enempää kuin videon keston verran. CreatorScore on julkaisuista (5 pistettä), haasteista (10), projekteista (5), yhteisöihin liittymisistä (5) sekä ryhmäviesteistä (10) kertyvä summa, rajattuna sataan; toimintoihin sovelletaan tyypin mukaisia päiväkattoja ja tunnisteiden deduplikointia. Oma katselu tai reagointi ei kasvata pisteitä, ja tykkäys/tallennus/jako lasketaan enintään kerran käyttäjää ja videota kohti; kommentteja voi jättää enintään kolme yhdelle videolle päivässä. Kausisaavutukset avautuvat kokonaispisteillä 10, 35 ja 60. Kausirajapyykit avaavat kausikohtaisia saavutuspalkintoja; kauden päätyttyä top 10 saa sijoituskohtaisen badge-, title- ja border-palkinnon ja top 3 saa lisäksi oman theme- ja trophy-palkinnon. Jokaisesta finalisoidusta kaudesta käyttäjän CLP-huipputaso antaa lisäksi pysyvän, kausikohtaisen rankkipalkinnon (Bronze–Challenger): yksilöllinen badge, title, kehys, teema tai profiiliefekti. Palkinnon nimi säilyttää kauden tunnisteen, se näkyy kausihistoriassa ja omissa ansaituissa palkinnoissa, ja animaatiot kunnioittavat reduced-motion-asetusta. Suljettujen kausien ansaitut palkinnot palautuvat käyttäjälle myös myöhemmillä kausilla.

Leaderboard tukee Global-, Friends- ja Country-näkymiä. CLP-tulostaulu järjestää tilit pysyvän Creator League Points -kokonaismäärän mukaan, joten sijoitus päivittyy myös korkeimman rankin jälkeen. Korkein rankki avautuu 10 000 CLP:llä, eikä pistekertymää katkaista siihen. Kaverit löytyvät käyttäjänimellä ja kaveripyynnöt hyväksytään tai hylätään; Country vaatii tilin luomisessa valinnaisesti tallennetun ISO-koodin. Rising Creators pisteyttää viimeisten seitsemän päivän julkaisuja niiden kasvun, sisällön sitoutumisen, laadun ja luojan aktiivisuuden perusteella. UTC-viikkotaulu luo teeman ja haasteet. Battleen hyväksytään enintään 100 uniikkia osallistujaa, yksi julkaisu tekijää kohti; osallistujamäärä ja raja palautetaan API:ssa, ja capacity-check tehdään atomisesti ennen submissionin lisäämistä. Käyttöliittymän Submit Clip -painike lataa valitun videotiedoston kirjautuneen käyttäjän tavallisen 100 MiB League-uploadin kautta feediin ja rekisteröi sen Battleen; olemassa olevan League-julkaisun voi myös valita. Community arviot creativity/editing-kriteereille asteikolla 1–5 sekä engagement- ja Quality-osuudet painotetaan suhteessa 30/30/20/20. Viikon päätyttyä vähintään yhden äänen saanut korkein Battle-submission tuottaa voittajalle 25 CLP:tä, Battle Winner -badgen ja Creator-score-toiminnon. Viikoittaiset haasteet sidotaan omaan saman kauden videojulkaisuun, kestovaatimukseen sekä käyttäjä-/viikkokohtaiseen deduplikointiin; onnistunut suoritus antaa 10 Creator-kausipistettä, 25 paikallista Creator XP:tä ja haastebadgen.

League-profiilin CLP-pisteet avaavat rankit Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster ja Challenger; jokaisessa on neljä divisioonaa IV–I. Bronze IV alkaa 200 CLP:stä; alle 200 pisteellä käyttäjän rankki on Unranked ja edistymispalkki näyttää pisteet Bronze IV:n rajaan. Rajat ovat kaikki tasaisia 100 CLP:n monikertoja Bronze IV:n 200 pisteestä Challenger I:n 10 000 pisteeseen, minkä jälkeen rankki pysyy Challenger I:nä. CLP-pisteet jatkavat kasvuaan 10 000:n jälkeen ja CLP-leaderboard käyttää koko pistekertymää, joten kärjen sijoitukset pysyvät päivittyvinä. Profiilikehysten avausrajat käyttävät samaa asteikkoa: ensimmäinen Bronze IV -kehys avautuu 200 CLP:llä ja viimeinen Legend 1 -kehys 10 000 CLP:llä. Palvelin säilyttää vanhat tallennetut Rating-luvut CLP-saldoina ja tallentaa niiden lisäksi erillisen monotonisesti kasvavan Peak-saldon sekä kausittaiset parhaan rankin tallenteet, kun kausi finalisoidaan. Rankkiprofiili näyttää CLP-edistymisen, kauden leaderboard-sijoituksen, Peak Rankin ja aikajärjestyksessä Season Historyn. Ennen rankkihistorian käyttöönottoa suljettujen kausien profiilirankkeja ei voi johtaa vanhasta datasta luotettavasti; niitä ei täydennetä arvauksilla. CLP-pisteille ei tällä hetkellä ole lasku- tai decay-sääntöä.

Profiilin Bronze IV–I-, Silver IV–I-, Gold IV–I-, Platinum IV–I-, Diamond IV–I-, Master IV–I-, Grandmaster IV–I- ja Legend IV–I -avatarikehykset avautuvat tilin palvelinpuolisen Peak CLP:n mukaan. Kehysdivisioonien CLP-vaatimukset käyttävät samaa 100 CLP:n välein pyöristettyä asteikkoa kuin rankit: ensimmäinen kehys alkaa 200 CLP:stä ja Legend 1 avautuu 10 000 CLP:llä; CLP-kertymää ei rajata ylimmän kehyksen avaamiseen. Avatut kehykset voi valita paikallisen NEXUS-profiilin ympärille. Rankkikehykset piirretään skaalautuvana SVG-taiteena: metallireunat ja jalokivet täydentyvät divisioonan mukaan, ja kaikkien rankkien pienet lehdet kiinnittyvät tasaisin välein symmetrisille oksille yhtenä jonona renkaan ulkoreunaa kiertäen, eivätkä asetu renkaan sisälle. Legend-kehyksissä on violetti hehku, kultayksityiskohdat, kiertävä reunuksen valokaari, liikkuvat tuikkivat valopisteet sekä kehyksen ympärillä leijuvat, fasetoidut violetit kristallit; lehtien ja kristallien määrä kasvaa divisioonan mukaan. Grandmaster-kehyksissä on käyttäjän toimittaman mallin mukainen punainen metallirengas, kultareunaiset jalokivet, kruunu sekä profiilikuvan ympärille sijoitettu lehväympyrä. Kehysanimaatiot pysähtyvät käyttöjärjestelmän vähennetyn liikkeen asetuksella. Kehysvalinta tallentuu laitteen profiilidataan, kun taas rankin avautumisen totuus tarkistetaan League-palvelimelta.

Creator Score on tästä erillinen kilpailumittari: palvelin laskee sen liukuvasta viimeisten 30 päivän ikkunasta, enintään 10 000 pisteeseen. Jokainen video pisteytetään erikseen nykyisellä 40/25/35 Content/Creator/Quality-kaavalla; vähintään 20/100 pistettä saaneet videot kelpaavat scoreen. Creator Score = kelpuutettujen videoiden keskiarvo × 65% + tasaisuus × 25% + viimeaikaiset Creator-toiminnot × 10%. Tasaisuus kasvaa lineaarisesti 10 kelpuutettuun videoon saakka (yksi yksittäinen julkaisu ei siis voi saada tästä osuutta kuin 1/10); toiminto-osuus käyttää logaritmista normalisointia 100 action pointiin. Ranking listataan saman Global/Friends/Country-scope-valinnan mukaan. Creator Rank määräytyy scoresta viidessä tasossa (Rookie, Rising, Skilled, Elite, Visionary), kussakin divisioonat III–I, välillä 0–10 000. Lifetime Creator Level (0–150) on erillinen ONE AETHER -XP-progression arvo, eikä sitä lisätä Creator Scoreen. Kausipalkintojen kausitulostaulu käyttää edelleen erillistä kausiscorea; sitä ei pidä sekoittaa rolling Creator Scoreen. Battle League Rank perustuu CLP-pisteisiin ja CLP:n huipputaso on 10 000; tämä rankkiprogressio ei rajoita CLP-leaderboardin pistekertymää.

Katselutapahtumat mitataan kirjautuneiden käyttäjien videotoistosta. Palvelin hyväksyy vain kohtuullista, etenevää katseluprosessia ja rajoittaa mittausaskelta palvelimen kellolla; seekkausta ei lueta katseluajaksi. Videon kesto luetaan selaimessa ja lähetetään uploadin mukana, eikä palvelin vielä pura tai validoi tiedoston media-metadataa; muokattu asiakas voi väärentää sen tai toimintosignaaleja. League-toiminnot kuten tykkäys ja kommentti ovat palvelimella yksilöllisiä käyttäjätunnisteita vasten. Creatorin haaste-, projekti-, yhteisö- ja ryhmäviestisignaalit tulevat nykyisin NEXUSin paikallisista UI-toiminnoista ja palvelin deduplikoi/rajoittaa niitä, mutta selain voi periaatteessa lähettää väärennettyjä toimintosignaaleja. Paikalliset ryhmäkeskustelut eivät todista oikeaa monikäyttäjäyhteistyötä. Väärinkäytösten torjuntaa ja toimintosignaalien vahvempaa server-side todentamista tarvitaan ennen kilpailullisesti korkean panoksen tuotantoa.

Tiedostot ja JSON-data säilytetään `LEAGUE_DATA_DIR`-kansiossa; kansio sisältää henkilötietoja ja käyttäjäsisältöä, joten sen käyttöoikeudet, pysyvyys ja varmistus ovat ylläpitäjän vastuulla.

Nykyinen toteutus ei tarjoa sähköpostivahvistusta, salasanan palautusta, ylläpitotyökaluja, moderointia tai pysyvää tietokantaa. JSON-tallennus ja prosessinsisäiset pyyntörajoittimet soveltuvat kokeiluun, eivät monipalvelin- tai julkisen tuotannon käyttöön ilman lisätoimia. Palkinnot näytetään League-kortin ansaittujen palkintojen listassa; niitä ei vielä siirretä NEXUSin yleiseen kosmetiikkainventaarioon tai profiilin teeman/kehyksen valintaan.

Developer Console näkyy My Profile -sivun lopussa, mutta ylläpitotoiminnot avautuvat vain palvelimen developer-istunnon jälkeen. Paikallisessa kehityksessä ensimmäinen loopback-käyttäjä luo sähköpostitunnuksen ja vähintään 12 merkin salasanan Consolesta; tunnukset tallennetaan palvelimen League-datakansioon scrypt-tiivisteenä (`developer-credentials.json`), ja ensiasetus poistuu käytöstä luonnin jälkeen. Ensiasetus ei ole sallittu tuotannossa tai etäyhteyksistä. Isännöidyssä palvelussa käytetään `NEXUS_DEVELOPER_EMAIL`- ja `NEXUS_DEVELOPER_PASSWORD`-ympäristömuuttujia; älä tallenna salasanoja lähdekoodiin tai versionhallintaan. Kirjautuminen rajoitetaan palvelimella ja käyttää kahdeksan tunnin HttpOnly/SameSite-istuntoevästettä. Istunnot ovat prosessimuistissa ja päättyvät palvelimen uudelleenkäynnistyksessä. Console muuttaa XP:tä, paikallisia saavutuksia/kehyksiä, valittua titteliä ja sovellusteemaa vain selaimen tallennetussa profiilissa. Ranked-kausipalkintojen avaus näyttää paikallisen esikatselun, eikä muuta Creator League -palvelimen rankkeja tai tilille pysyvästi tallennettuja palkintoja.

## Tavoiterakenne

MVP pitää ydinkoodin pienenä. Kun ominaisuuksia syvennetään, rakenne erotellaan asteittain:

```text
src/
  app/             reititys, layout, sovelluksen konteksti
  components/      jaetut käyttöliittymäkomponentit
  features/
    progression/   levelit, palkinnot, saavutukset, streakit
    profile/       profiili, avatar, kosmetiikka
    creator/       julkaisut, luonnokset, työkalut
    gaming/        pelikirjasto, minipelit, turnaukset
    social/        yhteisöt, viestit, ilmoitukset
    projects/      tiimit, tehtävät, roadmap, Kanban
    events/        tapahtumat ja ilmoittautumiset
    challenges/    daily-, weekly- ja seasonal-haasteet
  data/            seed-data ja paikalliset fixturet
  services/        tallennus, import/export, myöhempi synkronointi
  store/           versionoitu sovellustila
  styles/          design tokenit ja globaalit tyylit
```

Kun eriytys tehdään, ominaisuusmoduulit käyttävät jaettuja progression-, profiili-, data- ja ilmoituspalveluja. Ominaisuuden ei pidä päivittää kokonaisleveliä, palkintoinventaaria tai paikallista tallennusta omalla rinnakkaisella toteutuksellaan.

## Progression ja palkinnot

- Creator, Gaming ja Social ovat erillisiä kokonaislukutasoja välillä 0–150.
- Total Level lasketaan kokonais-XP:stä (`min(450, floor(total XP / 500) + 1)`).
- Level ja League pidetään erillään: level on pitkäaikainen, League kausittainen kilpailusijoitus.
- Yhteiseen progression-palveluun lisätään myöhemmin XP-tapahtumien lähde, tasokäyrä, versionoitu reward-katalogi, lunastetut palkinnot ja duplikaattien esto.
- XP-palkintojen validointi ja väärinkäytön esto vaativat luotetun palvelimen ennen verkkokilpailuja.

Käytössä oleva reward-katalogi peilaa ONE AETHERin XP-näkymän tasopalkintoja. Palkintojen palvelinpuolinen validointi ja väärinkäytön esto vaativat edelleen luotetun palvelimen ennen verkkokilpailuja.

## Offline-first, tietosuoja ja synkronointi

Nyt käyttäjän tila tallennetaan vain selaimen alkuperän alle. Sovellus ei lähetä profiilia, aktiviteetteja tai backup-tietoja verkkoon. Ulkoisia fontti- tai kuvapalveluja ei tarvita sovelluksen toimintaan.

Profiilibannerin JPG-, PNG- ja WebP-kuvat muunnetaan selaimessa pakatuksi JPEG-dataksi (enintään 1600 × 600 px ja 450 KiB) ennen tallennusta profiilin paikalliseen tilaan. Banneri sisältyy paikalliseen NEXUS-varmuuskopioon.

Seuraava tallennusvaihe:

1. Määritä versionoidut tietueet ja migraatiot.
2. Lisää IndexedDB-repository mediatiedostoille ja kasvaville listoille.
3. Käytä `localStorage`-tallennusta vain pieniin asetuksiin tai repositoryn asetuksiin.
4. Tee import atomiseksi: validoi koko paketti, näytä palautuksen vaikutus ja ota käyttöön vasta käyttäjän vahvistuksen jälkeen.
5. Lisää tietojen vienti, poistaminen ja palautuminen virheestä näkyvin ilmoituksin.

Tuotantoversio rekisteröi service workerin, joka välimuistittaa app shellin ja onnistuneet saman alkuperän GET-pyynnöt. Ristiriitojen välttämiseksi tätä pitää jatkossa testata versionvaihdon yhteydessä; cache ei ole varmuuskopio käyttäjän datasta.

## Käynnistys ja build

```powershell
npm install
npm run dev
```

Tuotantobuild:

```powershell
npm run build
```

Vite-projektin sovelluslähde on `src/`; `dist/` tuotetaan buildillä eikä sitä ylläpidetä käsin.
