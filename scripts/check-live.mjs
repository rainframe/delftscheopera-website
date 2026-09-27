// Controleert de gepubliceerde website, bijvoorbeeld vlak voor en na de lancering.
//
// 1. Elke pagina uit de sitemap, plus de 404-, bedank- en RSS-pagina's, geeft de juiste status.
// 2. Alle afbeeldingen, stijlen en scripts op die pagina's zijn bereikbaar, ook de deelafbeeldingen.
// 3. De headers uit public/_headers zijn actief.
// 4. www.delftscheopera.nl en de oude pagina's van stichtingdoc.nl verwijzen permanent (301) door.
// 5. Stand van zaken: inloggen in het beheer, het nieuwsbriefformulier, statistieken en zoekmachines.
//
// Gebruik: `npm run check:live`, of voor een voorbeeldadres `npm run check:live -- https://…`.
// De doorverwijzingen worden alleen gecontroleerd voor https://delftscheopera.nl.

const production = 'https://delftscheopera.nl';
const base = new URL(process.argv[2] ?? production).origin;

/** Oude adressen en waar ze naartoe moeten. Houd gelijk met "Doorverwijzingen" in de README. */
const redirects = [
  ['http://delftscheopera.nl/', '/'],
  ['https://www.delftscheopera.nl/', '/'],
  ['https://www.delftscheopera.nl/nieuws/', '/nieuws/'],
  ['https://stichtingdoc.nl/', '/'],
  ['https://www.stichtingdoc.nl/', '/'],
  ['https://www.stichtingdoc.nl/home', '/'],
  ['https://www.stichtingdoc.nl/producties', '/projecten/'],
  ['https://stichtingdoc.nl/producties', '/projecten/'],
  ['https://www.stichtingdoc.nl/organisatie', '/organisatie/'],
  ['https://www.stichtingdoc.nl/contact', '/contact/'],
  ['https://www.stichtingdoc.nl/bestaat-niet', '/'],
];

const passed = [];
const notes = [];
const failures = [];

/** Voert een groep controles uit en meldt die als geslaagd als er geen problemen bij kwamen. */
async function group(run) {
  const before = failures.length;
  const label = await run();
  if (failures.length === before) passed.push(label);
}

/** Zet een adres van de productiesite om naar het adres dat gecontroleerd wordt. */
const onBase = (url) => new URL(new URL(url).pathname, base).href;
const request = (url, method = 'GET') => fetch(url, { method, redirect: 'manual' });
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const meta = (html, attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

const pages = [];
const html = new Map();
const assets = new Set();

// 1. Pagina's
await group(async () => {
  const index = await (await request(`${base}/sitemap-index.xml`)).text();
  for (const sitemap of locs(index)) {
    pages.push(...locs(await (await request(onBase(sitemap))).text()).map(onBase));
  }
  if (!pages.length) failures.push('Geen pagina’s gevonden in /sitemap-index.xml');
  const others = [
    ['/nieuws/rss.xml', 200],
    ['/en/news/rss.xml', 200],
    ['/nieuwsbrief/bedankt/', 200],
    ['/en/newsletter/thanks/', 200],
    [`/bestaat-niet-${Date.now()}/`, 404],
  ].map(([path, status]) => [base + path, status]);

  for (const [url, expected] of [...pages.map((page) => [page, 200]), ...others]) {
    const response = await request(url);
    const body = await response.text();
    if (response.status !== expected) {
      failures.push(`${url} geeft ${response.status}, verwacht ${expected}`);
      continue;
    }
    if (!response.headers.get('content-type')?.includes('html')) continue;
    html.set(url, body);
    for (const [, value] of body.matchAll(/(?:src|href|srcset|content)="([^"]+)"/g)) {
      for (const part of value.split(',')) {
        const candidate = part.trim().split(/\s+/)[0];
        if (candidate.startsWith('/') && !candidate.startsWith('//'))
          assets.add(new URL(candidate, base).href);
        else if (candidate.startsWith(`${production}/`)) assets.add(onBase(candidate));
      }
    }
  }
  return `${pages.length} pagina’s uit de sitemap en ${others.length} andere adressen geven de juiste status`;
});

