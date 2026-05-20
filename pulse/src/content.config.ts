import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const digest = defineCollection({
  loader: glob({ base: './src/content/digest', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    themes: z.array(z.string()).default([]),
    featuredLinks: z.array(z.string()).default([]),
    shareText: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { digest };
