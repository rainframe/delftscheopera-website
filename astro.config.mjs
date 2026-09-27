// @ts-check
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';

/**
 * Lists every page that still contains a visible placeholder
 * (<mark class="todo">) after a build, so nothing unfinished goes live unnoticed.
 * @returns {import('astro').AstroIntegration}
 */
function todoReport() {
  return {
    name: 'todo-report',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const hits = [];
        for (const entry of await readdir(root, { recursive: true })) {
          if (!entry.endsWith('.html')) continue;
          const html = await readFile(join(root, entry), 'utf8');
          const count = html.match(/class="todo"/g)?.length ?? 0;
          if (count) hits.push(`${entry} (${count})`);
        }
        if (hits.length) {
          logger.warn(`Nog ${hits.length} pagina's met placeholders:\n  ${hits.join('\n  ')}`);
        } else {
          logger.info('Geen placeholders meer gevonden.');
        }
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
  site: 'https://delftscheopera.nl',
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
  integrations: [sitemap(), todoReport()],
});
