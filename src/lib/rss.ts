import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from './content';
import { htmlLang } from '@/i18n/ui';
import type { Locale } from '@/i18n/routes';

const feeds = {
  nl: { title: 'Delftsche Opera – Nieuws', description: 'Nieuws en verhalen van de Delftsche Opera.' },
  en: { title: 'Delftsche Opera – News', description: 'News and stories from Delftsche Opera.' },
} satisfies Record<Locale, { title: string; description: string }>;

/** RSS-feed met de berichten in één taal (bruikbaar voor nieuwsbrief- en social-media-tools). */
export async function newsFeed(locale: Locale, context: APIContext) {
  const posts = await getPosts(locale, { includeUntranslated: false });
  return rss({
    ...feeds[locale],
    site: context.site ?? 'https://delftscheopera.nl',
    items: posts.map((post) => ({
      title: post.entry.data.title,
      description: post.entry.data.summary,
      pubDate: post.entry.data.date,
      link: post.url,
    })),
    customData: `<language>${htmlLang[locale].toLowerCase()}</language>`,
  });
}
