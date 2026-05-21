# Webflow Reconstructor — Contexto del Proyecto

> Archivo de contexto para IAs. Mantener actualizado al hacer cambios significativos.

---

## Qué es

Herramienta web que usa IA para analizar una interfaz web existente (código, video o imágenes) y generar automáticamente una **guía paso a paso para reconstruirla en Webflow**.

Creado en el contexto de los tutoriales de **Codegrid** sobre GSAP y Webflow.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| IA — Anthropic | `@anthropic-ai/sdk` → `claude-opus-4-7` |
| IA — OpenAI | `openai` → `gpt-4o` |
| IA — OpenRouter | `openai` (custom baseURL) → Gemini, DeepSeek, Qwen |
| Video (WASM) | `@ffmpeg/ffmpeg` + `@ffmpeg/core@0.12.6` |
| ZIP | `jszip` |
| UI drag & drop | `react-dropzone` |
| Render Markdown | `react-markdown` + `react-syntax-highlighter` (vscDarkPlus) |
| Notificaciones | `sonner` |
| React | 19.2.4 |

---

## Providers de IA soportados

| Provider | Modelo | Libre | Visión | Key |
|----------|--------|-------|--------|-----|
| `anthropic` | `claude-opus-4-7` | No | ✅ | Anthropic |
| `openai` | `gpt-4o` | No | ✅ | OpenAI |
| `gemini` | `google/gemini-2.0-flash-exp:free` | ✅ | ✅ | OpenRouter |
| `deepseek` | `deepseek/deepseek-r1:free` | ✅ | ❌ | OpenRouter |
| `qwen` | `qwen/qwen3-235b-a22b:free` | ✅ | ❌ | OpenRouter |

Modo `compare`: corre `anthropic` + `openai` en paralelo con tabs comparativos.

---

## Estructura de Archivos

```
app/
  page.tsx                  — UI principal (panel izquierdo + panel derecho)
  layout.tsx                — Layout raíz, fuente Geist
  globals.css               — Estilos globales Tailwind
  api/
    analyze-code/route.ts   — API route: analiza ZIP (HTML/CSS/JS)
    analyze-visual/route.ts — API route: analiza frames/imágenes con visión

components/
  FileUploader.tsx          — Drag & drop para ZIP, video e imágenes
  EngineSelector.tsx        — Grid 3x2: 5 providers + botón Compare
  ApiKeyInput.tsx           — Inputs para 3 keys (Anthropic, OpenAI, OpenRouter)
  GuideOutput.tsx           — Render Markdown + tabs dinámicos por provider
  CopyElementButton.tsx     — Copiar/descargar la guía generada
  FramePreview.tsx          — Preview de frames extraídos del video

lib/
  ai/                       — Abstracción multi-provider (nueva arquitectura)
    types.ts                — AIProvider, AIEngine, ApiKeys, PROVIDERS, StreamRequest
    stream.ts               — streamFromAsyncIterable() helper
    generate.ts             — Entry point: valida keys y despacha
    router.ts               — Switch por provider → llamada al módulo correcto
    providers/
      anthropic.ts          — Claude via @anthropic-ai/sdk
      openai.ts             — GPT-4o via openai SDK
      openrouter.ts         — Gemini/DeepSeek/Qwen via OpenRouter (openai-compat)
  prompts.ts                — SYSTEM_PROMPT + buildCodePrompt + buildVisualPrompt
  video-processor.ts        — FFmpeg WASM: extrae N frames de un video
  zip-processor.ts          — JSZip: descomprime y filtra archivos de texto
  webflow-generator.ts      — Extrae bloques HTML/CSS/JS del markdown generado
  anthropic.ts              — (cliente standalone, sin uso activo)
  openai.ts                 — (cliente standalone, sin uso activo)

types/
  index.ts                  — Re-exporta AIProvider, AIEngine, ApiKeys, PROVIDERS
                              más ZipFiles, WebflowElement, UploadedFile, etc.
```

