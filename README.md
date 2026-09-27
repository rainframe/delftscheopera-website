# delftscheopera.nl

Website van **Stichting Delftsche Opera Compagnie**, die naar buiten treedt als **Delftsche Opera**.
De site vervangt stichtingdoc.nl en is gebouwd met [Astro](https://astro.build) als volledig statische site:
Nederlands op `/`, Engels onder `/en/`.

## Snel starten

Nodig: [Node.js](https://nodejs.org) 22 of nieuwer.

```sh
npm install        # eenmalig
npm run dev        # ontwikkelserver op http://localhost:4321
npm run build      # bouwt de site in dist/
npm run preview    # bekijk de gebouwde site
npm run check      # controleert types, content en de CMS-configuratie
npm run format     # zet de code netjes (Prettier)
```

Na `npm run build` meldt de build welke pagina's nog **placeholders** bevatten: alinea's die in de
content met `TODO:` beginnen en op de site als geel blok verschijnen. Die moeten weg zijn voordat de
site live gaat.

## Hoe de site in elkaar zit

```
src/
  content/                 ← alle teksten en gegevens (dit is wat redacteuren aanpassen)
    nieuws/{nl,en}/        ← nieuwsberichten, één Markdown-bestand per bericht
    projecten/{nl,en}/     ← producties op de projectenpagina
    mensen/                ← bestuur, Raad van Toezicht en artistiek team (één YAML-bestand per persoon)
    pages/                 ← teksten van vaste pagina's, met een nl:- en en:-blok
    settings/site.yml      ← adres, KvK, RSIN, e-mail, sociale media, IBAN, nieuwsbrief
  assets/
    uploads/               ← foto's die in de content gebruikt worden
    brand/                 ← logo's (navy en wit)
    decor/                 ← bladmuziek, silhouetten van Delft
  components/              ← bouwstenen (gordijnlijst, banner, kaarten, header, footer, …)
  views/                   ← de pagina's, gedeeld door de Nederlandse en Engelse route
  pages/                   ← routes (bepalen de URL's)
  i18n/                    ← vaste interface-teksten (ui.ts) en URL's per taal (routes.ts)
public/admin/              ← het beheer (Sveltia CMS): index.html, config.yml en preview.css
worker/index.ts            ← Cloudflare Worker: alleen het inloggen in het beheer (/cms/*)
scripts/                   ← hulpscripts (CMS kopiëren, CMS-configuratie controleren)
docs/                      ← handleiding voor redacteuren
  styles/global.css        ← kleuren, lettertypes en basisstijlen
  content.config.ts        ← het contentmodel (welke velden verplicht zijn)
```

### Ontwerp

- Kleuren: navy `#042d64` en wit (huisstijl).
- Lettertypes: koppen in **League Spartan** (meegeleverd via Fontsource), al het andere in Helvetica/Arial.
- Het theatergordijn uit het logo is het terugkerende element: `Curtain.astro` is één gordijn,
  `CurtainFrame.astro` zet gordijnen over een foto, `StageBanner.astro` is de grote lustrum-banner.
- De logo's staan in `src/assets/brand/`. Als de officiële SVG-bestanden er zijn, kunnen die daar de
  PNG's vervangen (en de imports in `Header.astro`, `Footer.astro`, `StageBanner.astro` en
  `ContactPage.astro` aangepast).

### Talen

- Nederlands is de hoofdtaal. Vaste pagina's hebben een Engelse versie; ontbrekende Engelse teksten
  vallen automatisch terug op het Nederlands.
- Nieuwsberichten mogen alleen Nederlands zijn. Op de Engelse nieuwspagina verschijnen die met het label
  _In Dutch only_. Voor een vertaling zet je een bestand met **dezelfde naam** in `src/content/nieuws/en/`.
- URL's per taal staan in `src/i18n/routes.ts`, knoppen en labels in `src/i18n/ui.ts`.

## Het beheer (CMS)

Redacteuren werken in het beheer op **https://delftscheopera.nl/admin/**, gebouwd met
[Sveltia CMS](https://sveltiacms.app). Zij loggen in met een (gratis) GitHub-account; elke keer dat ze
opslaan, maakt het beheer een commit op `main` en bouwt Cloudflare de site opnieuw. De handleiding
voor redacteuren staat in [docs/handleiding-redacteuren.md](docs/handleiding-redacteuren.md).

- **Configuratie**: [public/admin/config.yml](public/admin/config.yml). De velden moeten kloppen met
  `src/content.config.ts`; `npm run check` (of `npm run check:cms`) controleert dat, en ook dat geen
  enkel veld in de content ontbreekt in de configuratie (het CMS zou zo'n veld bij opslaan wissen).
- **Versie**: het CMS komt uit `node_modules` en wordt bij `npm run dev` en `npm run build`
  naar `public/admin/` gekopieerd (niet in git). Bijwerken: `npm update @sveltia/cms`.
- **Foto's** gaan naar `src/assets/uploads/` en worden als `/src/assets/uploads/…` in de content
  gezet. Astro optimaliseert ze bij het bouwen; een kleine plug-in in `astro.config.mjs` zorgt dat dit
  ook werkt voor foto's midden in een bericht.
- **Opmaak**: de teksteditor van het CMS schrijft cursief als `_tekst_` en zet een lege regel na
  tussenkoppen. Houd die stijl aan als je content met de hand bewerkt; anders lijkt het in het beheer bij het
  openen alsof er al iets gewijzigd is.
- **Inloggen** loopt via de worker (`/cms/auth` en `/cms/callback`), zie _Publiceren_ hieronder.

### Het beheer lokaal testen

- **Zonder GitHub**: start `npm run dev` en open http://localhost:4321/admin/index.html?test. Het beheer
  draait dan op een leeg, virtueel bestandssysteem in je browser; je echte bestanden blijven onaangeroerd.
- **Met je echte bestanden**: open http://localhost:4321/admin/index.html in Chrome of Edge, kies
  _Werken met lokale repository_ en selecteer de projectmap. Wijzigingen komen direct in je bestanden;
  committen doe je zelf.

## Content toevoegen zonder het beheer

Alles kan ook rechtstreeks in de bestanden.

### Een nieuwsbericht

Maak `src/content/nieuws/nl/mijn-bericht.md` aan (de bestandsnaam wordt de URL):

```markdown
---
title: 'Titel van het bericht'
date: 2026-10-01
summary: Eén of twee zinnen; verschijnt op de overzichtspagina, in de RSS-feed en bij delen op LinkedIn.
author: Bestuur Delftsche Opera
cover: /src/assets/uploads/mijn-foto.jpg
coverAlt: Beschrijving van de foto voor wie hem niet kan zien
coverCredit: Naam fotograaf
draft: false
---

De tekst van het bericht, in **Markdown**.
```

- Foto's gaan in `src/assets/uploads/` en worden bij het bouwen automatisch verkleind en omgezet naar WebP.
- Met `draft: true` is een bericht alleen zichtbaar tijdens `npm run dev`, niet op de echte site.
- Elk bericht heeft een knop _Deel op LinkedIn_; de omslagfoto wordt dan het deelplaatje.

### Overige content

- **Mensen**: kopieer een bestand in `src/content/mensen/` en pas het aan. `group` is `bestuur`,
  `raad-van-toezicht` of `artistiek-team`; `order` bepaalt de volgorde.
- **Projecten**: Markdown-bestanden in `src/content/projecten/nl/` (en optioneel `en/`), nieuwste eerst.
- **Paginateksten**: de YAML-bestanden in `src/content/pages/`.
- **Gegevens van de stichting**: `src/content/settings/site.yml`.

Een verkeerd of ontbrekend veld laat de build mislukken met een duidelijke melding, zodat een fout
nooit ongemerkt live gaat.

## Publiceren

De site wordt gehost op **Cloudflare Workers** (statische bestanden, gratis) en automatisch gebouwd vanuit
GitHub: elke wijziging op `main` gaat live, andere branches krijgen een eigen voorbeeld-URL.
De configuratie staat in `wrangler.jsonc`. Dit wordt ingericht in fase 3.

### Inloggen in het beheer instellen (fase 3)

1. Maak op GitHub een **OAuth App** aan via https://github.com/settings/applications/new, met als
   _Homepage URL_ `https://delftscheopera.nl` en als _Authorization callback URL_
   `https://delftscheopera.nl/cms/callback`.
2. Zet de **Client ID** in `wrangler.jsonc` (`vars.GITHUB_CLIENT_ID`; die is openbaar).
3. Maak een **client secret** aan en zet die in Cloudflare als _Secret_ met de naam
   `GITHUB_CLIENT_SECRET` (_Workers → delftscheopera-website → Settings → Variables and Secrets_).
4. Geef redacteuren schrijfrechten op de repository
   [rainframe/delftscheopera-website](https://github.com/rainframe/delftscheopera-website)
   (_Settings → Collaborators → Add people_).

Het beheer werkt daarna op https://delftscheopera.nl/admin/. Gebruik altijd het domein zonder `www`:
de callback-URL van de OAuth App is aan dat domein gekoppeld.

## Status

| Fase | Inhoud                                                                                  | Status   |
| ---- | --------------------------------------------------------------------------------------- | -------- |
| 1    | Opzet, ontwerp, alle pagina's met gemigreerde content                                   | ✅ klaar |
| 2    | CMS (Sveltia) en handleiding voor redacteuren                                           | ✅ klaar |
| 3    | GitHub en Cloudflare, voorbeeld-URL's                                                   | gepland  |
| 4    | Domein, doorverwijzingen vanaf stichtingdoc.nl, nieuwsbrief, deelplaatjes, statistieken | gepland  |

## Nog te doen vóór de lancering

- [ ] Officiële logo's als SVG en scherpere foto's aanleveren
- [ ] Portretten van Sytze Boerstra en Hidde Marsman (konden niet van de oude site gehaald worden)
- [ ] RSIN controleren: op de oude site staat `8036313217` (10 cijfers), een RSIN heeft er 9
- [ ] Placeholders invullen: lustrumdetails (opzet, locaties, data) en de privacyverklaring laten controleren
- [ ] De drie concept-nieuwsberichten nalezen (geschreven op basis van de oude site en het ontwerp)
- [ ] Nieuwsbrief: Laposta-account en -lijst aanmaken (het aanmeldformulier wordt in fase 4 gekoppeld)
- [ ] IBAN invullen in `settings/site.yml` als dat op _Steun ons_ moet staan
- [ ] GitHub OAuth App aanmaken en de Client ID en het secret instellen (zie hierboven)
