// Kopieert Sveltia CMS uit node_modules naar public/admin/, zodat het beheer de vastgezette
// versie uit package-lock.json gebruikt (in plaats van een CDN). Draait automatisch voor
// `npm run dev` en `npm run build`; bijwerken gaat met `npm update @sveltia/cms`.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/@sveltia/cms/dist');
const target = join(root, 'public/admin');

for (const file of ['sveltia-cms.js', 'chunks/react-dom.js']) {
  await mkdir(dirname(join(target, file)), { recursive: true });
  await copyFile(join(source, file), join(target, file));
}

// Lettertype voor het voorbeeldvenster (preview.css)
await copyFile(
  join(root, 'node_modules/@fontsource-variable/league-spartan/files/league-spartan-latin-wght-normal.woff2'),
  join(target, 'league-spartan.woff2'),
);
console.log('Sveltia CMS gekopieerd naar public/admin/');
