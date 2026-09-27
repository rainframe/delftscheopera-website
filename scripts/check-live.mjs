// Controleert de gepubliceerde website, bijvoorbeeld vlak voor en na de lancering.
//
// 1. Elke pagina uit de sitemap, plus de 404-, bedank- en RSS-pagina's, geeft de juiste status.
//    Vóór de lancering staat de site op preview.delftscheopera.nl, daarna op delftscheopera.nl.
// 2. Alle afbeeldingen, stijlen en scripts op die pagina's zijn bereikbaar, ook de deelafbeeldingen.
// 3. De headers uit public/_headers zijn actief.
// 4. Vóór de lancering toont delftscheopera.nl alleen "Binnenkort online" (behalve het beheer);
//    daarna verwijst preview.delftscheopera.nl door.
// 5. www, http:// en de oude pagina's van stichtingdoc.nl verwijzen permanent (301) door
//    (stichtingdoc.nl pas zodra dat domein aan de worker gekoppeld is).
// 6. Stand van zaken: inloggen in het beheer, het nieuwsbriefformulier, statistieken en zoekmachines.
//
// Gebruik: `npm run check:live`, of voor een ander adres `npm run check:live -- https://…` (dan
// alleen de punten 1–3 en 6).

const production = 'https://delftscheopera.nl';
const preview = 'https://preview.delftscheopera.nl';

/** Adressen die doorverwijzen en waar ze naartoe moeten. */
const redirects = [
  ['http://delftscheopera.nl/', '/'],
  ['https://www.delftscheopera.nl/', '/'],
  ['https://www.delftscheopera.nl/nieuws/', '/nieuws/'],
];
/** De oude site. Houd gelijk met OLD_PAGES in worker/index.ts. */
const oldSite = [
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

const request = (url, method = 'GET') => fetch(url, { method, redirect: 'manual' });
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const meta = (html, attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

const status = await request(`${production}/site-status.json`)
  .then((response) => (response.ok ? response.json() : {}))
  .catch(() => ({}));
const launched = status.launched === true;
const custom = process.argv[2];
const base = new URL(custom ?? (launched ? production : preview)).origin;
/** Zet een adres van de productiesite om naar het adres dat gecontroleerd wordt. */
const onBase = (url) => new URL(new URL(url).pathname, base).href;

const pages = [];
const html = new Map();
const assets = new Set();
const reachable = await request(`${base}/`).then(
  () => true,
  () => false,
);

if (!reachable) {
  failures.push(
    base === preview
      ? `${base} is niet bereikbaar: koppel preview.delftscheopera.nl als Custom domain aan de worker (zie de README)`
      : `${base} is niet bereikbaar`,
  );
} else {
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
    ].map(([path, code]) => [base + path, code]);

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
    return `${base}: ${pages.length} pagina’s uit de sitemap en ${others.length} andere adressen geven de juiste status`;
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
}

if (!custom) {
  // 4. Binnenkort online / preview
  await group(async () => {
    if (launched) {
      const response = await request(`${preview}/`).catch(() => undefined);
      if (response && response.headers.get('location') !== `${production}/`)
        failures.push(`${preview}/ verwijst niet door naar ${production}/ (${response.status})`);
      return 'site gelanceerd: delftscheopera.nl toont de site, preview.delftscheopera.nl verwijst door';
    }
    for (const path of ['/', '/nieuws/', '/en/', '/bestaat-niet/']) {
      const response = await request(production + path);
      const body = await response.text();
      if (response.status !== 200 || !body.includes('class="construction"'))
        failures.push(`${production}${path} toont niet "Binnenkort online" (${response.status})`);
    }
    const admin = await request(`${production}/admin/`);
    if (admin.status !== 200 || !(await admin.text()).includes('<title>Beheer'))
      failures.push(`${production}/admin/ is niet bereikbaar (${admin.status})`);
    return 'vóór de lancering: delftscheopera.nl toont alleen "Binnenkort online", het beheer blijft bereikbaar';
  });

  // 5. Doorverwijzingen; stichtingdoc.nl alleen als een van beide domeinen al doorverwijst.
  await group(async () => {
    const linked = await Promise.all(
      ['https://stichtingdoc.nl/', 'https://www.stichtingdoc.nl/'].map((url) =>
        request(url, 'HEAD').then(
          (response) => response.headers.get('location')?.startsWith(production) ?? false,
          () => false,
        ),
      ),
    );
    const oldSiteLinked = linked.some(Boolean);
    const checks = oldSiteLinked ? [...redirects, ...oldSite] : redirects;
    for (const [from, to] of checks) {
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
    return `${checks.length} doorverwijzingen (http, www${oldSiteLinked ? ' en stichtingdoc.nl' : ''})`;
  });
}

// 6. Stand van zaken
const auth = await request(`${production}/cms/auth?provider=github`);
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
if (homeHtml) {
  const form = homeHtml.match(/<form class="newsletter__form"[^>]*>/)?.[0] ?? '';
  if (/action="https:\/\//.test(form)) passed.push('nieuwsbriefformulier is gekoppeld');
  else notes.push('Het nieuwsbriefformulier is nog niet gekoppeld (Instellingen → Nieuwsbrief)');

  if (homeHtml.includes('cloudflareinsights.com/beacon.min.js'))
    passed.push('Cloudflare Web Analytics staat op de pagina’s');
  else notes.push('Geen Cloudflare Web Analytics gevonden op de homepage (zie "Statistieken" in de README)');
}

if (!launched) {
  notes.push(
    'Nog niet gelanceerd: zet bij de lancering "Website gelanceerd" aan (Instellingen in het beheer)',
  );
} else {
  const robotsTxt = await (await request(`${production}/robots.txt`)).text();
  if (robotsTxt.includes('Sitemap:')) passed.push('zoekmachines mogen de site opnemen');
  else failures.push('robots.txt noemt de sitemap niet');
}

// Rapport
console.log(`Controle van ${base}${launched ? '' : ' (nog niet gelanceerd)'}\n`);
for (const line of passed) console.log(`✓ ${line}`);
for (const line of notes) console.log(`! ${line}`);
for (const line of failures) console.log(`✗ ${line}`);
console.log(
  failures.length ? `\n${failures.length} probleem/problemen gevonden.` : '\nGeen problemen gevonden.',
);
process.exit(failures.length ? 1 : 0);
