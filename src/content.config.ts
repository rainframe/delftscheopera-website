/**
 * Contentmodel van de site.
 *
 * - `nieuws` en `projecten`: Markdown-bestanden per taal, in src/content/<collectie>/{nl,en}/<slug>.md.
 *   Een Engelse versie is optioneel; hetzelfde bestandsnaam koppelt de vertalingen aan elkaar.
 * - `mensen`: één YAML-bestand per persoon; vertaalbare velden hebben een `nl`- en `en`-variant.
 * - Paginateksten: één YAML-bestand per pagina in src/content/pages/, met een `nl:`- en `en:`-blok.
 *   Ontbrekende Engelse velden vallen terug op de Nederlandse tekst.
 * - `settings`: algemene gegevens (adres, KvK, e-mail, sociale media, nieuwsbrief).
 *
 * Afbeeldingen staan in src/assets/uploads/ en worden relatief vanaf het contentbestand verwezen,
 * zodat Astro ze kan optimaliseren.
 */
import { defineCollection, reference, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Tekst die per taal kan verschillen; Nederlands is verplicht. */
const localized = z.object({ nl: z.string(), en: z.string().optional() });

const seo = z.object({ title: z.string(), description: z.string() });

/** Maakt alle velden (ook in geneste blokken) optioneel, voor vertalingen die maar een deel overschrijven. */
function deepPartial(schema: z.ZodType): z.ZodType {
  if (!(schema instanceof z.ZodObject)) return schema;
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => [key, deepPartial(value as z.ZodType).optional()]),
  );
  return z.object(shape);
}

/** Nederlandse tekst verplicht, Engelse vertaling optioneel en mag onvolledig zijn. */
function localizedPage<T extends z.ZodObject>(schema: T) {
  return z.object({ nl: schema, en: (deepPartial(schema) as z.ZodType<Partial<z.infer<T>>>).optional() });
}

/** Collectie met één YAML-bestand (bijv. src/content/pages/home.yml) met een nl- en en-blok. */
function page<T extends z.ZodObject>(name: string, schema: T) {
  return defineCollection({
    loader: glob({ pattern: `${name}.yml`, base: './src/content/pages' }),
    schema: localizedPage(schema),
  });
}

