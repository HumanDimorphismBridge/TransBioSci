/**
 * Build-time knowledge content model with integrity checks.
 * Any inconsistency throws, so `astro build` fails instead of publishing a broken site.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { DIRECTIONS, LOCALES, LOCALE_OF, type Direction, type Lang, type Locale } from '../i18n/config';
import type { NavItem } from '../content.config';

export type ContentNode = CollectionEntry<'nodes'>['data'] & {
  bodies: Record<Locale, CollectionEntry<'bodies'>>;
};

export type Tissue = CollectionEntry<'tissues'>['data']['tissues'][number];

export type Localized = Record<Locale, string>;

/** Navigation tree after filtering for one direction. */
export type TreeItem =
  | { kind: 'node'; id: string }
  | { kind: 'group'; key: string; label: Localized; children: TreeItem[] };

export interface SiteContent {
  nodes: Map<string, ContentNode>;
  tissues: Tissue[];
  intros: Record<Direction, string>;
  /** Raw navigation tree for the Trans knowledge base. */
  tree: NavItem[];
  /** Nodes that have an article page (appear in the tree). */
  articleIds: Set<string>;
}

const figureFiles = import.meta.glob('../assets/figures/*.svg', { query: '?raw', import: 'default', eager: true });

export const FIGURES: Record<string, string> = Object.fromEntries(
  Object.entries(figureFiles).map(([path, svg]) => [path.split('/').pop()!.replace(/\.svg$/, ''), svg as string]),
);

let cache: Promise<SiteContent> | undefined;

export function loadContent(): Promise<SiteContent> {
  cache ??= build();
  return cache;
}

async function build(): Promise<SiteContent> {
  const errors: string[] = [];
  const [nodeEntries, bodyEntries, navEntries, tissueEntries] = await Promise.all([
    getCollection('nodes'),
    getCollection('bodies'),
    getCollection('navigation'),
    getCollection('tissues'),
  ]);

  // Tissue registry
  const tissueDoc = tissueEntries.find((e) => e.id === 'tissues');
  if (!tissueDoc) throw new Error('content/tissues.yaml is missing');
  const tissues = tissueDoc.data.tissues;
  const tissueIds = new Set<string>();
  for (const tissue of tissues) {
    if (tissueIds.has(tissue.id)) errors.push(`Duplicate tissue ID: ${tissue.id}`);
    tissueIds.add(tissue.id);
    if (!(tissue.figure in FIGURES)) errors.push(`Tissue ${tissue.id}: figure "${tissue.figure}" not found in src/assets/figures/`);
  }

  // Nodes and projections
  const bodiesById = new Map(bodyEntries.map((b) => [b.id, b]));
  const usedBodies = new Set<string>();
  const nodes = new Map<string, ContentNode>();
  for (const entry of nodeEntries) {
    const data = entry.data;
    if (data.id !== entry.id) errors.push(`content/nodes/${entry.id}/node.yaml: id "${data.id}" must match its folder name`);
    const bodies = {} as Record<Locale, CollectionEntry<'bodies'>>;
    for (const locale of LOCALES) {
      const ref = data.projections[locale].body;
      const match = /^\.\/([^/]+)\.md$/.exec(ref);
      const bodyId = match ? `${entry.id}/${match[1]}` : undefined;
      const body = bodyId ? bodiesById.get(bodyId) : undefined;
      if (!body) {
        errors.push(`Node ${entry.id}: ${locale} body "${ref}" not found (expected ./<file>.md next to node.yaml)`);
        continue;
      }
      usedBodies.add(body.id);
      bodies[locale] = body;
    }
    for (const tissue of data.relations.tissue) {
      if (!tissueIds.has(tissue)) errors.push(`Node ${entry.id}: unknown tissue "${tissue}"`);
    }
    nodes.set(entry.id, { ...data, bodies });
  }
  for (const body of bodyEntries) {
    if (!usedBodies.has(body.id)) errors.push(`content/nodes/${body.id}.md is not referenced by any node projection`);
  }

  // Navigation
  const nav = navEntries.find((e) => e.id === 'trans');
  if (!nav) throw new Error('content/navigation/trans.yaml is missing');
  const intros = nav.data.intros as Record<Direction, string>;
  const introIds = new Set(Object.values(intros));
  for (const dir of DIRECTIONS) {
    const node = nodes.get(intros[dir]);
    if (!node) errors.push(`Navigation: intro "${intros[dir]}" for ${dir} does not exist`);
    else if (!node.relations.direction.includes(dir)) errors.push(`Navigation: intro "${intros[dir]}" does not apply to ${dir}`);
  }
  const articleIds = new Set<string>();
  const walk = (items: NavItem[]) => {
    for (const item of items) {
      if ('node' in item) {
        if (!nodes.has(item.node)) errors.push(`Navigation: node "${item.node}" does not exist`);
        else if (introIds.has(item.node)) errors.push(`Navigation: intro node "${item.node}" must not appear in the tree`);
        else if (articleIds.has(item.node)) errors.push(`Navigation: node "${item.node}" appears more than once`);
        articleIds.add(item.node);
      } else walk(item.children);
    }
  };
  walk(nav.data.tree);
  for (const id of nodes.keys()) {
    if (!articleIds.has(id) && !introIds.has(id)) errors.push(`Node ${id} is neither an intro nor in the navigation tree`);
  }

  if (errors.length) throw new Error(`Content validation failed:\n- ${errors.join('\n- ')}`);
  return { nodes, tissues, intros, tree: nav.data.tree, articleIds };
}

/** Title of a node in the given interface language. */
export function nodeTitle(node: ContentNode, lang: Lang): string {
  return node.projections[LOCALE_OF[lang]].title;
}

export function appliesTo(node: ContentNode, dir: Direction): boolean {
  return node.relations.direction.includes(dir);
}

/** Navigation tree for one direction: hides nodes outside the direction and empty groups. */
export function treeFor(content: SiteContent, dir: Direction): TreeItem[] {
  const filter = (items: NavItem[], prefix: string): TreeItem[] =>
    items.flatMap((item, index): TreeItem[] => {
      if ('node' in item) {
        const node = content.nodes.get(item.node)!;
        return appliesTo(node, dir) ? [{ kind: 'node', id: item.node }] : [];
      }
      const key = `${prefix}${index}`;
      const children = filter(item.children, `${key}-`);
      return children.length ? [{ kind: 'group', key, label: item.label, children }] : [];
    });
  return filter(content.tree, 'g');
}

/** Group labels from the root to a node in the given tree, or undefined when absent. */
export function groupPath(items: TreeItem[], nodeId: string): Localized[] | undefined {
  for (const item of items) {
    if (item.kind === 'node') {
      if (item.id === nodeId) return [];
    } else {
      const inner = groupPath(item.children, nodeId);
      if (inner) return [item.label, ...inner];
    }
  }
  return undefined;
}

/** Article nodes that apply to a direction and relate to a tissue, in navigation order. */
export function articlesForTissue(content: SiteContent, dir: Direction, tissueId: string): ContentNode[] {
  const ordered: string[] = [];
  const collect = (items: TreeItem[]) =>
    items.forEach((i) => (i.kind === 'node' ? ordered.push(i.id) : collect(i.children)));
  collect(treeFor(content, dir));
  return ordered.map((id) => content.nodes.get(id)!).filter((n) => n.relations.tissue.includes(tissueId));
}
