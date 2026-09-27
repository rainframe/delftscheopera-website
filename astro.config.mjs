// @ts-check
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
            src: ['./node_modules/@fontsource-variable/league-spartan/files/league-spartan-latin-wght-normal.woff2'],
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
  integrations: [sitemap(), todoReport()],
});
