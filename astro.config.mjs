import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.stichtingdoc.nl',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    keystatic(),
  ],
});
