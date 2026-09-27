// Controleert of de CMS-configuratie (public/admin/config.yml) klopt met de content in src/content/.
//
// 1. De configuratie moet geldig zijn volgens het schema van Sveltia CMS.
// 2. Elk veld in een contentbestand moet in de configuratie staan. Het CMS schrijft bij opslaan
//    alleen de velden die het kent; een ontbrekend veld zou dus stilletjes verdwijnen.
// 3. Verplichte velden uit de configuratie moeten in elk contentbestand gevuld zijn.
//
// Gebruik: `npm run check:cms` (draait ook mee met `npm run check`).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = parse(await readFile(join(root, 'public/admin/config.yml'), 'utf8'));
const schema = JSON.parse(
  await readFile(join(root, 'node_modules/@sveltia/cms/schema/sveltia-cms.json'), 'utf8'),
);
const problems = [];

// 1. Schema
const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(config)) {
  const paths = [...new Set(validate.errors.map((error) => error.instancePath))];
  problems.push(`Configuratie wijkt af van het Sveltia-schema bij: ${paths.slice(0, 5).join(', ')}`);
}

const locales = config.i18n?.locales ?? [];
const defaultLocale = config.i18n?.default_locale ?? locales[0];

/** Leest frontmatter (Markdown) of een heel YAML-bestand; `body` is de tekst na de frontmatter. */
async function readEntry(path) {
  const text = await readFile(path, 'utf8');
  if (!path.endsWith('.md')) return parse(text) ?? {};
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { body: text };
  return { ...(parse(match[1]) ?? {}), body: match[2] };
}

const isRequired = (field, locale) =>
  Array.isArray(field.required) ? field.required.includes(locale) : field.required !== false;

/** Veld in deze taal aanwezig? Niet-vertaalde velden staan alleen in de standaardtaal. */
const storedInLocale = (field, locale, i18n) =>
  !i18n || locale === defaultLocale || (field.i18n && field.i18n !== 'none' && field.i18n !== false);

/** Vergelijkt de gegevens van één bestand (of taalblok) met de velddefinities. */
function compare(data, fields, where, { locale, i18n } = {}) {
  if (!data || typeof data !== 'object') return;
  const known = new Map(fields.map((field) => [field.name, field]));
  for (const key of Object.keys(data)) {
    if (!known.has(key)) problems.push(`${where}: veld "${key}" staat niet in de CMS-configuratie`);
  }
  for (const field of fields) {
    const value = data[field.name];
    const present = value !== undefined && value !== null && value !== '';
    if (!present) {
      if (isRequired(field, locale) && storedInLocale(field, locale, i18n) && field.widget !== 'boolean') {
        problems.push(`${where}: verplicht veld "${field.name}" ontbreekt`);
      }
      continue;
    }
    if (field.widget === 'object' && field.fields) {
      compare(value, field.fields, `${where} › ${field.name}`, { locale, i18n });
    }
    if (field.widget === 'list' && field.fields && Array.isArray(value)) {
      value.forEach((item, index) =>
        compare(item, field.fields, `${where} › ${field.name}[${index}]`, { locale, i18n }),
      );
    }
  }
}

for (const collection of config.collections ?? []) {
  const i18n = Boolean(collection.i18n);

  // Mappen met losse bestanden (nieuws, projecten, mensen)
  if (collection.folder) {
    const extension = collection.extension ?? 'md';
    const folders = i18n
      ? locales.map((locale) => [locale, join(root, collection.folder, locale)])
      : [[undefined, join(root, collection.folder)]];
    for (const [locale, folder] of folders) {
      if (!existsSync(folder)) continue;
      for (const file of (await readdir(folder)).filter((name) => name.endsWith(`.${extension}`))) {
        const where = `${collection.folder}/${locale ? `${locale}/` : ''}${file}`;
        compare(await readEntry(join(folder, file)), collection.fields, where, { locale, i18n });
      }
    }
  }

  // Losse bestanden (pagina's, instellingen)
  for (const file of collection.files ?? []) {
    const path = join(root, file.file);
    if (!existsSync(path)) {
      problems.push(`${file.file}: bestand bestaat niet`);
      continue;
    }
    const data = await readEntry(path);
    if (file.i18n) {
      for (const key of Object.keys(data)) {
        if (!locales.includes(key)) problems.push(`${file.file}: onbekende taal "${key}"`);
      }
      for (const locale of locales) {
        compare(data[locale], file.fields, `${file.file} [${locale}]`, { locale, i18n: true });
      }
    } else {
      compare(data, file.fields, file.file);
    }
  }
}

if (problems.length) {
  console.error(`CMS-controle: ${problems.length} probleem/problemen gevonden:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('CMS-controle: configuratie en content komen overeen.');
