# MVP plaan: Vormel2026

## 1. Probleem ja kasutaja

Vormel2026 on mõeldud Formula 1 fännidele, kes tahavad ühest kohast kiiresti näha, millal on järgmine etapp, kuidas hooaeg on seni läinud ja kes meistrivõistlustel juhib.

## 2. MVP funktsioonid

### MVP-s kindlasti

- Järgmise etapi info (nimi, ringrada, kuupäev ja kellaaeg) koos countdown'iga
- Hooaja täielik kalender
- Etapi tulemused
- Sõitjate meistrivõistluste seis
- Konstruktorite meistrivõistluste seis

### Tuleb hiljem

- Etapi nädalavahetuse sessioonide ajakava (FP1–FP3, kvalifikatsioon, sprint)
- Sessioonide valik ja nende tulemused (kvalifikatsioon, sprint)
- Podium-vaade kolme parima piloodiga
- Riigilipud ja meeskondade värvid
- Aegade teisendus kasutaja ajavööndisse
- Caching backendis
- Docker ja deploy
- Kasutajakontod, lemmikmeeskond, teavitused
- Varasemate hooaegade ajalugu

### Miks just need

MVP vastab kolmele põhiküsimusele: "Millal on järgmine etapp?", "Mis eelmistel etappidel juhtus?" ja "Kuidas meistrivõistluste seis on?".

## 3. Kasutajalood

| ID | Kasutajalugu | Etapp |
|----|--------------|-------|
| US-1 | Kasutajana tahan näha järgmise etapi nime, ringrada ja countdown'i, et teaksin, millal järgmine võidusõit algab. | MVP |
| US-2 | Kasutajana tahan näha kogu hooaja kalendrit, et saaksin planeerida, millal vaatan. | MVP |
| US-3 | Kasutajana tahan avada etapi tulemused, et näha, kes võitis ja kuidas teised lõpetasid. | MVP |
| US-4 | Kasutajana tahan näha sõitjate edetabelit, et teada, kes meistrivõistlustel juhib. | MVP |
| US-5 | Kasutajana tahan näha konstruktorite edetabelit, et võrrelda meeskondi. | MVP |
| US-6 | Kasutajana tahan näha etapi nädalavahetuse sessioonide ajakava, et teada, millal on kvalifikatsioon ja sprint. | Hiljem |
| US-7 | Kasutajana tahan valida sessiooni ja näha selle tulemusi, et vaadata kvalifikatsiooni või sprindi tulemusi eraldi. | Hiljem |
| US-8 | Kasutajana tahan näha aegu oma ajavööndis, et ei peaks ise ümber arvutama. | Hiljem |


## 4. Hinnangud

Kasutame T-särgi suurusi: S = paar tundi, M = pool päeva kuni päev, L = mitu päeva.

| ID | Suurus | Põhjendus |
|----|--------|-----------|
| US-1 | M | Backend endpoint, kuupäeva võrdlus ja iga sekund uuenev countdown |
| US-2 | S | Üks endpoint ja lihtne nimekiri |
| US-3 | M | Tulemuste nested andmestruktuur ja DNF-i/puuduvate väljade käsitlemine |
| US-4 | S | Üks endpoint ja tabel |
| US-5 | S | Sama muster mis US-4 |
| US-6 | M | Tavalise ja sprindi-nädalavahetuse erinev struktuur |
| US-7 | L | Kolm erinevat tulemuste kuju (race, qualifying, sprint) |
| US-8 | S | Kuupäeva teisendus brauseris |

## 5. Kes mida teeb

Metoodika: [Scrum / Kanban]

| Tiimiliige | Roll metoodika järgi | Vastutusala |
|------------|----------------------|-------------|
| Kristofer | Product owner | backlog, prioriteedid, backend |
| Kristofer | Scrum master | koosolekud, frontend |
| Kristofer | Arendaja | disain, testimine |

## 6. Esimene sprint

Sprindi pikkus: 2 nädalat
Sprindi eesmärk: kasutaja näeb järgmist etappi, hooaja kalendrit ja ühe etapi tulemusi.

| Ülesanne | Vastutaja |
|----------|-----------|
| Backend: endpointid next-race, schedule ja results | Kristofer |
| Frontend: järgmise etapi plokk ja countdown | Kristofer |
| Frontend: kalendri nimekiri | Kristofer |
| Frontend: tulemuste vaade | Kristofer |
| README ja käivitusjuhend | Kristofer |

## 7. Valmis-definitsioon

Lugu on valmis, kui:

- [ ] kood on repos 
- [ ] kood on üle vaadanud
- [ ] lugu töötab lokaalselt käivitades (README juhendi järgi)
- [ ] vigased olukorrad (API ei vasta, tulemused puuduvad) on käsitletud
