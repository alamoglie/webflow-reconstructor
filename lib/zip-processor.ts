import JSZip from 'jszip';

const TEXT_EXTENSIONS = new Set([
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'json', 'svg', 'xml', 'md', 'txt',
]);

function isTextFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return TEXT_EXTENSIONS.has(ext);
}

function isRelevantFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  // Skip node_modules, hidden dirs, common non-code files
  if (lower.includes('node_modules/')) return false;
  if (lower.includes('.git/')) return false;
  if (lower.includes('__pycache__/')) return false;
  if (lower.startsWith('.')) return false;
  if (lower.includes('/.')) return false;
  return isTextFile(filename);
}

export async function processZip(file: File): Promise<Record<string, string>> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  const files: Record<string, string> = {};
  const promises: Promise<void>[] = [];

  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && isRelevantFile(relativePath)) {
      promises.push(
        zipEntry.async('string').then((content) => {
          // Truncate very large files to avoid token overflow
          files[relativePath] =
            content.length > 50000
              ? content.slice(0, 50000) + '\n\n/* [FILE TRUNCATED — too large] */'
              : content;
        })
      );
    }
  });

  await Promise.all(promises);

  if (Object.keys(files).length === 0) {
    throw new Error(
      'No se encontraron archivos de código compatibles en el ZIP. Asegurate de incluir archivos HTML, CSS o JS.'
    );
  }

  return files;
}