// 2. Bestanden
await group(async () => {
  let count = 0;
  for (const asset of assets) {
    if (html.has(asset) || pages.includes(asset)) continue;
    count++;
    const response = await request(asset, 'HEAD');
    if (response.status !== 200) failures.push(`${asset} geeft ${response.status}`);
  }
  for (const page of pages) {
    const body = html.get(page);
    if (body && !meta(body, 'property', 'og:image'))
      failures.push(`${page} heeft geen deelafbeelding (og:image)`);
  }
  return `${count} gelinkte bestanden bereikbaar (afbeeldingen, stijlen, scripts, deelafbeeldingen)`;
});

// 3. Headers
await group(async () => {
  const home = await request(`${base}/`, 'HEAD');
  if (home.headers.get('x-content-type-options') !== 'nosniff')
    failures.push('Header X-Content-Type-Options ontbreekt');
  const hashed = [...assets].find((asset) => asset.includes('/_astro/'));
  if (hashed) {
    const cache = (await request(hashed, 'HEAD')).headers.get('cache-control') ?? '';
    if (!cache.includes('immutable'))
      failures.push(`${hashed} wordt niet lang gecachet (Cache-Control: ${cache})`);
  }
  return 'headers uit public/_headers';
});

// 4. Doorverwijzingen
if (base === production) {
  await group(async () => {
    for (const [from, to] of redirects) {
      const expected = production + to;
      let url = from;
      const hops = [];
      for (let hop = 0; hop < 5 && url !== expected; hop++) {
        const response = await request(url, 'HEAD').catch(() => undefined);
        const location = response?.headers.get('location');
        hops.push(response ? String(response.status) : 'geen antwoord');
        if (!response || ![301, 308].includes(response.status) || !location) break;
        url = new URL(location, url).href;
      }
      if (url !== expected) failures.push(`${from} → ${url} (${hops.join(' → ')}), verwacht ${expected}`);
    }
    return `${redirects.length} doorverwijzingen (www en stichtingdoc.nl)`;
  });
}

// 5. Stand van zaken
const auth = await request(`${base}/cms/auth?provider=github`);
if (auth.status === 302 && auth.headers.get('location')?.startsWith('https://github.com/')) {
  passed.push('inloggen in het beheer (stuurt door naar GitHub)');
} else {
  const body = await auth.text();
  failures.push(
    body.includes('MISCONFIGURED_CLIENT')
      ? 'Inloggen in het beheer: de worker ziet GITHUB_CLIENT_SECRET niet. Zet die als Secret bij Settings → Variables and Secrets (niet bij Build) en klik op Deploy'
      : `Inloggen in het beheer: /cms/auth geeft ${auth.status}`,
  );
}

const homeHtml = html.get(`${base}/`) ?? '';
const form = homeHtml.match(/<form class="newsletter__form"[^>]*>/)?.[0] ?? '';
if (/action="https:\/\//.test(form)) passed.push('nieuwsbriefformulier is gekoppeld');
else notes.push('Het nieuwsbriefformulier is nog niet gekoppeld (Instellingen → Nieuwsbrief)');

if (homeHtml.includes('cloudflareinsights.com/beacon.min.js'))
  passed.push('Cloudflare Web Analytics staat op de pagina’s');
else notes.push('Geen Cloudflare Web Analytics gevonden op de homepage (zie "Statistieken" in de README)');

if ((meta(homeHtml, 'name', 'robots') ?? '').includes('noindex')) {
  notes.push('Zoekmachines zijn nog uitgesloten: zet bij de lancering "Zichtbaar voor zoekmachines" aan');
} else {
  const robotsTxt = await (await request(`${base}/robots.txt`)).text();
  if (robotsTxt.includes('Sitemap:')) passed.push('zoekmachines mogen de site opnemen');
  else failures.push('robots.txt noemt de sitemap niet');
}

// Rapport
console.log(`Controle van ${base}\n`);
for (const line of passed) console.log(`✓ ${line}`);
for (const line of notes) console.log(`! ${line}`);
for (const line of failures) console.log(`✗ ${line}`);
console.log(
  failures.length ? `\n${failures.length} probleem/problemen gevonden.` : '\nGeen problemen gevonden.',
);
process.exit(failures.length ? 1 : 0);
