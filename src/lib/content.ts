import { getCollection, getEntries, type CollectionEntry, type CollectionKey } from 'astro:content';
import { marked } from 'marked';
import { locales, postUrl, type Locale } from '@/i18n/routes';

marked.use({ gfm: true });

/** Markdown (uit YAML-velden) naar HTML. Een alinea die begint met "TODO:" wordt een gele placeholder. */
export function md(text: string | undefined): string {
  if (!text) return '';
  const html = marked.parse(text, { async: false }) as string;
  return html.replace(/<p>TODO:\s*/g, '<p class="todo">');
}

/** Markdown zonder omringende <p>, voor korte teksten in koppen en labels. */
export function mdInline(text: string | undefined): string {
  return text ? (marked.parseInline(text, { async: false }) as string) : '';
}

type PageCollection =
  | 'home'
  | 'lustrum'
  | 'steunOns'
  | 'nieuwsPagina'
  | 'projectenPagina'
  | 'organisatie'
  | 'contact'
  | 'anbi'
  | 'privacy';

type PageData<C extends PageCollection> = CollectionEntry<C>['data']['nl'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value instanceof Date)
    return false;
  // Geoptimaliseerde afbeeldingen zijn objecten, maar moeten als geheel vervangen worden.
  return !('src' in value && 'format' in value);
}

/** Vult ontbrekende (of lege) vertaalde velden aan met de Nederlandse tekst. */
function withFallback<T>(base: T, override: unknown): T {
  if (override === undefined || override === null || override === '') return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = withFallback((base as Record<string, unknown>)[key], value);
  }
  return merged as T;
}

/** Teksten van een vaste pagina in de gevraagde taal. */
export async function getPage<C extends PageCollection>(collection: C, locale: Locale): Promise<PageData<C>> {
  const [entry] = (await getCollection(collection as CollectionKey)) as CollectionEntry<C>[];
  if (!entry) throw new Error(`Paginatekst ontbreekt: src/content/pages voor "${collection}"`);
  const data = entry.data as { nl: PageData<C>; en?: Partial<PageData<C>> };
  return locale === 'nl' ? data.nl : withFallback(data.nl, data.en);
}

export async function getSettings() {
  const [entry] = await getCollection('settings');
  if (!entry) throw new Error('Instellingen ontbreken: src/content/settings/site.yml');
  return entry.data;
}

/** Splitst een id als "nl/mijn-bericht" in taal en slug. */
function splitId(id: string): { locale: Locale; slug: string } {
  const [locale, ...rest] = id.split('/');
  if (!locales.includes(locale as Locale)) throw new Error(`Onbekende taalmap in "${id}"`);
  return { locale: locale as Locale, slug: rest.join('/') };
}

export interface Post {
  entry: CollectionEntry<'nieuws'>;
  slug: string;
  /** Taal van de tekst van dit bericht. */
  locale: Locale;
  url: string;
  /** URL's van alle taalversies van dit bericht. */
  translations: Partial<Record<Locale, string>>;
}

const showDrafts = import.meta.env.DEV;

async function allPosts(): Promise<Post[]> {
  const entries = await getCollection('nieuws', ({ data }) => showDrafts || !data.draft);
  const posts = entries.map((entry) => {
    const { locale, slug } = splitId(entry.id);
    return { entry, slug, locale, url: postUrl(slug, locale), translations: {} } as Post;
  });
  for (const post of posts) {
    for (const other of posts) {
      if (other.slug === post.slug) post.translations[other.locale] = other.url;
    }
  }
  return posts.sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());
}

/**
 * Berichten voor een taal, nieuwste eerst. Op de Engelse site verschijnen ook berichten
 * die alleen in het Nederlands bestaan (met een label), zodat het nieuws daar niet leeg is.
 */
export async function getPosts(locale: Locale, { includeUntranslated = true } = {}): Promise<Post[]> {
  const posts = await allPosts();
  if (locale === 'nl') return posts.filter((post) => post.locale === 'nl');
  return posts.filter(
    (post) => post.locale === 'en' || (includeUntranslated && post.locale === 'nl' && !post.translations.en),
  );
}

/** Berichten die een eigen pagina krijgen in de gegeven taal. */
export async function getPostPages(locale: Locale): Promise<Post[]> {
  return (await allPosts()).filter((post) => post.locale === locale);
}

export interface Project {
  entry: CollectionEntry<'projecten'>;
  slug: string;
  locale: Locale;
}

/** Projecten, nieuwste eerst; ontbreekt een Engelse tekst, dan wordt de Nederlandse getoond. */
export async function getProjects(locale: Locale): Promise<Project[]> {
  const entries = await getCollection('projecten');
  const bySlug = new Map<string, Partial<Record<Locale, CollectionEntry<'projecten'>>>>();
  for (const entry of entries) {
    const { locale: entryLocale, slug } = splitId(entry.id);
    bySlug.set(slug, { ...bySlug.get(slug), [entryLocale]: entry });
  }
  const projects: Project[] = [];
  for (const [slug, versions] of bySlug) {
    const entry = versions[locale] ?? versions.nl;
    if (entry) projects.push({ entry, slug, locale: versions[locale] ? locale : 'nl' });
  }
  return projects.sort((a, b) => b.entry.data.year - a.entry.data.year);
}

export type Person = CollectionEntry<'mensen'>;

export async function getPeople(group: Person['data']['group']): Promise<Person[]> {
  const people = await getCollection('mensen', ({ data }) => data.group === group);
  return people.sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

export async function resolvePeople(refs: { collection: 'mensen'; id: string }[]): Promise<Person[]> {
  return getEntries(refs);
}

export function localized(value: { nl?: string; en?: string } | undefined, locale: Locale): string {
  if (!value) return '';
  return value[locale] || value.nl || '';
}
