# Stichting Delftsche Opera Compagnie (DOC) - Website

De officiële website voor **Stichting Delftsche Opera Compagnie**, gebouwd met [Astro](https://astro.build) en geoptimaliseerd voor hosting op [Cloudflare Pages](https://pages.cloudflare.com).

---

## 🚀 Aan de slag

### Vereisten
- [Node.js](https://nodejs.org) (v18 of nieuwer)
- `npm`

### Lokaal opstarten
1. Installeer dependencies (eenmalig):
   ```bash
   npm install
   ```
2. Start de lokale ontwikkelserver:
   ```bash
   npm run dev
   ```
3. Open je browser op [http://localhost:4321](http://localhost:4321).

---

## 📝 Content bewerken & nieuwe pagina's toevoegen (zonder code)

### 1. Een nieuwe pagina toevoegen
Elk Markdown (`.md`) bestand in `src/content/pages/` wordt automatisch een volwaardige webpagina met de juiste lay-out, navigatie en footer!

Voorbeeld: Maak `src/content/pages/sponsoring.md`:
```markdown
---
title: "Sponsoring & Donaties"
description: "Draag bij aan de monumentale producties van Stichting DOC."
---
Hier schrijf je gewoon de tekst van de pagina. Je kunt tussenkopjes (`##`), lijstjes (`-`) en links gebruiken.
```
Deze pagina is direct bereikbaar via `/sponsoring`!

### 2. Een nieuwe productie toevoegen
Maak een nieuw bestand in `src/content/producties/` (bijv. `2026-nieuwe-opera.md`):
```markdown
---
titel: "Nieuwe Opera"
jaar: 2026
afbeelding: "/images/producties/nieuwe-opera.jpg"
quote: "Een overdonderend succes!"
quoteBron: "Delftsche Courant"
recensieUrl: "https://example.com/recensie"
volgorde: 1
---
Beschrijving van het project, dirigent, solisten en orkest...
```

### 3. Visuele browser-editor (Keystatic CMS)
Tijdens het draaien van `npm run dev` kun je surfen naar [http://localhost:4321/keystatic](http://localhost:4321/keystatic). Hier vind je een visuele editor (vergelijkbaar met Notion/Google Docs) waarin je formulieren invult en afbeeldingen uploadt. Wijzigingen worden direct weggeschreven als Markdown-bestanden.

### 4. Bestuursleden en Raad van Toezicht aanpassen
- Bestuur: `src/data/bestuur.json` (namen, functies, e-mailadressen)
- Organisatie & RvT: `src/data/organisatie.json` (doelstelling, leden RvT, KvK/RSIN)

---

## 🎨 Aanstaande Rebranding & Nieuwe Huisstijl

Zodra de nieuwe branding en stijlgids klaar zijn, hoef je **geen pagina's of componenten te herschrijven**. 

Open `src/styles/tokens.css` en pas de centrale variabelen aan:
```css
:root {
  /* Pas hier de nieuwe hoofdkleur aan */
  --color-primary: #07996f;
  --color-primary-hover: #057a58;
  
  /* Pas hier de nieuwe header- en achtergrondkleuren aan */
  --color-header-bg: #4f474e;
  
  /* Pas hier de nieuwe lettertypen aan */
  --font-heading: 'Roboto Condensed', sans-serif;
  --font-body: 'Open Sans', sans-serif;
}
```
De gehele website neemt direct automatisch de nieuwe huisstijl over!

---

## ☁️ Publiceren naar Cloudflare Pages

1. Push dit project naar een GitHub repository:
   ```bash
   git add .
   git commit -m "Initiële Astro opzet voor Stichting DOC"
   git remote add origin git@github.com:JOUW-ORG/delftscheopera-website.git
   git push -u origin main
   ```
2. Ga in het Cloudflare Dashboard naar **Workers & Pages** &rarr; **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
3. Selecteer je repository en kies de volgende instellingen:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Klik op **Save and Deploy**. Cloudflare Pages bouwt en host de website wereldwijd met automatische SSL en previews voor elke pull request.
