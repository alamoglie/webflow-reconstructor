export const SYSTEM_PROMPT = `Eres un experto en Webflow y desarrollo frontend.
Tu tarea es analizar código, videos o imágenes de interfaces web/animaciones y
generar una guía detallada y accionable para reconstruirlas en Webflow.

REGLAS CRÍTICAS:
1. La guía SIEMPRE tiene exactamente 5 secciones con estos títulos exactos
2. Para las clases CSS usa convención: bloque__elemento--modificador con sufijo _[nombre-proyecto]
3. Para el JS: elimina type="module", usa IIFEs, reemplaza selectores por data-attributes
4. Si el proyecto usa Three.js, Canvas, WebGL u otras librerías, incluye los CDN links
5. Sé específico: incluye valores CSS exactos, nombres de clase exactos, código JS completo
6. El objetivo es que el usuario pueda seguir la guía sin volver al código original

ESTRUCTURA OBLIGATORIA DE LA GUÍA:
## 1. ESTRUCTURA DE SECCIONES
[Jerarquía de divs, nombres en Navigator, tipos de elementos en Webflow]

## 2. SISTEMA DE CLASES CSS
[Tabla con: clase | tipo | propiedades CSS exactas]
[Bloque <style> completo listo para pegar en el Head de Webflow]

## 3. ANIMACIONES / INTERACTIVIDAD
[Si hay GSAP: reescribir con data-gsap attributes]
[Si hay canvas/WebGL: código adaptado sin módulos ES]
[Bloque <script> completo listo para pegar antes del </body>]
[CDN links necesarios para el <head>]

## 4. ORDEN DE CONSTRUCCIÓN RECOMENDADO
[Lista numerada: qué construir primero para no rehacer trabajo]

## 5. ADVERTENCIAS
[Limitaciones de Webflow, problemas de CORS, browser compatibility, etc.]`;

function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
  };
  return map[ext] || ext;
}

export const buildCodePrompt = (files: Record<string, string>): string => {
  const fileContents = Object.entries(files)
    .map(
      ([name, content]) =>
        `\`\`\`${getExtension(name)}\n// FILE: ${name}\n${content}\n\`\`\``
    )
    .join('\n\n');

  return `Analiza este proyecto web y genera la guía de reconstrucción en Webflow.

ARCHIVOS DEL PROYECTO:
${fileContents}

Genera la guía completa con las 5 secciones obligatorias.`;
};

export const buildVisualPrompt = (frameCount: number): string =>
  `Estoy compartiendo ${frameCount} frames/imágenes de una interfaz web o animación.

Analiza:
1. La estructura visual de la página (secciones, jerarquía de elementos)
2. Las animaciones o interacciones visibles entre los frames
3. El sistema de colores, tipografías y espaciados
4. Cualquier efecto visual especial (parallax, scroll triggers, hover effects, etc.)

Genera la guía completa de reconstrucción en Webflow con las 5 secciones obligatorias.
Infiere el CSS necesario a partir de lo que ves visualmente.
Para las animaciones, propone una implementación con GSAP o CSS transitions.`;
