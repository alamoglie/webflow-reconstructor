import { generateWebflowElement } from './webflow-generator';

// Detect if running inside the Webflow Designer as an extension
export function isInsideWebflowDesigner(): boolean {
  return typeof (window as { webflow?: unknown }).webflow !== 'undefined';
}

// Parse CSS string into property map for Webflow's setProperties()
function parseCSSToProps(css: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  // Match .className { ... }
  const ruleRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match;

  while ((match = ruleRegex.exec(css)) !== null) {
    const className = match[1];
    const declarations = match[2];
    const props: Record<string, string> = {};

    declarations.split(';').forEach((decl) => {
      const [prop, ...vals] = decl.split(':');
      if (prop && vals.length) {
        props[prop.trim()] = vals.join(':').trim();
      }
    });

    if (Object.keys(props).length > 0) {
      result[className] = props;
    }
  }

  return result;
}

export async function insertIntoWebflowDesigner(guide: string): Promise<void> {
  const wf = (window as { webflow?: WebflowApi }).webflow;
  if (!wf) throw new Error('No estás dentro del Webflow Designer.');

  const element = generateWebflowElement(guide);

  // 1. Create Webflow styles from parsed CSS
  if (element.css) {
    const styleMap = parseCSSToProps(element.css);
    for (const [className, props] of Object.entries(styleMap)) {
      try {
        let style = await wf.getStyleByName(className);
        if (!style) style = await wf.createStyle(className);
        await style.setProperties(props);
      } catch (e) {
        console.warn(`Style "${className}" skipped:`, e);
      }
    }
  }

  // 2. Get anchor (selected element or root)
  let anchor: AnyElement | null = await wf.getSelectedElement();
  if (!anchor) anchor = await wf.getRootElement();
  if (!anchor) throw new Error('Seleccioná un elemento en el canvas primero.');

  // 3. Insert HTML via WHTML
  if (!wf.insertElementFromWHTML) {
    throw new Error(
      'Tu versión del Designer no soporta insertElementFromWHTML. Actualizá Webflow.'
    );
  }

  const htmlToInsert = element.html.includes('<!--')
    ? element.html.replace(/<!--[\s\S]*?-->/g, '').trim()
    : element.html;

  await wf.insertElementFromWHTML(htmlToInsert, anchor, 'append');
}