---

## Flujo de Datos

```
Usuario sube archivo
        ↓
FileUploader detecta tipo:
  ├── ZIP  → zip-processor.ts → Record<filename, content>
  ├── Video → video-processor.ts (FFmpeg WASM) → string[] base64 frames
  └── Imágenes → string[] base64 directo

page.tsx guarda estado (inputMode, codeFiles | frames)
        ↓
Usuario elige provider y presiona "Generar Guía"
        ↓
Validación en page.tsx:
  - key requerida presente?
  - si inputMode != 'code': provider soporta visión?
        ↓
fetch POST a /api/analyze-code  (si ZIP)
     o /api/analyze-visual      (si frames/imágenes)
  body: { files|frames, provider, anthropicApiKey, openaiApiKey, openrouterApiKey }
        ↓
API Route → generate() en lib/ai/generate.ts
  → validación de key
  → routeToProvider() en lib/ai/router.ts
    → streamAnthropic() | streamOpenAI() | streamOpenRouter()
        ↓
streamFromAsyncIterable() → ReadableStream
        ↓
Chunks decodificados en tiempo real → GuideOutput.tsx
```

---

## Modo Compare

Corre `anthropic` y `openai` en `Promise.all()` paralelo.
`page.tsx` mantiene `compareResults: Partial<Record<AIProvider, string>>`.
`GuideOutput` renderiza tabs dinámicos basados en las keys presentes en `compareResults`.

---

## Output de la IA

La guía tiene siempre **5 secciones fijas**:

1. **Estructura de Secciones** — jerarquía de divs, nombres en el Navigator de Webflow
2. **Sistema de Clases CSS** — tabla de clases + bloque `<style>` listo para pegar
3. **Animaciones / Interactividad** — GSAP con data-attributes, scripts sin ES modules, CDN links
4. **Orden de Construcción Recomendado** — lista numerada
5. **Advertencias** — limitaciones de Webflow, CORS, compatibilidad

Convención CSS obligatoria: `bloque__elemento--modificador` con sufijo `_[nombre-proyecto]`.

---

## Detalles Técnicos Importantes

- **FFmpeg WASM** se carga de `unpkg.com/@ffmpeg/core@0.12.6/dist/umd` (requiere internet en primer uso)
- Los archivos del ZIP se truncan a **50.000 caracteres** para no exceder tokens
- Archivos ignorados del ZIP: `node_modules/`, `.git/`, `__pycache__/`, archivos ocultos
- **Anthropic** usa `cache_control: ephemeral` en el system prompt para reducir costos
- **OpenRouter** requiere headers `HTTP-Referer` y `X-Title` (recomendado por su API)
- Los providers sin visión (`deepseek`, `qwen`) son bloqueados para análisis visual tanto en cliente como en servidor
- Las API keys se guardan en `localStorage` bajo la key `wfr_api_keys_v2` (formato anterior era `wfr_api_keys`)
- El streaming usa `ReadableStream` nativo de Next.js (no `StreamingTextResponse`)

---

## Estado Actual

- [x] Upload de ZIP, video e imágenes
- [x] Extracción de frames con FFmpeg WASM
- [x] Arquitectura multi-provider (`lib/ai/`)
- [x] Análisis con Claude, GPT-4o, Gemini Flash, DeepSeek R1, Qwen 3
- [x] Modo Compare (Claude vs GPT-4o, tabs dinámicos)
- [x] Análisis visual multimodal (Claude, GPT-4o, Gemini Flash)
- [x] Validación de visión: bloquea DeepSeek/Qwen para input visual
- [x] Campo OpenRouter en ApiKeyInput (cubre 3 providers gratuitos)
- [x] Render Markdown con syntax highlighting y botón de copia
- [ ] `lib/webflow-generator.ts` — parsing de HTML/CSS/JS del markdown (parcial)
- [ ] No hay persistencia de guías generadas
- [ ] No hay autenticación ni backend propio
