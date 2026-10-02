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
npm run check:live # controleert de live site: pagina's, bestanden, headers, doorverwijzingen
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
    mensen/                ← Comité van Aanbeveling, Raad van Toezicht, bestuur en artistiek team
                             (één YAML-bestand per persoon)
    pages/                 ← teksten van vaste pagina's, met een nl:- en en:-blok
    settings/site.yml      ← adres, KvK, RSIN, e-mail, sociale media, IBAN, nieuwsbrief
  assets/
    uploads/               ← foto's die in de content gebruikt worden
    brand/                 ← logo's (navy en wit)
    decor/                 ← bladmuziek, silhouetten van Delft
  components/              ← bouwstenen (gordijnlijst, banner, kaarten, header, footer, nieuwsbrief, …)
  views/                   ← de pagina's, gedeeld door de Nederlandse en Engelse route
  pages/                   ← routes (bepalen de URL's); pages/og/ maakt de deelafbeeldingen
  lib/                     ← content ophalen, RSS-feeds, deelafbeeldingen
  i18n/                    ← vaste interface-teksten (ui.ts) en URL's per taal (routes.ts)
  styles/global.css        ← kleuren, lettertypes en basisstijlen
  content.config.ts        ← het contentmodel (welke velden verplicht zijn)
public/
  admin/                   ← het beheer (Sveltia CMS): index.html, config.yml en preview.css
  _headers                 ← extra HTTP-headers (beveiliging, caching)
worker/index.ts            ← Cloudflare Worker: alleen het inloggen in het beheer (/cms/*)
scripts/                   ← hulpscripts (CMS kopiëren, CMS-configuratie en live site controleren)
docs/                      ← handleiding voor redacteuren
```

### Ontwerp

- Kleuren: navy `#042d64` en wit (huisstijl).
- Lettertypes: koppen in **League Spartan** (meegeleverd via Fontsource), al het andere in Helvetica/Arial.
- Het theatergordijn uit het logo is het terugkerende element: `Curtain.astro` is één gordijn,
  `CurtainFrame.astro` zet gordijnen over een foto, `StageBanner.astro` is de grote banner bovenaan de homepage (Community Opera 2028).
- **Deelafbeeldingen**: elk nieuwsbericht krijgt bij het bouwen een eigen afbeelding van 1200 × 630
  pixels voor LinkedIn en andere sociale media ([src/lib/share-image.ts](src/lib/share-image.ts)): de
  titel in League Spartan op navy, met de omslagfoto tussen twee gordijnen (zonder foto: witte gordijnen,
  zoals op de 404-pagina). Het adres bevat een hash van titel, datum en foto, zodat LinkedIn na een
  wijziging de nieuwe versie ophaalt. Verander je het ontwerp, verhoog dan `DESIGN_VERSION`.
  Satori krijgt League Spartan als TTF (`@expo-google-fonts/league-spartan`): package.json dwingt via
  `overrides` een nieuwere fflate af vanwege een beveiligingsmelding, en daarmee leest Satori geen WOFF.
- De logo's staan als SVG in `src/assets/brand/` (navy en wit, zonder achtergrond). Ze zijn
  overgetrokken uit de Canva-export: Canva's SVG-bestanden bevatten het logo als PNG-afbeelding met
  een achtergrondvlak, dus niet als vectoren.

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
- Elk bericht heeft een knop _Deel op LinkedIn_; LinkedIn toont dan de automatisch gemaakte
  deelafbeelding met titel en omslagfoto.

### Overige content

- **Mensen**: kopieer een bestand in `src/content/mensen/` en pas het aan. `group` is `bestuur`,
  `raad-van-toezicht`, `comite-van-aanbeveling` of `artistiek-team`; `order` bepaalt de volgorde.
  Het Comité van Aanbeveling, de Raad van Toezicht en het bestuur staan op de pagina Organisatie; het
  artistiek team staat op de pagina Community Opera 2028 als het daar bij _Muzikale leiding_
  gekozen is (`src/content/pages/community-opera.yml`).
- **Projecten**: Markdown-bestanden in `src/content/projecten/nl/` (en optioneel `en/`), nieuwste eerst.
- **Paginateksten**: de YAML-bestanden in `src/content/pages/`.
- **Gegevens van de stichting**: `src/content/settings/site.yml`.

Een verkeerd of ontbrekend veld laat de build mislukken met een duidelijke melding, zodat een fout
nooit ongemerkt live gaat.

## Publiceren

De site wordt gehost op **Cloudflare Workers** (statische bestanden, gratis) en automatisch gebouwd vanuit
GitHub: elke wijziging op `main` staat binnen een paar minuten online. De configuratie staat in
`wrangler.jsonc`. De domeinen (delftscheopera.nl, www.delftscheopera.nl en
preview.delftscheopera.nl) zijn in Cloudflare als _Custom domain_ aan de worker gekoppeld, niet in
`wrangler.jsonc`, dus een deploy laat ze ongemoeid. Kies bij _Add domain_ voor _Enable for_ altijd
**Production**, ook voor preview.delftscheopera.nl: de optie _Preview_ is voor Cloudflares testversies
per Git-branch (`wrangler preview`, op adressen als `main.preview.delftscheopera.nl`) en maakt voor
het domein zelf geen DNS-record aan. Via `*.workers.dev` is de site niet bereikbaar.

De worker ([worker/index.ts](worker/index.ts)) komt vóór de statische bestanden en kiest per domein
wat er gebeurt: de pagina _Binnenkort online_, de preview, doorverwijzingen en het inloggen in het
beheer. Alleen `/_astro/` (bestanden met een hash in de naam) gaat er rechtstreeks omheen.

`npm run check:live` controleert de live site: alle pagina's en bestanden, de headers, de
doorverwijzingen, _Binnenkort online_, het inloggen in het beheer, het nieuwsbriefformulier en de
statistieken.

### Preview en lancering

Zolang in het beheer onder _Instellingen_ **Website gelanceerd** uit staat (`launched: false` in
`settings/site.yml`):

- toont delftscheopera.nl op elk adres alleen _Binnenkort online_
  ([src/pages/binnenkort.astro](src/pages/binnenkort.astro));
- staat de site zelf, met alle wijzigingen, op **https://preview.delftscheopera.nl**;
- blijft het beheer op https://delftscheopera.nl/admin/ (de preview verwijst daarheen, omdat het
  inloggen via GitHub aan dat adres gekoppeld is);
- hebben alle pagina's `noindex` en blokkeert robots.txt alles.

**Lanceren** = _Website gelanceerd_ aanzetten. Na de build staat de site op delftscheopera.nl, mogen
zoekmachines hem opnemen en verwijst preview.delftscheopera.nl door naar delftscheopera.nl. De worker
leest die instelling uit `/site-status.json`, dat bij het bouwen gemaakt wordt.

### Inloggen in het beheer

1. Maak op GitHub een **OAuth App** aan via https://github.com/settings/applications/new, met als
   _Homepage URL_ `https://delftscheopera.nl` en als _Authorization callback URL_
   `https://delftscheopera.nl/cms/callback`.
2. Zet de **Client ID** in `wrangler.jsonc` (`vars.GITHUB_CLIENT_ID`; die is openbaar).
3. Maak een **client secret** aan en zet die in Cloudflare als _Secret_ met de naam
   `GITHUB_CLIENT_SECRET` (_Workers → delftscheopera-website → Settings → Variables and Secrets_; niet
   bij _Build_, want die variabelen bestaan alleen tijdens het bouwen).
4. Geef redacteuren schrijfrechten op de repository
   [rainframe/delftscheopera-website](https://github.com/rainframe/delftscheopera-website)
   (_Settings → Collaborators → Add people_).

Het beheer werkt daarna op https://delftscheopera.nl/admin/, ook vóór de lancering. Gebruik altijd
het domein zonder `www`: de callback-URL van de OAuth App is aan dat domein gekoppeld.

### Doorverwijzingen (www, http en stichtingdoc.nl)

De worker verwijst permanent (301) door:

- `www.delftscheopera.nl` en `http://` → `https://delftscheopera.nl` (zelfde pagina);
- de oude pagina's van stichtingdoc.nl → hun nieuwe tegenhanger: `/producties` → `/projecten/`,
  `/organisatie` → `/organisatie/`, `/contact` → `/contact/`, en al het andere → de homepage. De
  lijst staat in `OLD_PAGES` in [worker/index.ts](worker/index.ts) en in `scripts/check-live.mjs`;
  houd die twee gelijk.

Daarvoor moeten stichtingdoc.nl en www.stichtingdoc.nl aan de worker gekoppeld zijn:

1. Verwijder in Cloudflare bij stichtingdoc.nl → _DNS_ de A-, AAAA- en CNAME-records van
   `stichtingdoc.nl` en `www` (die wijzen naar de oude Google Site). Laat de MX- en TXT-records
   staan, anders werkt de e-mail niet meer.
2. Voeg bij de worker onder _Domains → Add domain_ `stichtingdoc.nl` en `www.stichtingdoc.nl` toe als
   _Custom domain_.

De oude Google Site is daarna niet meer via stichtingdoc.nl te bereiken en kan offline. _Always Use
HTTPS_ (_SSL/TLS → Edge Certificates_) aanzetten mag, maar is niet nodig: de worker doet het al.

### Nieuwsbrief (Laposta)

Het aanmeldformulier staat bovenaan de footer van elke pagina en gaat rechtstreeks naar de
nieuwsbriefdienst, zonder eigen server of API-sleutel. Nieuwe aanmeldingen komen daarna op de
bedankpagina `/nieuwsbrief/bedankt/` (Engels: `/en/newsletter/thanks/`). Zolang het formulier niet
gekoppeld is, staat het uit met een gele markering.

1. Maak een Laposta-account (gratis tot 2.000 relaties) en maak op de pagina _Relaties_ met
   _Nieuwe lijst_ een lijst voor de nieuwsbrief. Maak het e-mailadres het enige verplichte veld.
   Nieuwe aanmeldingen staan in Laposta direct op de lijst; een bevestigingsmail (double opt-in) kan
   alleen bij een betaald account en is volgens Laposta niet verplicht.
2. Open _Relaties → (de lijst) → Verrijken → Aanmelden → Zelf vormgeven van aanmeldformulier_ en
   bekijk de kale HTML-code.
3. Neem in het beheer onder _Instellingen → Nieuwsbrief_ over:
   - **Formulieradres**: wat bij `action="…"` staat (`https://….email-provider.eu/subscribe/post/v2/index.php`);
   - **Naam van het e-mailveld**: de `name="…"` van het invoerveld met `type="email"` en een code van
     10 tekens. Niet het veld dat letterlijk `email` heet: dat is het anti-spamveld;
   - **Verborgen velden**: `a` en `l` met hun waarden;
   - **Script van de dienst**: het adres bij `<script src="…/subscribe/check/validate.js">` onder het
     formulier. Dat script beschermt tegen spam (met een token en een kleine rekenpuzzel); het adres
     waar het formulier naartoe gaat (`/subscribe/post/v2/…`) accepteert zonder dat script geen
     aanmeldingen. De site laadt het pas als iemand het formulier gebruikt, zodat gewone bezoekers
     geen verzoeken of cookies van Laposta krijgen.

   _Veld voor de bedankpagina_ (`next`) en _Anti-spamveld_ (`email`) staan al goed.

4. Meld je zelf aan: je hoort op de bedankpagina te komen en in Laposta op de lijst te staan.

Een andere dienst met een gewoon HTML-formulier (Mailchimp, Brevo, MailerLite, …) werkt op dezelfde
manier: vul dezelfde velden in met de gegevens van die dienst. Past de tekst van de bedankpagina niet
meer, dan staat die in `src/i18n/ui.ts` (`newsletterThanks.*`).

Voor de inhoud van de nieuwsbrief: de RSS-feeds `/nieuws/rss.xml` en `/en/news/rss.xml` bevatten per
bericht de titel, samenvatting, link en omslagfoto. Laposta kan zo'n feed in een eigen sjabloon laden.

### Statistieken (Cloudflare Web Analytics)

Ga in Cloudflare naar _Web Analytics_ (https://dash.cloudflare.com/?to=/:account/web-analytics) en
voeg delftscheopera.nl toe met _Add a site_ (staat hij er al, kies dan _Manage site_). Kies als
installatie _Enable with JS Snippet installation_: de automatische installatie zet het script niet op
deze site, omdat die via een Worker loopt, en zo komt het script ook niet dubbel op de pagina. Kopieer
de `token` uit het fragment en vul die in bij _Instellingen → Statistieken_ in het beheer. De token is
openbaar (hij staat in de broncode van elke pagina) en telt ook preview.delftscheopera.nl mee.
Web Analytics gebruikt geen cookies, dus een cookiemelding is niet nodig; de privacyverklaring noemt
het al.

## Status

| Fase | Inhoud                                                                                  | Status                                                            |
| ---- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1    | Opzet, ontwerp, alle pagina's met gemigreerde content                                   | ✅ klaar                                                          |
| 2    | CMS (Sveltia) en handleiding voor redacteuren                                           | ✅ klaar                                                          |
| 3    | GitHub en Cloudflare, voorbeeld-URL's                                                   | ✅ klaar                                                          |
| 4    | Domein, doorverwijzingen vanaf stichtingdoc.nl, nieuwsbrief, deelplaatjes, statistieken | code klaar; instellen in Cloudflare en Laposta (zie _Publiceren_) |

## Nog te doen vóór de lancering

- [ ] Scherpere foto's aanleveren
- [ ] Portretten van Sytze Boerstra, Hidde Marsman, Sean Camps en Catharina Goettsch
- [ ] RSIN controleren: op de oude site staat `8036313217` (10 cijfers), een RSIN heeft er 9
- [ ] De privacyverklaring laten controleren en daarna de gele placeholder bovenaan weghalen
- [ ] De drie concept-nieuwsberichten nalezen (geschreven op basis van de oude site en het ontwerp)
- [ ] IBAN invullen in `settings/site.yml` als dat op _Steunen & samenwerken_ moet staan
- [ ] stichtingdoc.nl en www.stichtingdoc.nl aan de worker koppelen (zie _Doorverwijzingen_)
- [ ] `npm run check:live` draaien: er mogen geen ✗ meer staan
- [ ] Een bericht in de [Post Inspector](https://www.linkedin.com/post-inspector/) van LinkedIn bekijken
- [ ] Bij de lancering: in het beheer onder _Instellingen_ **Website gelanceerd** aanzetten, en
      eventueel de sitemap `https://delftscheopera.nl/sitemap-index.xml` aanmelden bij Google Search
      Console