const nieuws = defineCollection({
  loader: glob({ pattern: '{nl,en}/**/*.md', base: './src/content/nieuws' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      summary: z.string(),
      author: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      coverCredit: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const projecten = defineCollection({
  loader: glob({ pattern: '{nl,en}/**/*.md', base: './src/content/projecten' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      imageCredit: z.string().optional(),
      quote: z.string().optional(),
      quoteSource: z.string().optional(),
    }),
});

const mensen = defineCollection({
  loader: glob({ pattern: '*.yml', base: './src/content/mensen' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      group: z.enum(['bestuur', 'raad-van-toezicht', 'artistiek-team']),
      role: localized,
      email: z.email().optional(),
      photo: image().optional(),
      bio: z.object({ nl: z.string().optional(), en: z.string().optional() }).optional(),
      workImage: image().optional(),
      workImageAlt: localized.optional(),
      order: z.number().default(99),
    }),
});

const settings = defineCollection({
  loader: glob({ pattern: 'site.yml', base: './src/content/settings' }),
  schema: z.object({
    name: z.string(),
    /** Mogen zoekmachines de site opnemen? Pas aanzetten bij de lancering. */
    indexable: z.boolean().default(false),
    legalName: z.string(),
    email: z.email(),
    address: z.object({ street: z.string(), postcode: z.string(), city: z.string() }),
    kvk: z.string(),
    rsin: z.string(),
    iban: z.string().optional(),
    ibanName: z.string().optional(),
    socials: z.object({ instagram: z.url().optional(), linkedin: z.url().optional() }),
    /**
     * Aanmeldformulier van de nieuwsbrief. De velden komen uit de HTML-code die de dienst
     * (nu Laposta) voor een eigen formulier geeft; een andere dienst met zo'n HTML-formulier kan
     * zonder codewijziging. Zolang `action` of `emailField` ontbreekt, staat het formulier uit.
     */
    newsletter: z.object({
      /** Naam van de dienst, ter informatie. */
      provider: z.string(),
      /** Adres waar het formulier naartoe gaat (`action`). */
      action: z.url().optional(),
      /** `name` van het e-mailveld. */
      emailField: z.string().optional(),
      /** Vaste verborgen velden (bij Laposta `a` en `l`). */
      hiddenFields: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
      /** Veld voor het adres van de bedankpagina (bij Laposta `next`). */
      redirectField: z.string().optional(),
      /** Veld dat leeg moet blijven, tegen spam (bij Laposta `email`). */
      honeypotField: z.string().optional(),
    }),
    analytics: z
      .object({
        /** Token van Cloudflare Web Analytics; zonder token staat er geen statistiekscript op de site. */
        cloudflareToken: z.string().optional(),
      })
      .default({}),
  }),
});

// Losse afbeelding met alt-tekst, gebruikt in paginablokken.
const pictureFields = (image: SchemaContext['image']) => ({
  image: image(),
  imageAlt: z.string(),
});

const home = defineCollection({
  loader: glob({ pattern: 'home.yml', base: './src/content/pages' }),
  schema: ({ image }) => {
    const schema = z.object({
      seo,
      hero: z.object({
        title: z.string(),
        subtitle: z.string(),
        intro: z.string(),
        linkLabel: z.string(),
        ...pictureFields(image),
      }),
      news: z.object({ title: z.string(), moreLabel: z.string() }),
      feature: z.object({
        title: z.string(),
        subtitle: z.string(),
        year: z.string(),
        credit: z.string().optional(),
        linkLabel: z.string(),
        ...pictureFields(image),
      }),
      conductors: z.object({
        title: z.string(),
        text: z.string(),
        people: z.array(reference('mensen')),
        ...pictureFields(image),
      }),
    });
    return localizedPage(schema);
  },
});

const lustrum = defineCollection({
  loader: glob({ pattern: 'lustrum.yml', base: './src/content/pages' }),
  schema: ({ image }) => {
    const schema = z.object({
      seo,
      banner: z.object({
        title: z.string(),
        subtitle: z.string(),
        year: z.string(),
        credit: z.string().optional(),
        ...pictureFields(image),
      }),
      intro: z.object({ title: z.string(), text: z.string() }),
      krashna: z.object({
        title: z.string(),
        text: z.string(),
        linkLabel: z.string(),
        linkUrl: z.url(),
        ...pictureFields(image),
      }),
      team: z.array(reference('mensen')),
    });
    return localizedPage(schema);
  },
});

const steunOns = defineCollection({
  loader: glob({ pattern: 'steun-ons.yml', base: './src/content/pages' }),
  schema: ({ image }) => {
    const schema = z.object({
      seo,
      hero: z.object({ title: z.string(), subtitle: z.string(), ...pictureFields(image) }),
      intro: z.string(),
      ways: z.array(z.object({ title: z.string(), text: z.string() })),
      anbi: z.object({ title: z.string(), text: z.string() }),
    });
    return localizedPage(schema);
  },
});

export const collections = {
  nieuws,
  projecten,
  mensen,
  settings,
  home,
  lustrum,
  steunOns,
  nieuwsPagina: page('nieuws', z.object({ seo, title: z.string(), empty: z.string() })),
  projectenPagina: page('projecten', z.object({ seo, title: z.string(), intro: z.string() })),
  organisatie: page(
    'organisatie',
    z.object({
      seo,
      title: z.string(),
      intro: z.string(),
      boardTitle: z.string(),
      supervisoryTitle: z.string(),
      supervisoryText: z.string(),
      infoTitle: z.string(),
    }),
  ),
  contact: page('contact', z.object({ seo, title: z.string(), intro: z.string(), boardTitle: z.string() })),
  anbi: page(
    'anbi',
    z.object({
      seo,
      title: z.string(),
      status: z.string(),
      text: z.string(),
      goalTitle: z.string(),
      goal: z.string(),
      documentsTitle: z.string(),
      /** Documenten zonder `url` worden getoond als "volgt". */
      documents: z.array(z.object({ title: z.string(), url: z.string().optional() })),
    }),
  ),
  privacy: page('privacy', z.object({ seo, title: z.string(), text: z.string() })),
};
