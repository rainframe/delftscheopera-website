import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    pages: collection({
      label: "Pagina's",
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        description: fields.text({ label: 'Korte beschrijving (voor SEO)', multiline: true }),
        content: fields.document({
          label: 'Inhoud',
          formatting: true,
          dividers: true,
          links: true,
          images: true,
        }),
      },
    }),
    producties: collection({
      label: 'Producties',
      slugField: 'titel',
      path: 'src/content/producties/*',
      format: { contentField: 'beschrijving' },
      schema: {
        titel: fields.slug({ name: { label: 'Titel' } }),
        jaar: fields.integer({ label: 'Jaar' }),
        afbeelding: fields.text({ label: 'Afbeelding pad (bijv. /images/producties/carmen.jpg)' }),
        quote: fields.text({ label: 'Citaat (optioneel)', multiline: true }),
        quoteBron: fields.text({ label: 'Bron van citaat (optioneel)' }),
        recensieUrl: fields.url({ label: 'Link naar recensie (optioneel)' }),
        volgorde: fields.integer({ label: 'Sorteervolgorde (1 = nieuwste)', defaultValue: 10 }),
        beschrijving: fields.document({
          label: 'Beschrijving',
          formatting: true,
          links: true,
        }),
      },
    }),
  },
});
