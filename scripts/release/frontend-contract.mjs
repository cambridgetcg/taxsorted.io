import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const contractFile = new URL('./frontend-pages.json', import.meta.url);

export function validateContract(value) {
  if (!value || value.schema !== 'taxsorted.frontend-release-pages/1'
    || Object.keys(value).some(key => !['schema', 'pages'].includes(key))
    || !Array.isArray(value.pages) || value.pages.length === 0) {
    throw new Error('Invalid frontend page contract.');
  }
  const paths = new Set();
  for (const page of value.pages) {
    if (!page || typeof page !== 'object'
      || Object.keys(page).some(key => !['path', 'title', 'heading', 'htmlIncludes'].includes(key))
      || typeof page.path !== 'string' || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(page.path)
      || paths.has(page.path)
      || typeof page.title !== 'string' || !page.title.trim()
      || (!page.heading && !page.htmlIncludes)
      || ['heading', 'htmlIncludes'].some(key => key in page && (typeof page[key] !== 'string' || !page[key].trim()))) {
      throw new Error('Invalid or duplicate page in frontend contract.');
    }
    paths.add(page.path);
  }
  return value.pages;
}

export async function loadContract() {
  return validateContract(JSON.parse(await readFile(contractFile, 'utf8')));
}

function htmlText(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<!--[^]*?-->/g, '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
      if (code[0] !== '#') return entities[code.toLowerCase()] ?? entity;
      const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
    }).replace(/\s+/g, ' ').trim();
}

/** Checks server-rendered identity/content, not client hydration or local storage. */
export function checkPageHtml(page, html) {
  const errors = [];
  // Ignore script/style strings: navigation labels or React payloads are not a page heading.
  const document = html.replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '').replace(/<!--[^]*?-->/g, '');
  const titles = [...document.matchAll(/<title\b[^>]*>([^]*?)<\/title\s*>/gi)].map(match => htmlText(match[1]));
  if (titles.length !== 1 || titles[0] !== page.title) errors.push(`${page.path}: document title does not match the release contract.`);
  const main = document.match(/<main\b[^>]*\sid\s*=\s*["']main-content["'][^>]*>([^]*?)<\/main\s*>/i)?.[1];
  if (main === undefined) errors.push(`${page.path}: main content is missing.`);
  else {
    if (page.heading) {
      const headings = [...main.matchAll(/<h1\b[^>]*>([^]*?)<\/h1\s*>/gi)].map(match => htmlText(match[1]));
      if (!headings.includes(page.heading)) errors.push(`${page.path}: main heading does not match the release contract.`);
    }
    if (page.htmlIncludes && !main.includes(page.htmlIncludes)) errors.push(`${page.path}: required main content is missing.`);
  }
  return errors;
}

export async function checkBuild(directory, pages = undefined) {
  const contract = pages ?? await loadContract();
  const failures = [];
  for (const page of contract) {
    const filename = path.join(directory, page.path.slice(1), 'index.html');
    try { failures.push(...checkPageHtml(page, await readFile(filename, 'utf8'))); }
    catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      failures.push(`${page.path}: generated page is missing.`);
    }
  }
  return failures;
}

export async function main(args) {
  const pages = await loadContract();
  if (args[0] === 'list' && args.length === 1) {
    console.log(pages.map(page => page.path).join('\n'));
    return;
  }
  let failures;
  if (args[0] === 'check-build' && args.length <= 2) {
    failures = await checkBuild(args[1] ?? 'frontend/out', pages);
  } else if (args[0] === 'check-page' && args.length === 3) {
    const page = pages.find(page => page.path === args[1]);
    if (!page) throw new Error('Requested route is not in the frontend page contract.');
    failures = checkPageHtml(page, await readFile(args[2], 'utf8'));
  } else {
    throw new Error('Usage: frontend-contract.mjs list | check-build [directory] | check-page /route html-file');
  }
  if (failures.length) throw new Error(failures.join('\n'));
  if (args[0] === 'check-build') console.log(`Frontend release contract passed for ${pages.length} pages.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => {
    // Only contract/file diagnostics; never dump fetched page bodies.
    console.error(error instanceof Error ? error.message : 'Frontend release contract failed.');
    process.exitCode = 1;
  });
}
