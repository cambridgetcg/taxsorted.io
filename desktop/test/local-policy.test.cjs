const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const {
  isLocalUrl, isLocalBlob, externalWebUrl, relativeAsset,
  isGuardedAsset, isWithin, contentSecurityPolicy,
} = require('../src/local-policy.cjs');

describe('desktop origin and navigation policy', () => {
  it('recognises only the exact app origin, without credentials or ports', () => {
    assert.equal(isLocalUrl('taxsorted://app/books/workspace/?activity=uk-property#backup'), true);
    for (const url of [
      'https://app/', 'http://localhost:3000/', 'file:///app/index.html',
      'taxsorted://app.example/', 'taxsorted://other/', 'taxsorted://app:443/',
      'taxsorted://user@app/', 'taxsorted://user:secret@app/', 'not a URL',
    ]) assert.equal(isLocalUrl(url), false, url);
  });

  it('recognises export blobs only from the app origin', () => {
    assert.equal(isLocalBlob('blob:taxsorted://app/portable-export-id'), true);
    for (const url of [
      'blob:https://taxsorted.io/id', 'blob:taxsorted://app.example/id',
      'blob:taxsorted://user@app/id', 'blob:null/id', 'taxsorted://app/id',
    ]) assert.equal(isLocalBlob(url), false, url);
  });

  it('permits only bounded credential-free HTTPS addresses for external review', () => {
    assert.equal(externalWebUrl('https://www.gov.uk/example?tax=income#section'), 'https://www.gov.uk/example?tax=income#section');
    for (const url of [
      'http://www.gov.uk/', 'javascript:alert(1)', 'data:text/html,hello',
      'file:///private/records.json', 'taxsorted://app/', 'mailto:someone@example.com',
      'https://user@example.com/', 'https://user:secret@example.com/',
      'https://example.com/a\nb', 'https://example.com/a b', 'https://example.com/\u0000',
      `https://example.com/${'a'.repeat(4096)}`, '//example.com/', 'not a URL', null,
    ]) assert.equal(externalWebUrl(url), null, String(url));
  });
});

describe('bundled asset addressing', () => {
  it('maps static Next pages and payloads without treating query strings as files', () => {
    const cases = [
      ['taxsorted://app/', 'index.html'],
      ['taxsorted://app/books', 'books/index.html'],
      ['taxsorted://app/books/', 'books/index.html'],
      ['taxsorted://app/books/?activity=uk-property#backup', 'books/index.html'],
      ['taxsorted://app/books/index.txt?_rsc=abc', 'books/index.txt'],
      ['taxsorted://app/_next/static/chunks/main.js', '_next/static/chunks/main.js'],
    ];
    for (const [url, asset] of cases) assert.equal(relativeAsset(url), asset);
  });

  it('rejects traversal hidden in encoded separators, hidden files and deployment scripts', () => {
    for (const url of [
      'taxsorted://app/books%2f..%2fsecret.json',
      'taxsorted://app/books/%5c../secret.json',
      'taxsorted://app/books/%00.json',
      'taxsorted://app/%2eenv',
      'taxsorted://app/a/.private/record.json',
      'taxsorted://app/%E0%A4%A',
      'taxsorted://app/_worker.js',
      'taxsorted://app/_routes.json',
      'taxsorted://app/_headers',
      'taxsorted://app/_redirects',
      'taxsorted://app/_WORKER.JS',
      'taxsorted://app/_ROUTES.JSON',
      'taxsorted://app/_Headers',
      'taxsorted://app/_Redirects',
      'https://taxsorted.io/books/',
    ]) assert.equal(relativeAsset(url), null, url);
  });

  it('rejects Windows path aliases and alternate data stream syntax on every host', () => {
    for (const url of [
      'taxsorted://app/books./index.html',
      'taxsorted://app/books%20/index.html',
      'taxsorted://app/books/index.html.',
      'taxsorted://app/books/index.html%20',
      'taxsorted://app/books/index.html%3Aprivate',
      'taxsorted://app/C%3A/records.json',
      'taxsorted://app/books/%01.json',
      'taxsorted://app/books/%7F.json',
    ]) assert.equal(relativeAsset(url), null, url);
  });

  it('contains URL-normalised parent segments within the bundle namespace', () => {
    assert.equal(relativeAsset('taxsorted://app/books/../../index.html'), 'index.html');
    const root = path.resolve('fixture', 'bundle');
    assert.equal(isWithin(root, root), false);
    assert.equal(isWithin(root, path.join(root, 'books', 'index.html')), true);
    assert.equal(isWithin(root, path.resolve(root, '..', 'outside.html')), false);
    assert.equal(isWithin(root, `${root}-other${path.sep}index.html`), false);
  });

  it('closes protected research pages and payloads without blocking neighbouring routes', () => {
    for (const root of ['uk/opportunities', 'uk/regulator-scrutiny']) {
      for (const suffix of ['', '/index.html', '/case/index.html', '.html', '.txt', '.json']) {
        assert.equal(isGuardedAsset(`${root}${suffix}`), true, `${root}${suffix}`);
      }
    }
    assert.equal(isGuardedAsset('uk/opportunities-guide/index.html'), false);
    assert.equal(isGuardedAsset('uk/index.html'), false);
  });

  it('treats case aliases of protected research as protected on every host', () => {
    for (const asset of [
      'UK/OPPORTUNITIES/INDEX.HTML',
      'Uk/Opportunities/detail/index.txt',
      'UK/REGULATOR-SCRUTINY/INDEX.HTML',
      'Uk/Regulator-Scrutiny.TXT',
    ]) assert.equal(isGuardedAsset(asset), true, asset);
  });
});

describe('HTML content security policy', () => {
  it('hashes exact inline bytes, deduplicates them and excludes external script bodies', () => {
    const html = '<script>window.__ready = true;\n</script><script nonce="ignored">window.__ready = true;\n</script><script src="/_next/app.js">excluded fallback</script>';
    const policy = contentSecurityPolicy(html);
    // Fixed expected hash, independent of the implementation's hashing loop.
    assert.equal(policy.split('; ').find(value => value.startsWith('script-src')), "script-src 'self' 'sha256-Ncminvvb2gzDmrusrnnUF0RyfT1PbKEvvEoBNPs7mv4='");
    assert.notEqual(contentSecurityPolicy('<script>window.__ready = true;</script>'), policy);
    assert.equal(policy.includes('unsafe-eval'), false);
    assert.equal(policy.includes("script-src 'self' 'unsafe-inline'"), false);
  });

  it('keeps network origins, forms, workers and embedded documents closed', () => {
    const directives = contentSecurityPolicy().split('; ');
    for (const directive of [
      "default-src 'none'", "script-src 'self'", "connect-src 'self'",
      "frame-src 'none'", "frame-ancestors 'none'", "object-src 'none'",
      "base-uri 'none'", "form-action 'none'", "worker-src 'none'",
    ]) assert.ok(directives.includes(directive), directive);
    assert.equal(directives.some(value => /https?:|\*/.test(value)), false);
  });
});
