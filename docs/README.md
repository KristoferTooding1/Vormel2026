# Vormel 2026 — Dokumentatsioon

| [Kristofer Tooding] | Arendaja |

## Valitud serverivariant
**Render.com** — tasuta Static Site hosting

**Põhjendus:** Zone.ee VPS maksab ~5-10€/kuus. Render.com on 
tasuta, lihtne seadistada ja auto-deploy töötab kohe ilma 
SSH või serverita.

## Serverinfo
- **Platvorm:** Render.com
- **URL:** vormel2026.onrender.com
- **Publish directory:** public
- **Haru:** main
- **SSH seadistus:** ei ole vajalik — Render haldab ise

## Repo struktuur
- `public/index.html` — pealeht
- `public/style.css` — kujundus
- `public/script.js` — scroll animatsioonid
- `docs/README.md` — dokumentatsioon

## Probleemid ja lahendused
1. **Publish directory oli vale** — alguses `.`, muudeti `public` peale
2. **Auto-deploy ei töötanud alguses** — Settings'ist kontrolliti, 
   pärast manuaalset deploy'd hakkas automaatselt tööle
3. **HTML ei deployinud** — lahendus: tegi väikese muutuse 
   failis, pärast seda hakkas tööle

## Deploy testi tulemus
✅ Muutsin `public/index.html` → Render deployis automaatselt 
→ muutus ilmus veebilehel
