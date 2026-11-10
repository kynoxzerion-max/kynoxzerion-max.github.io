# NEXUS — toteutusroadmap

## MVP-rajaus

Ensimmäinen toimitus todistaa yhtenäisen, offline-first NEXUS-kokemuksen. Siihen kuuluvat responsiivinen sovellusrunko, navigointi, demoprofiili, kolme progression-raitaa ja niiden laskettu kokonaislevel, paikalliset questit/aktiviteetit, keskeisten tuotealueiden klikattavat näkymät sekä JSON-varmuuskopio.

MVP ei sisällä verkkochatia, reaaliaikaisuutta, oikeita mediamuokkaimia, matchmakingia eikä yleistä synkronointia eri laitteiden välillä. Creator League on erillinen palvelupohjainen ominaisuus; Creator Studio -feed ja Messages-viestit ovat edelleen paikallisia.

## Nykytilanne

- **Valmis tässä aloitusversiossa:** Vite + React + TypeScript -pohja, hash-navigaatio, responsiivinen käyttöliittymä, kaikki päätason näkymät ja localStorage-v2-skeema sekä v1-migraatio.
- **Toimii paikallisesti:** XP→level-laskenta ja palkintojen milestone-katalogi, questit, streak, pelien hallinta ja pelisessiot, reaktio-/muisti-/kirjoitusminipelit, Kanban-projektit, yhteisön luonti ja jäsenyys, tapahtumat ja ilmoittautuminen, Creator Studio -videoluonnokset ja videotiedoston julkaisu, kuva-/videotarinat, profiili, kolme teemaa sekä JSON import/export.
- **Creator League -palvelussa:** sähköposti-/salasanatilit, UTC-kalenterin mukaiset neljän kuukauden kaudet (kolme kautta vuodessa), kirjautuneille näkyvä videofeed, uniikkien katsojien sitoutumisen ja katselulaadun mukaan painotettu tulostaulu, kauden achievement- ja top 10 -palkinnot, viikoittaiset creator-haasteet ja Clip Battle, Rising Creators sekä Global/Friends/Country-rankingit.
- **Tarkoituksella prototyypin ulkopuolella:** yleinen pilvisynkronointi ja usean käyttäjän yhteistyö; viestit ovat esittely, tarinat ovat vain paikallisia ja creator-mediamuokkaimet eivät ole vielä palveluja. League-tilien sähköpostivahvistus, salasanan palautus sekä julkisen tuotannon moderointi ja väärinkäytösten esto puuttuvat.
- **Creator League validoitu:** tuotantobuildi, kahden tilin yhteinen video-feed, videotiedoston range-streamaus, katselu-/laatuseuranta, tykkäys/kommentti/tallennus/jako, Creator-toimintojen deduplikointi, omaan videoon reagoinnin esto sekä painotetun tulostaulun päivitys.
- **Vielä validoitava:** mobiili-, tallennus-, import/export- ja offline-käyttäytyminen.

## Vaiheet

### 1 — Foundation

- [x] React + TypeScript + Vite -pohja
- [x] Responsiivinen layout, navigaatio, hakukenttä, toastit ja perustyylit
- [x] Hash-navigaatio ja suorat linkit näkymiin
- [ ] Jaetut modal-, toast-, notification- ja error-komponentit
- [ ] Saavutettavuuden auditointi ja automaattiset komponenttitestit

### 2 — Identity

- [x] Paikallinen profiili, avatar, nimi, käyttäjätunnus, bio, titteli ja kiinnostuksenkohteet
- [x] Profiilin yhteenveto ja progression-näkymä
- [ ] Avatarin, bannerin ja profiilin ulkoasun muokkaimet
- [ ] Kosmetiikkainventaarin tietomalli ja yksityisyysasetukset

### 3 — Progression

- [x] Creator/Gaming/Social 0–150 ja laskettu Total 0–450
- [x] Paikalliset questit, activity feed ja tason nosto demo-toiminnoista
- [x] ONE AETHERin XP-laskenta sekä sen milestone-, bonus-badge- ja bonus-title-katalogi; NEXUSin omat rewardit poistettu
- [ ] XP-tapahtumien pysyvä historia ja palkinnon avautumisilmoitukset
- [ ] Badge-, title-, theme- ja border-katalogi; aktiivisen palkinnon valinta
- [ ] Achievementit, streakit ja skill tree

### 4 — Gaming

- [x] Muokattava paikallinen pelikirjasto, tila, sessiot ja tavoite-eteneminen
- [x] Reaktio-, muisti- ja kirjoitusminipelit
- [ ] Pelien muistiinpanot, achievementit ja paikalliset ennätykset
- [ ] Turnausbracketit, kierrokset ja tulokset

### 5 — Creator

- [x] Creator Studio -näkymä sekä tekstiluonnosten luonti, muokkaus, poisto ja paikallinen tallennus
- [x] Creator-videon paikallinen julkaisu IndexedDB:hen ja lähteen mukainen päivittäinen XP-palkkio
- [ ] Mediasisällöt, luonnosten julkaisutilat ja Portfolio-sisällöt
- [ ] Thumbnail- ja photo-editorit kerroksineen ja exportilla
- [ ] Videoeditorin selaimessa toimiva tuonti, trimmaus, preview ja export
- [ ] Creator-portfolio ja analytiikka

