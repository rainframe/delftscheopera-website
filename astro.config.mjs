// @ts-check
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { routes } from './src/i18n/routes.ts';

const site = 'https://delftscheopera.nl';

/** Pagina's die niet in de sitemap horen. */
const unlisted = Object.values(routes.nieuwsbriefBedankt).map((path) => new URL(path, site).href);

/**
 * Lists every visible placeholder (class "todo") left after a build, grouped by text, so nothing
 * unfinished goes live unnoticed. Placeholders in the footer appear on every page and are listed
 * once.
 * @returns {import('astro').AstroIntegration}
 */
function todoReport() {
  return {
    name: 'todo-report',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        /** @type {Map<string, string[]>} placeholder text → pages */
        const todos = new Map();
        let pageCount = 0;
        for (const entry of await readdir(root, { recursive: true })) {
          // admin/ is het CMS, geen pagina van de site.
          if (!entry.endsWith('.html') || entry.startsWith('admin')) continue;
          pageCount++;
          const html = await readFile(join(root, entry), 'utf8');
          for (const [, , inner] of html.matchAll(/<(p|mark)\b[^>]*class="todo"[^>]*>([\s\S]*?)<\/\1>/g)) {
            const text = inner
              .replace(/<[^>]+>/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            const label = text.length > 80 ? `${text.slice(0, 77)}…` : text;
            todos.set(label, [...(todos.get(label) ?? []), entry]);
          }
        }
        if (!todos.size) {
          logger.info('Geen placeholders meer gevonden.');
          return;
        }
        const lines = [...todos].map(
          ([label, pages]) =>
            `${label}\n    ${pages.length === pageCount ? `op alle ${pageCount} pagina's` : pages.join(', ')}`,
        );
        logger.warn(`Nog ${todos.size} placeholders:\n  ${lines.join('\n  ')}`);
      },
    },
  };
}

/**
 * Het CMS slaat afbeeldingen op in src/assets/uploads/ en schrijft paden als
 * `/src/assets/uploads/foto.jpg`. In frontmatter begrijpt Astro dat, maar in de tekst van een
 * bericht optimaliseert Astro alleen relatieve paden en aliassen. Deze plug-in zet zulke paden
 * daarom om naar de alias `@/assets/uploads/foto.jpg`.
 * @type {import('satteri').MdastPluginDefinition}
 */
const cmsImagePaths = {
  name: 'cms-image-paths',
  image(node, ctx) {
    if (node.url?.startsWith('/src/')) {
      ctx.setProperty(node, 'url', `@/${node.url.slice('/src/'.length)}`);
    }
  },
};

/**
 * Een alinea die begint met "TODO:" is een placeholder voor tekst die nog moet komen. Die wordt
 * geel gemarkeerd (class "todo") en telt mee in het build-rapport hieronder. Het CMS laat zo'n
 * alinea ongemoeid, anders dan HTML, die het in gewone tekst zou omzetten.
 * @type {import('satteri').MdastPluginDefinition}
 */
const todoParagraphs = {
  name: 'todo-paragraphs',
  paragraph(node, ctx) {
    const first = node.children?.[0];
    if (first?.type === 'text' && first.value.startsWith('TODO:')) {
      ctx.setProperty(first, 'value', first.value.replace(/^TODO:\s*/, ''));
      ctx.setProperty(node, 'data', { hProperties: { className: ['todo'] } });
    }
  },
};

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'always',
  i18n: {
    locales: ['nl', 'en'],
    defaultLocale: 'nl',
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'League Spartan',
      cssVariable: '--font-spartan',
      fallbacks: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      options: {
        variants: [
          {
            src: [
              './node_modules/@fontsource-variable/league-spartan/files/league-spartan-latin-wght-normal.woff2',
            ],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
  ],
  image: {
    layout: 'constrained',
  },
  markdown: {
    processor: satteri({ mdastPlugins: [cmsImagePaths, todoParagraphs] }),
  },
  integrations: [sitemap({ filter: (page) => !unlisted.includes(page) }), todoReport()],
});
