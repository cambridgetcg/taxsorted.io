const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, it } = require('node:test');
const { createLocalHandler } = require('../src/local-protocol.cjs');

describe('offline bundle protocol', () => {
  let temporary;
  let bundle;
  let serve;
  const html = '<!doctype html><html><body>Local records<script>window.__ready = true;\n</script></body></html>';

  beforeEach(async () => {
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-protocol-test-'));
    bundle = path.join(temporary, 'bundle');
    await fs.mkdir(path.join(bundle, 'books'), { recursive: true });
    await fs.writeFile(path.join(bundle, 'index.html'), html);
    await fs.writeFile(path.join(bundle, 'books', 'index.html'), html);
    await fs.writeFile(path.join(bundle, 'books', 'index.txt'), 'Next static page payload');
    await fs.writeFile(path.join(bundle, 'asset.js'), 'globalThis.loaded = true;');
    await fs.writeFile(path.join(bundle, 'asset.woff2'), Buffer.from([0, 1, 2, 255]));
    await fs.writeFile(path.join(bundle, 'records.sqlite'), 'not a bundled page');
    serve = createLocalHandler(bundle);
  });

  afterEach(async () => {
    await fs.rm(temporary, { recursive: true, force: true });
  });

  const request = (url, method = 'GET') => new Request(url, { method });

  it('serves HTML locally with exact inline script hashes and privacy headers', async () => {
    const response = await serve(request('taxsorted://app/books/?activity=uk-property'));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), html);
    assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    assert.match(response.headers.get('Content-Security-Policy'), /'sha256-Ncminvvb2gzDmrusrnnUF0RyfT1PbKEvvEoBNPs7mv4='/);
  });

  it('serves static navigation payloads, scripts and binary files with bounded types', async () => {
    const payload = await serve(request('taxsorted://app/books/index.txt?_rsc=route'));
    assert.equal(payload.headers.get('Content-Type'), 'text/plain; charset=utf-8');
    assert.equal(await payload.text(), 'Next static page payload');
    const script = await serve(request('taxsorted://app/asset.js'));
    assert.equal(script.headers.get('Content-Type'), 'text/javascript; charset=utf-8');
    assert.equal(await script.text(), 'globalThis.loaded = true;');
    assert.equal(script.headers.get('Content-Security-Policy').includes('sha256-'), false);
    const font = await serve(request('taxsorted://app/asset.woff2'));
    assert.equal(font.headers.get('Content-Type'), 'font/woff2');
    assert.deepEqual(Buffer.from(await font.arrayBuffer()), Buffer.from([0, 1, 2, 255]));
  });

  it('answers HEAD with the same policy and no file contents', async () => {
    const get = await serve(request('taxsorted://app/'));
    const head = await serve(request('taxsorted://app/', 'HEAD'));
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.deepEqual([...head.headers], [...get.headers]);
  });

  it('rejects writes and non-local origins without exposing bundle contents', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      const response = await serve(request('taxsorted://app/', method));
      assert.equal(response.status, 405, method);
      assert.equal((await response.text()).includes('Local records'), false);
    }
    for (const url of ['https://taxsorted.io/', 'taxsorted://other/', 'taxsorted://app:443/']) {
      const response = await serve(request(url));
      assert.equal(response.status, 400, url);
      assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'none'");
    }
  });

  it('does not expose hidden files, unsupported types or missing paths', async () => {
    for (const [url, expected] of [
      ['taxsorted://app/%2eenv', 400],
      ['taxsorted://app/books%2f..%2foutside.json', 400],
      ['taxsorted://app/records.sqlite', 404],
      ['taxsorted://app/missing.html', 404],
    ]) {
      const response = await serve(request(url));
      assert.equal(response.status, expected, url);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal((await response.text()).includes(temporary), false);
    }
  });

  it('rejects a directory masquerading as a supported file', async () => {
    await fs.mkdir(path.join(bundle, 'directory.html'));
    assert.equal((await serve(request('taxsorted://app/directory.html'))).status, 404);
  });

  it('blocks a directory symlink that escapes the real bundle root', async () => {
    const outside = path.join(temporary, 'private');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'index.html'), 'Private tax record');
    await fs.symlink(outside, path.join(bundle, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const response = await serve(request('taxsorted://app/escape/'));
    assert.equal(response.status, 403);
    assert.equal((await response.text()).includes('Private tax record'), false);
  });

  it('denies protected research HTML, nested pages and static payloads even when bundled', async () => {
    for (const route of ['uk/opportunities', 'uk/regulator-scrutiny']) {
      await fs.mkdir(path.join(bundle, route, 'detail'), { recursive: true });
      await fs.writeFile(path.join(bundle, route, 'index.html'), 'Unreleased research');
      await fs.writeFile(path.join(bundle, route, 'index.txt'), 'Unreleased data');
      await fs.writeFile(path.join(bundle, `${route}.txt`), 'Unreleased route data');
      for (const suffix of ['/', '/detail/', '/index.txt', '.txt']) {
        const response = await serve(request(`taxsorted://app/${route}${suffix}`));
        assert.equal(response.status, 403, `${route}${suffix}`);
        assert.equal((await response.text()).includes('Unreleased'), false);
      }
    }
  });

  it('also denies a same-bundle symlink alias to protected research', async () => {
    const protectedRoot = path.join(bundle, 'uk', 'opportunities');
    await fs.mkdir(protectedRoot, { recursive: true });
    await fs.writeFile(path.join(protectedRoot, 'index.html'), 'Unreleased research');
    await fs.symlink(protectedRoot, path.join(bundle, 'innocent-alias'), process.platform === 'win32' ? 'junction' : 'dir');
    const response = await serve(request('taxsorted://app/innocent-alias/'));
    assert.equal(response.status, 403);
    assert.equal((await response.text()).includes('Unreleased research'), false);
  });

  it('denies mixed-case research addresses before any host filesystem lookup', async () => {
    const root = path.join(bundle, 'UK', 'Opportunities');
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'index.html'), 'Unreleased research');
    const response = await serve(request('taxsorted://app/UK/Opportunities/'));
    assert.equal(response.status, 403);
    assert.equal((await response.text()).includes('Unreleased research'), false);
  });
});