### 6 — Creator League

- [x] UTC-kalenteriin sidotut neljän kuukauden kaudet (kolme vuodessa), sähköposti-/salasanatilit, yhteinen kirjautuneiden videofeed sekä Content 40% / Creator 25% / Quality 35% -pisteytys
- [x] Kausikohtaiset badge-, title- ja achievement-rajapyykit; top 10:n badge/title/border- ja top 3:n theme/trophy-kausipalkinnot
- [x] Kausirankin mukaiset pysyvät, uniikit kosmeettiset palkinnot ja animoidut title-/profiiliefektit
- [ ] Sähköpostin vahvistus, salasanan palautus, tuotannon moderointi ja väärinkäytösten esto
- [x] Viikoittaiset Creator Battles, äänestys, tulosten finalisointi sekä voittajan CLP- ja badge-palkinto; CLP-rankin 10 000 pisteen huippu ja rajaton all-time CLP-leaderboard
- [x] Viikoittaiset Creator Challenges, Rising Creators -ranking sekä Global/Friends/Country-leaderboard ja käyttäjänimipohjaiset kaveripyynnöt
- [x] Creator League -profiili, rankki-/divisioonaprogressi, Peak Rank sekä kausihistoria
- [x] Pronssi-, Hopea-, Kulta-, Platina-, Timantti-, Master-, Grandmaster- ja Legend IV–I -rankkikehykset, rankin mukaan avautuvat profiilikuvakehykset ja paikallinen valinta profiiliin
- [x] Rolling 30 päivän Creator Score, videokohtainen tasaisuuspainotus sekä erillinen Creator Level, Creator Rank ja Battle League Rank
- [x] Clippo-brändätty pääsivu, jossa Clippo Studio ja Creator League ovat erilliset vaihdettavat näkymät
- [ ] Kilpailujen vahvempi väärinkäytösten torjunta, sisällön moderointi ja palvelinpuolinen challenge-proof

### 7 — Communities

- [x] Paikallinen yhteisöjen luonti ja jäsenyys
- [ ] Roolit, säännöt, kanavat ja yhteisön feed
- [ ] Paikallinen feed, pollit, tapahtumat ja yhteisön leaderboard
- [ ] Omistajan banneri-, logo- ja väriasetukset

### 8 — Projects

- [x] Paikalliset projektit ja muokattava Kanban, tehtävien luonti/siirto/valmistuminen
- [ ] Jäsenet, roolit ja roadmap
- [ ] Collab Hub, taitoprofiilit, muistiinpanot ja yhteistyömaine

### 9 — Events + Challenges

- [x] Paikallisten tapahtumien luonti, kalenteri ja ilmoittautumiset
- [x] Daily/weekly-haasteiden paikallinen suorituksen kirjaus, XP ja kalenteriperusteinen uusiutuminen
- [ ] Tapahtumien luonti, osallistujat, aikataulu ja palkinnot
- [ ] Haasteiden ehtojen automaattinen todentaminen, seasonal-haasteet, tulostaulut ja palkintojen arkisto

### 10 — Discover

- [x] Discover-sivu sekä Creator-, Gaming-, Communities- ja Projects-sisääntulot
- [ ] Oikea haku sisällöistä ja käyttäjän hallittavat kiinnostukset
- [ ] Trending-, Rising- ja For You -syötteet paikallisella, selitettävällä pisteytyksellä
- [ ] Suositusten yksityisyyskontrollit

### 11 — Polish

- [x] Mobiilinavigaatio, pienet näkymät, focus-tyylit, reduced-motion-tuki ja kolme paikallista teemaa
- [ ] Loading-, empty- ja error-tilojen kattavuus
- [ ] Näppäimistö- ja ruudunlukijatestit
- [ ] Suorituskyky- ja selaintestit
- [x] IndexedDB-tallennus paikallisille kuva-/videotarinoille Messages-näkymässä
- [ ] Laajempi IndexedDB-repository, offline-käyttäytymisen testit ja migraatiot
- [x] PWA-manifesti, SVG-ikoni ja production service workerin offline app shell
- [ ] PWA:n asennuksen, cache-päivitysten ja offline-käytön selainvarmennus
- [ ] Backup/restore-testit vanhoille ja virheellisille tiedostoille

## Ennen pilvi- tai monikäyttäjäominaisuuksia

Palvelinversio vaatii tunnistautumisen ja valtuutuksen, käyttäjäkohtaisen datamallin, tietojen synkronoinnin ristiriitasäännöt, moderoinnin, roolipohjaisen oikeuksien hallinnan, auditoinnin sekä palvelinpuolen progression- ja kilpailusääntöjen validoinnin. Verkkoviestit, marketplace, live-stream ja matchmaking eivät kuulu paikalliseen MVP:hen.
