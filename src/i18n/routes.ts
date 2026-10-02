export const locales = ['nl', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'nl';

/** Vaste pagina's met hun URL per taal. */
export const routes = {
  home: { nl: '/', en: '/en/' },
  communityOpera: { nl: '/community-opera-2028/', en: '/en/community-opera-2028/' },
  nieuws: { nl: '/nieuws/', en: '/en/news/' },
  projecten: { nl: '/projecten/', en: '/en/projects/' },
  organisatie: { nl: '/organisatie/', en: '/en/organisation/' },
  contact: { nl: '/contact/', en: '/en/contact/' },
  steunen: { nl: '/steunen/', en: '/en/support/' },
  anbi: { nl: '/anbi/', en: '/en/anbi/' },
  privacy: { nl: '/privacy/', en: '/en/privacy/' },
  /** Hierheen stuurt de nieuwsbriefdienst nieuwe aanmeldingen; staat niet in de sitemap. */
  nieuwsbriefBedankt: { nl: '/nieuwsbrief/bedankt/', en: '/en/newsletter/thanks/' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/**
 * Pagina's in het hoofdmenu, in deze volgorde. De homepage zit achter het logo; Projecten, ANBI,
 * Privacy en Contact staan in de footer.
 */
export const mainNav: RouteKey[] = ['communityOpera', 'nieuws', 'steunen', 'organisatie'];

export function pageUrl(key: RouteKey, locale: Locale): string {
  return routes[key][locale];
}

export function postUrl(slug: string, locale: Locale): string {
  return `${routes.nieuws[locale]}${slug}/`;
}

/** URL's van dezelfde pagina in elke taal, voor de taalwisselaar en hreflang. */
export type Alternates = Partial<Record<Locale, string>>;

export function alternatesFor(key: RouteKey): Alternates {
  return { ...routes[key] };
}

export function localeFromUrl(url: URL): Locale {
  return url.pathname === '/en' || url.pathname.startsWith('/en/') ? 'en' : 'nl';
}
