import type { APIContext } from 'astro';
import { getSettings } from '@/lib/content';

/** robots.txt: alles dicht tot de lancering (instelling "Website gelanceerd"). */
export async function GET({ site }: APIContext) {
  const { launched } = await getSettings();
  const sitemap = new URL('/sitemap-index.xml', site ?? 'https://delftscheopera.nl').href;
  const body = launched
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /cms/\n\nSitemap: ${sitemap}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
