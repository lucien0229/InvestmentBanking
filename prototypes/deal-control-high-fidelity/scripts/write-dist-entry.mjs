import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const previewEntry = source.replaceAll('./dist/assets/', './assets/');

await writeFile(new URL('../dist/index.html', import.meta.url), previewEntry);
