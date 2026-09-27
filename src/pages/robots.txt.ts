import type { APIContext } from 'astro';
import { getSettings } from '@/lib/content';

/** robots.txt: alles dicht tot de lancering (instelling "Zichtbaar voor zoekmachines"). */
export async function GET({ site }: APIContext) {
  const { indexable } = await getSettings();
  const sitemap = new URL('/sitemap-index.xml', site ?? 'https://delftscheopera.nl').href;
  const body = indexable
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /cms/\n\nSitemap: ${sitemap}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
