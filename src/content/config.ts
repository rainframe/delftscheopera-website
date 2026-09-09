import { defineCollection, z } from 'astro:content';

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const productiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    titel: z.string(),
    jaar: z.number(),
    afbeelding: z.string().optional(),
    quote: z.string().optional(),
    quoteBron: z.string().optional(),
    recensieUrl: z.string().optional(),
    volgorde: z.number().default(10),
  }),
});

export const collections = {
  pages: pagesCollection,
  producties: productiesCollection,
};
