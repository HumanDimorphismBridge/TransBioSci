import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DIRECTIONS, LOCALES } from './i18n/config';

const idPattern = /^[a-z][a-z0-9-]*$/;

const localized = z.object({ 'zh-CN': z.string().min(1), en: z.string().min(1) }).strict();

const projection = z.object({ title: z.string().min(1), body: z.string().min(1) }).strict();

/** Content node: content/nodes/<id>/node.yaml. The collection ID is the folder name. */
const nodes = defineCollection({
  loader: glob({
    pattern: '*/node.yaml',
    base: './content/nodes',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z
    .object({
      id: z.string().regex(idPattern),
      projections: z.object(Object.fromEntries(LOCALES.map((l) => [l, projection])) as Record<
        (typeof LOCALES)[number],
        typeof projection
      >).strict(),
      relations: z
        .object({
          direction: z.array(z.enum(DIRECTIONS)).min(1),
          tissue: z.array(z.string().regex(idPattern)).default([]),
        })
        .strict(),
    })
    .strict(),
});

/** Markdown bodies referenced by node projections. ID: "<node-id>/<locale>". */
const bodies = defineCollection({
  loader: glob({
    pattern: '*/*.md',
    base: './content/nodes',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({}),
});

export type NavItem = { node: string } | { label: z.infer<typeof localized>; children: NavItem[] };

const navItem: z.ZodType<NavItem> = z.union([
  z.object({ node: z.string().regex(idPattern) }).strict(),
  z
    .object({
      label: localized,
      get children() {
        return z.array(navItem).min(1);
      },
    })
    .strict(),
]);

/** Navigation config per knowledge base: content/navigation/<kb>.yaml. */
const navigation = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './content/navigation' }),
  schema: z
    .object({
      intros: z.object(Object.fromEntries(DIRECTIONS.map((d) => [d, z.string().regex(idPattern)])) as Record<
        (typeof DIRECTIONS)[number],
        z.ZodString
      >).strict(),
      tree: z.array(navItem),
    })
    .strict(),
});

/** Tissue registry: content/tissues.yaml (single entry, order preserved). */
const tissues = defineCollection({
  loader: glob({ pattern: 'tissues.yaml', base: './content' }),
  schema: z
    .object({
      tissues: z.array(
        z
          .object({
            id: z.string().regex(/^tissue-[a-z0-9-]+$/),
            names: localized,
            figure: z.string().regex(idPattern),
          })
          .strict(),
      ),
    })
    .strict(),
});

export const collections = { nodes, bodies, navigation, tissues };
