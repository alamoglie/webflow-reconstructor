export interface WebflowElement {
  html: string;
  css: string;
  js: string;
  headLinks: string;
}

function extractCodeBlock(markdown: string, lang: string): string {
  const regex = new RegExp(
    `\`\`\`(?:${lang})\\s*\\n([\\s\\S]*?)\`\`\``,
    'gi'
  );
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    matches.push(match[1].trim());
  }
  return matches.join('\n\n');
}

function extractCDNLinks(markdown: string): string {
  const lines = markdown.split('\n');
  const cdnLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.includes('cdn.') || trimmed.includes('unpkg.com') || trimmed.includes('cdnjs.')) &&
      (trimmed.includes('<script') || trimmed.includes('<link'))
    ) {
      cdnLines.push(trimmed);
    }
  }
  return cdnLines.join('\n');
}

export function generateWebflowElement(guide: string): WebflowElement {
  const cssBlock =
    extractCodeBlock(guide, 'css') || extractCodeBlock(guide, 'style') || extractCodeBlock(guide, 'scss');
  const jsBlock =
    extractCodeBlock(guide, 'javascript') || extractCodeBlock(guide, 'js');
  const htmlBlock = extractCodeBlock(guide, 'html');
  const headLinks = extractCDNLinks(guide);

  return {
    html:
      htmlBlock ||
      '<!-- HTML no detectado automáticamente — revisá la Sección 1 de la guía -->',
    css: cssBlock || '',
    js: jsBlock || '',
    headLinks,
  };
}

export function buildCopyableElement(element: WebflowElement): string {
  const parts: string[] = [];

  parts.push(`<!-- ============================================
     WEBFLOW RECONSTRUCTOR — Elemento generado automáticamente

     INSTRUCCIONES:
     1. Links CDN y CSS van en: Page Settings > Custom Code > Head
     2. Este bloque va en: un Embed block o Before </body>
============================================ -->`);

  if (element.headLinks) {
    parts.push(`<!-- CDN LINKS (pegar en el <head>) -->
${element.headLinks}`);
  }

  if (element.html) {
    parts.push(`<!-- HTML ESTRUCTURA -->
${element.html}`);
  }

  if (element.css) {
    parts.push(`<!-- CSS -->
<style>
${element.css}
</style>`);
  }

  if (element.js) {
    parts.push(`<!-- JAVASCRIPT -->
<script>
${element.js}
</script>`);
  }

  return parts.join('\n\n');
}
