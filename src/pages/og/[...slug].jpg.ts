import type { APIRoute, GetStaticPaths } from 'astro';
import { locales } from '@/i18n/routes';
import { getPostPages, type Post } from '@/lib/content';
import { renderShareImage, shareImagePath } from '@/lib/share-image';

/** Eén deelafbeelding per bericht per taal, bijvoorbeeld /og/nieuws/mijn-bericht-1a2b3c4d5e.jpg. */
export const getStaticPaths = (async () => {
  const posts = (await Promise.all(locales.map((locale) => getPostPages(locale)))).flat();
  return posts.map((post) => ({
    params: {
      slug: shareImagePath(post)
        .replace(/^\/og\//, '')
        .replace(/\.jpg$/, ''),
    },
    props: { post },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = async ({ props }) => {
  const image = await renderShareImage(props.post);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/jpeg' } });
};
