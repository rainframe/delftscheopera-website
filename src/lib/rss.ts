import rss from '@astrojs/rss';
import { getImage } from 'astro:assets';
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
  const site = context.site ?? new URL('https://delftscheopera.nl');
  const items = await Promise.all(
    posts.map(async (post) => {
      const { title, summary, date, cover } = post.entry.data;
      // De omslagfoto als bijlage, zodat nieuwsbrief- en social-media-tools er een plaatje bij tonen.
      const image = cover && (await getImage({ src: cover, width: 1200, format: 'jpg' }));
      return {
        title,
        description: summary,
        pubDate: date,
        link: post.url,
        ...(image && { enclosure: { url: new URL(image.src, site).href, length: 0, type: 'image/jpeg' } }),
      };
    }),
  );
  return rss({
    ...feeds[locale],
    site,
    items,
    customData: `<language>${htmlLang[locale].toLowerCase()}</language>`,
  });
}
