const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const asar = require('@electron/asar');
const { parseArgs } = require('node:util');

async function regularFiles(root, relative = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Packaged data cannot contain symbolic links');
    if (entry.isDirectory()) result.push(...await regularFiles(root, name));
    else { assert.ok(entry.isFile(), 'Only regular bundled files are accepted'); result.push(name); }
  }
  return result.sort();
}

async function inspectPackage(resources, project = path.resolve(__dirname, '../..')) {
  const archive = path.join(resources, 'app.asar');
  const permitted = ['package.json', 'src/local-policy.cjs', 'src/local-protocol.cjs', 'src/main.cjs', 'src/navigation-menu.cjs'];
  const files = [];
  for (const name of asar.listPackage(archive)) {
    const relative = name.replace(/^[/\\]/, '').replaceAll('\\', '/');
    const entry = asar.statFile(archive, relative, false);
    assert.ok(!entry.link && !entry.unpacked, 'App archive contains an unexpected link or unpacked entry');
    if (!entry.files) files.push(relative);
  }
  assert.deepEqual(files.sort(), permitted.sort(), 'App archive must contain only the declared runtime');
  const manifest = JSON.parse(asar.extractFile(archive, 'package.json').toString());
  const expected = JSON.parse(await fs.readFile(path.join(project, 'desktop/package.json'), 'utf8'));
  assert.equal(manifest.name, expected.name);
  assert.equal(manifest.version, expected.version);
  assert.equal(manifest.main, 'src/main.cjs');
  for (const name of permitted.filter(name => name !== 'package.json')) assert.ok(asar.extractFile(archive, name).equals(await fs.readFile(path.join(project, 'desktop', name))), 'Packaged runtime differs from this source');
  const staged = path.join(project, 'desktop/bundle');
  const bundled = path.join(resources, 'web');
  const stagedFiles = await regularFiles(staged);
  assert.deepEqual(await regularFiles(bundled), stagedFiles, 'Packaged pages must exactly match staging');
  for (const name of stagedFiles) {
    const basename = path.posix.basename(name);
    assert.ok(!/^(\.env.*|Cookies|Login Data|History|Preferences|_worker\.js|_headers|_routes\.json|_redirects)$/i.test(basename), 'Private or deployment-only file found in bundle');
    assert.ok(!name.split('/').slice(0, -1).some(part => /^(node_modules|profiles?)$/i.test(part)), 'Private directory found in bundle');
    assert.ok((await fs.readFile(path.join(staged, name))).equals(await fs.readFile(path.join(bundled, name))), 'Packaged page bytes differ from staging');
  }
  for (const name of ['LICENSE', 'CONTENT-LICENSE']) assert.ok((await fs.readFile(path.join(resources, name))).equals(await fs.readFile(path.join(project, name))), 'Required licence missing or changed');
  const gate = JSON.parse(await fs.readFile(path.join(bundled, 'local-build.json'), 'utf8'));
  assert.equal(gate.publicationGate, 'closed');
  return { schema: 'taxsorted.desktop-package-inspection/1', checkedAt: new Date().toISOString(), status: 'pass', version: manifest.version, runtimeFiles: files.length, bundledFiles: stagedFiles.length, publicationGate: 'closed', limits: 'Compares public code to local staging and checks paths. Not an embedded-secret scanner, installer test or signature check.' };
}

if (require.main === module) (async () => {
  const { values } = parseArgs({ options: { resources: { type: 'string' }, 'write-evidence': { type: 'boolean' } } });
  if (!values.resources) throw new Error('Specify --resources=PATH');
  let report;
  try { report = await inspectPackage(path.resolve(values.resources)); }
  catch { report = { schema: 'taxsorted.desktop-package-inspection/1', checkedAt: new Date().toISOString(), status: 'fail', reason: 'Package does not match the expected runtime, staged pages or licences.' }; process.exitCode = 1; }
  if (values['write-evidence']) {
    const directory = path.join(__dirname, '../test-results');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'package-inspection.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(() => { console.error('Package inspection could not run. Check --resources=PATH and installed dependencies.'); process.exitCode = 1; });

module.exports = { inspectPackage, regularFiles };
