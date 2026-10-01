import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkBuild, checkPageHtml, loadContract, validateContract } from './frontend-contract.mjs';

const checker = fileURLToPath(new URL('./frontend-contract.mjs', import.meta.url));
const page = { path: '/prepare', title: 'Prepare my tax return | TaxSorted', heading: 'Prepare my tax return' };
const preparationHtml = '<!doctype html><html><head><title>Prepare my tax return | TaxSorted</title></head><body><main id="main-content"><h1>Prepare my tax return</h1><p>Local preparation.</p></main></body></html>';

test('checks the actual title and main heading, including escaped text and inline markup', () => {
  assert.deepEqual(checkPageHtml(page, preparationHtml), []);
  assert.deepEqual(checkPageHtml({ path: '/sample', title: 'Pay & tax', heading: 'Your tax. Your computer.' }, '<title>Pay &amp; tax</title><main id="main-content"><h1>Your <span>tax.</span><br/>Your computer.</h1></main>'), []);
});

test('rejects the wrong page even if its navigation contains the expected page name', () => {
  const wrong = '<title>Other page</title><nav>Prepare my tax return</nav><main id="main-content"><h1>Other page</h1></main>';
  assert.deepEqual(checkPageHtml(page, wrong), [
    '/prepare: document title does not match the release contract.',
    '/prepare: main heading does not match the release contract.',
  ]);
});

test('rejects an empty shell, duplicate titles, and a heading only present in serialized script data', () => {
  assert.match(checkPageHtml(page, '<title>Prepare my tax return | TaxSorted</title>').join('\n'), /main content is missing/);
  assert.match(checkPageHtml(page, preparationHtml.replace('</head>', '<title>Other title</title></head>')).join('\n'), /document title/);
  const hidden = preparationHtml.replace('<h1>Prepare my tax return</h1>', '<script>"<h1>Prepare my tax return</h1>"</script>');
  assert.match(checkPageHtml(page, hidden).join('\n'), /main heading/);
  const scriptedTitle = preparationHtml.replace('<title>Prepare my tax return | TaxSorted</title>', '<title>Other page</title><script>"<title>Prepare my tax return | TaxSorted</title>"</script>');
  assert.match(checkPageHtml(page, scriptedTitle).join('\n'), /document title/);
  assert.match(checkPageHtml(page, preparationHtml.replace('id="main-content"', 'data-id="main-content"')).join('\n'), /main content is missing/);
});

test('checks a client-only workspace shell without pretending it exercised hydrated records', () => {
  const workspace = { path: '/books/workspace/backups', title: 'Backups — your Books | TaxSorted', htmlIncludes: 'Loading your records workspace…' };
  assert.deepEqual(checkPageHtml(workspace, '<title>Backups — your Books | TaxSorted</title><main id="main-content"><p>Loading your records workspace…</p></main>'), []);
  assert.match(checkPageHtml(workspace, '<title>Backups — your Books | TaxSorted</title><main id="main-content"></main>').join('\n'), /required main content/);
});

test('the single contract covers the rebuilt entry points and the prior guide/source routes', async () => {
  const paths = new Set((await loadContract()).map(page => page.path));
  for (const route of ['/services', '/services/individuals', '/services/sole-traders', '/services/landlords', '/prepare', '/checkup', '/backups', '/download', '/books/workspace/backups', '/file', '/passport', '/uk/tax-identity', '/learn/history/window-tax', '/itsa/records', '/itsa/quarter']) {
    assert.ok(paths.has(route), `${route} is required in the shared contract`);
  }
});

test('rejects malformed contracts, duplicate routes, traversal and misspelled criteria', () => {
  const wrap = pages => ({ schema: 'taxsorted.frontend-release-pages/1', pages });
  for (const invalid of [null, wrap([]), wrap([page, page]), wrap([{ ...page, path: '/../prepare' }]), wrap([{ ...page, path: '/prepare?other' }]), wrap([{ ...page, headings: 'misspelled field' }]), wrap([{ path: '/', title: 'Only a title' }])]) {
    assert.throws(() => validateContract(invalid), /frontend contract|frontend page contract/);
  }
});

test('generated-artifact validation reports missing pages and wrong route content offline', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'taxsorted-release-contract-'));
  try {
    assert.deepEqual(await checkBuild(directory, [page]), ['/prepare: generated page is missing.']);
    await mkdir(path.join(directory, 'prepare'));
    await writeFile(path.join(directory, 'prepare/index.html'), preparationHtml);
    assert.deepEqual(await checkBuild(directory, [page]), []);
    await writeFile(path.join(directory, 'prepare/index.html'), preparationHtml.replace('<title>Prepare my tax return | TaxSorted</title>', '<title>My tax year | TaxSorted</title>'));
    assert.match((await checkBuild(directory, [page])).join('\n'), /document title/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the deployed-response CLI returns failure for wrong or missing HTML without network access', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'taxsorted-release-response-'));
  const filename = path.join(directory, 'response.html');
  try {
    await writeFile(filename, preparationHtml);
    const valid = spawnSync(process.execPath, [checker, 'check-page', '/prepare', filename], { encoding: 'utf8' });
    assert.equal(valid.status, 0, valid.stderr);
    await writeFile(filename, '<html><title>Old website</title><main id="main-content">PRIVATE_RESPONSE_BODY</main></html>');
    const wrong = spawnSync(process.execPath, [checker, 'check-page', '/prepare', filename], { encoding: 'utf8' });
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /document title/);
    assert.doesNotMatch(wrong.stderr, /PRIVATE_RESPONSE_BODY/);
    const missing = spawnSync(process.execPath, [checker, 'check-page', '/prepare', path.join(directory, 'missing.html')], { encoding: 'utf8' });
    assert.equal(missing.status, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('deployed and generated checks consume the same contract, with preflight before the API deploy dependency', async () => {
  const smoke = await readFile(new URL('./smoke-frontend.sh', import.meta.url), 'utf8');
  assert.match(smoke, /contract_paths=\$\(node "\$\{frontend_contract\}" list\)/);
  assert.match(smoke, /node "\$\{frontend_contract\}" check-page "\$\{page\}"/);
  const workflow = await readFile(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const firstCheck = workflow.indexOf('node scripts/release/frontend-contract.mjs check-build');
  assert.ok(firstCheck > 0 && firstCheck < workflow.indexOf('\n  deploy-api:'));
  assert.match(workflow, /needs: \[test-build, validate-headers\]/);
  assert.equal(workflow.match(/node scripts\/release\/frontend-contract\.mjs check-build/g)?.length, 2);
});
