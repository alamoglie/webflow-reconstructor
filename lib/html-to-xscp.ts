/**
 * Converts parsed HTML + CSS into a Webflow XscpData payload with
 * NATIVE element nodes (Block, Heading, Link, Image, List, etc.) and
 * proper class style objects — the same format Webflow Designer produces
 * when you copy/paste elements.
 *
 * This runs in the browser only (uses DOMParser).
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface XscpNode {
  _id: string;
  tag?: string;
  type?: string;
  classes?: string[];
  children?: string[];
  data?: Record<string, unknown>;
  text?: boolean;
  v?: string;
}

interface XscpStyle {
  _id: string;
  fake: boolean;
  type: 'class';
  name: string;
  namespace: string;
  comb: string;
  styleLess: string;
  variants: Record<string, { styleLess: string }>;
  children: string[];
  selector: null;
}

interface StyleEntry {
  id: string;
  styleLess: string;
  variants: Record<string, { styleLess: string }>;
}

// ── ID generator ─────────────────────────────────────────────────────────────

function uid(): string {
  const h = () =>
    Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  return `${h().slice(0, 8)}-${h().slice(0, 4)}-${h().slice(0, 4)}-${h().slice(0, 4)}-${h()}${h().slice(0, 4)}`;
}

// ── CSS parser ───────────────────────────────────────────────────────────────

// Webflow breakpoint variant names for CSS media queries
const MQ_VARIANT: Record<string, string> = {
  '991': 'medium',   // tablet
  '767': 'small',    // mobile landscape
  '479': 'tiny',     // mobile portrait
};

function parseStyleLess(propsStr: string): string {
  return propsStr
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .join('; ');
}

/**
 * Parses a CSS string and returns a map of className → StyleEntry.
 * Only handles simple single-class selectors (.foo) and pseudo-classes
 * (.foo:hover). Complex/descendant selectors are intentionally ignored
 * since Webflow manages those with its own class combinator system.
 */
export function parseCSSToStyleMap(css: string): Map<string, StyleEntry> {
  const map = new Map<string, StyleEntry>();

  // Remove CSS comments
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Simple class selector: .classname { ... } or .classname:pseudo { ... }
  // Must start with . and have no spaces before { (avoids descendant selectors)
  const classRule = /\.([a-zA-Z][a-zA-Z0-9_-]*)(?::([\w-]+))?\s*\{([^}]+)\}/g;

  let m: RegExpExecArray | null;
  while ((m = classRule.exec(clean)) !== null) {
    const [, name, pseudo, propsRaw] = m;
    const styleLess = parseStyleLess(propsRaw);

    const entry = map.get(name) ?? { id: uid(), styleLess: '', variants: {} };

    if (!pseudo) {
      entry.styleLess = styleLess;
    } else {
      // Map CSS pseudo to Webflow variant key
      const variantKey =
        pseudo === 'hover' ? 'hover' :
        pseudo === 'focus' ? 'focus' :
        pseudo === 'active' ? 'pressed' :
        pseudo === 'visited' ? 'visited' :
        null;
      if (variantKey) entry.variants[variantKey] = { styleLess };
    }

    map.set(name, entry);
  }

  // Parse @media blocks for responsive variants
  const mediaRule = /@media[^{]*\(max-width:\s*(\d+)px\)[^{]*\{([\s\S]*?)\}\s*\}/g;
  while ((m = mediaRule.exec(clean)) !== null) {
    const [, px, block] = m;
    const variantKey = MQ_VARIANT[px];
    if (!variantKey) continue;

    const innerRule = /\.([a-zA-Z][a-zA-Z0-9_-]*)\s*\{([^}]+)\}/g;
    let inner: RegExpExecArray | null;
    while ((inner = innerRule.exec(block)) !== null) {
      const [, name, propsRaw] = inner;
      const entry = map.get(name) ?? { id: uid(), styleLess: '', variants: {} };
      entry.variants[variantKey] = { styleLess: parseStyleLess(propsRaw) };
      map.set(name, entry);
    }
  }

  return map;
}

// ── Element type mapping ──────────────────────────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  // Layout / semantic blocks
  div: 'Block', section: 'Block', article: 'Block',
  main: 'Block', header: 'Block', footer: 'Block',
  nav: 'Block', aside: 'Block', figure: 'Block',
  figcaption: 'Block', address: 'Block',
  // Inline-ish (mapped to Block; Webflow treats them as Block with tag)
  span: 'Block', strong: 'Block', em: 'Block', small: 'Block', label: 'Block',
  // Specific types
  a: 'Link',
  img: 'Image',
  h1: 'Heading', h2: 'Heading', h3: 'Heading',
  h4: 'Heading', h5: 'Heading', h6: 'Heading',
  p: 'Block',          // Webflow's "Paragraph" compiles to Block with tag=p
  ul: 'List', ol: 'List',
  li: 'ListItem',
  button: 'Block',     // Webflow "Button" — basic block works
  blockquote: 'Block',
  pre: 'Block', code: 'Block',
};

