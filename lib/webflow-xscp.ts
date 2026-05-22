/**
 * Builds a valid Webflow XscpData JSON payload that wraps generated
 * HTML/CSS/JS inside an HtmlEmbed node.
 *
 * Format confirmed from real Webflow clipboard payloads and the icon-butler
 * open-source Webflow extension.
 *
 * Users paste with Cmd+V (Mac) / Ctrl+V (Win) in Webflow Designer;
 * the clipboard must carry `application/json` which `writeClipboardXscp`
 * from the `webflow-clipboard` package handles.
 */

import { generateWebflowElement } from '@/lib/webflow-generator';

// ── Minimal UUID-style ID ────────────────────────────────────────────────────
function makeId(): string {
  const s = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${s()}-${s().slice(0, 4)}-${s().slice(0, 4)}-${s().slice(0, 4)}-${s()}${s().slice(0, 4)}`;
}

// ── Core builder ─────────────────────────────────────────────────────────────

/**
 * Builds the Xscp JSON string for a single HtmlEmbed node containing
 * the provided html, css (wrapped in <style>), and js (wrapped in <script>).
 */
export function buildHtmlEmbedXscp(html: string, css: string, js: string): string {
  const parts: string[] = [];
  if (html.trim()) parts.push(html.trim());
  if (css.trim()) parts.push(`<style>\n${css.trim()}\n</style>`);
  if (js.trim()) parts.push(`<script>\n${js.trim()}\n</script>`);

  const code = parts.join('\n\n');
  const hasScript = js.trim().length > 0;

  const payload = {
    type: '@webflow/XscpData',
    payload: {
      nodes: [
        {
          _id: makeId(),
          type: 'HtmlEmbed',
          tag: 'div',
          classes: [],
          children: [],
          v: code,
          data: {
            search: { exclude: true },
            embed: {
              meta: {
                html: code,
                div: false,
                script: hasScript,
                compilable: false,
                iframe: false,
              },
              type: 'html',
            },
            insideRTE: false,
          },
        },
      ],
      styles: [],
      assets: [],
      ix1: [],
      ix2: {
        interactions: [],
        events: [],
        actionLists: [],
      },
    },
    meta: {
      unlinkedSymbolCount: 0,
      droppedLinks: 0,
      dynBindRemovedCount: 0,
      dynListBindRemovedCount: 0,
      paginationRemovedCount: 0,
    },
  };

  return JSON.stringify(payload);
}

/**
 * Extracts HTML/CSS/JS from a markdown guide and returns Xscp JSON string.
 * Returns null if the guide has no extractable code blocks.
 */
export function buildXscpFromGuide(guide: string): string | null {
  const element = generateWebflowElement(guide);
  const hasContent =
    element.html.trim() &&
    !element.html.includes('<!-- HTML no detectado');

  if (!hasContent && !element.css.trim() && !element.js.trim()) return null;

  return buildHtmlEmbedXscp(element.html, element.css, element.js);
}