function wfType(tag: string): string {
  return TYPE_MAP[tag] ?? 'Block';
}

// ── Node data builder ─────────────────────────────────────────────────────────

function buildData(el: Element): Record<string, unknown> {
  const tag = el.tagName.toLowerCase();
  const base: Record<string, unknown> = { tag };

  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '#';
    const isAnchor = href.startsWith('#');
    base.attr = { href };
    base.link = { url: href, mode: isAnchor ? 'section' : 'external' };
  }

  if (tag === 'img') {
    base.attr = {
      src: el.getAttribute('src') ?? '',
      alt: el.getAttribute('alt') ?? '',
      loading: 'lazy',
    };
  }

  if (tag === 'input' || tag === 'textarea') {
    const placeholder = el.getAttribute('placeholder');
    const type = el.getAttribute('type') ?? 'text';
    base.attr = { type, ...(placeholder ? { placeholder } : {}) };
  }

  return base;
}

// ── DOM walker ────────────────────────────────────────────────────────────────

function walkNode(
  el: Element,
  styleMap: Map<string, StyleEntry>,
  out: XscpNode[]
): string {
  const id = uid();
  const tag = el.tagName.toLowerCase();

  // Map element classes to Webflow style IDs
  const classIds = Array.from(el.classList)
    .filter((c) => styleMap.has(c))
    .map((c) => styleMap.get(c)!.id);

  // Push parent node FIRST (Webflow uses top-down order in nodes array)
  const node: XscpNode = {
    _id: id,
    tag,
    type: wfType(tag),
    classes: classIds,
    children: [],
    data: buildData(el),
  };
  out.push(node);

  // Walk children
  for (const child of el.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childId = walkNode(child as Element, styleMap, out);
      node.children!.push(childId);
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim() ?? '';
      if (text) {
        const textId = uid();
        out.push({ _id: textId, text: true, v: text });
        node.children!.push(textId);
      }
    }
  }

  return id;
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface XscpConvertResult {
  xscp: string;
  nodeCount: number;
  styleCount: number;
}

/**
 * Converts HTML + CSS strings into a full @webflow/XscpData JSON payload
 * with native Block / Heading / Link / Image nodes and class-based styles.
 *
 * Returns null if there are no parseable top-level elements.
 */
export function htmlCssToXscp(html: string, css: string): XscpConvertResult | null {
  if (typeof window === 'undefined') return null; // browser only

  // 1. Parse CSS
  const styleMap = parseCSSToStyleMap(css);

  // 2. Build styles array
  const styles: XscpStyle[] = Array.from(styleMap.entries()).map(([name, e]) => ({
    _id: e.id,
    fake: false,
    type: 'class' as const,
    name,
    namespace: '',
    comb: '',
    styleLess: e.styleLess,
    variants: e.variants,
    children: [],
    selector: null,
  }));

  // 3. Parse HTML
  // Normalise: strip any top-level <style>/<script>/<link> tags that
  // DOMParser would hoist into <head>, leaving body children empty.
  const bodyOnlyHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .trim();

  const parser = new DOMParser();
  const doc = parser.parseFromString(bodyOnlyHtml || html, 'text/html');

  const nodes: XscpNode[] = [];
  const topLevel = Array.from(doc.body.children);

  console.debug('[html-to-xscp] topLevel count:', topLevel.length, '| styleMap size:', styleMap.size);

  if (topLevel.length === 0) return null;

  // Webflow requires exactly ONE root node in the pasted payload.
  // If there are multiple top-level siblings we always wrap them in a
  // single Block so the Designer never sees "more than one root".
  if (topLevel.length === 1) {
    walkNode(topLevel[0], styleMap, nodes);
  } else {
    const wrapperId = uid();
    const wrapperNode: XscpNode = {
      _id: wrapperId,
      tag: 'div',
      type: 'Block',
      classes: [],
      children: [],
      data: { tag: 'div' },
    };
    nodes.push(wrapperNode);

    for (const el of topLevel) {
      const childId = walkNode(el, styleMap, nodes);
      wrapperNode.children!.push(childId);
    }
  }

  if (nodes.length === 0) return null;

  // 4. Assemble payload
  const payload = {
    type: '@webflow/XscpData',
    payload: {
      nodes,
      styles,
      assets: [],
      ix1: [],
      ix2: { interactions: [], events: [], actionLists: [] },
    },
    meta: {
      unlinkedSymbolCount: 0,
      droppedLinks: 0,
      dynBindRemovedCount: 0,
      dynListBindRemovedCount: 0,
      paginationRemovedCount: 0,
    },
  };

  return {
    xscp: JSON.stringify(payload),
    nodeCount: nodes.length,
    styleCount: styles.length,
  };
}
