const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const asar = require('@electron/asar');
const { inspectPackage } = require('../testing/inspect-package.cjs');
const { makeProfile } = require('../testing/linux-userns-profile.cjs');
const { doctor, installedElectronExecutable } = require('../testing/doctor.cjs');

async function fixture(t, extraRuntime = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-package-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const resources = path.join(root, 'resources');
  const application = path.join(root, 'application');
  const write = async (name, data) => { await fs.mkdir(path.dirname(name), { recursive: true }); await fs.writeFile(name, data); };
  const manifest = JSON.stringify({ name: '@taxsorted/desktop', version: '0.1.0', main: 'src/main.cjs' });
  for (const base of [path.join(root, 'desktop'), application]) {
    await write(path.join(base, 'package.json'), manifest);
    for (const file of ['main', 'local-policy', 'local-protocol', 'navigation-menu']) await write(path.join(base, `src/${file}.cjs`), '/* synthetic runtime */');
  }
  if (extraRuntime) await write(path.join(application, 'personal-profile.json'), '{}');
  for (const base of [path.join(root, 'desktop/bundle'), path.join(resources, 'web')]) {
    await write(path.join(base, 'index.html'), '<h1>Synthetic bundle</h1>');
    await write(path.join(base, 'local-build.json'), JSON.stringify({ publicationGate: 'closed' }));
  }
  for (const base of [root, resources]) for (const name of ['LICENSE', 'CONTENT-LICENSE']) await write(path.join(base, name), 'Synthetic licence');
  await asar.createPackage(application, path.join(resources, 'app.asar'));
  return { root, resources, write };
}

test('package inspection accepts only matching code, public bundle and licences', async t => {
  const f = await fixture(t);
  for (const base of [path.join(f.root, 'desktop/bundle'), path.join(f.resources, 'web')]) await f.write(path.join(base, 'learn/history/index.html'), '<h1>Public tax history</h1>');
  const report = await inspectPackage(f.resources, f.root);
  assert.equal(report.status, 'pass');
  assert.equal(report.runtimeFiles, 5);
  assert.equal(report.bundledFiles, 3);
  assert.ok(!JSON.stringify(report).includes(f.root));
});

test('package inspection refuses undeclared files in the application archive', async t => {
  const f = await fixture(t, true);
  await assert.rejects(inspectPackage(f.resources, f.root));
});

test('package inspection detects altered pages and missing licence evidence', async t => {
  const f = await fixture(t);
  await f.write(path.join(f.resources, 'web/index.html'), 'Changed after staging');
  await assert.rejects(inspectPackage(f.resources, f.root));
  await f.write(path.join(f.resources, 'web/index.html'), '<h1>Synthetic bundle</h1>');
  await fs.unlink(path.join(f.resources, 'CONTENT-LICENSE'));
  await assert.rejects(inspectPackage(f.resources, f.root));
});

test('package inspection refuses extra private state beside public pages', async t => {
  const f = await fixture(t);
  await f.write(path.join(f.resources, 'web/Cookies'), 'synthetic private fixture');
  await assert.rejects(inspectPackage(f.resources, f.root));
});

test('CI AppArmor generator uses exact paths and rejects policy injection/globs', () => {
  const policy = makeProfile(['/home/runner/app/electron', '/home/runner/app/taxsorted-local']);
  assert.equal(policy.match(/userns,/g).length, 2);
  assert.ok(policy.includes('"/home/runner/app/taxsorted-local"'));
  for (const name of ['/tmp/*', '/tmp/{a,b}', '/tmp/a" {}', '/tmp/a\nuserns,', 'relative', '/tmp/../etc']) assert.throws(() => makeProfile([name]));
});

test('environment preflight rejects a mismatched platform without launching the app', () => {
  const report = doctor({ 'expect-platform': 'deliberately-unsupported' });
  assert.equal(report.readyForSourceSmoke, false);
  assert.ok(report.checks.some(item => item.name === 'expected-platform' && item.status === 'fail'));
});

test('missing Electron installation is inspected without executing its installer', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-doctor-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const manifest = path.join(root, 'package.json');
  await fs.writeFile(manifest, '{}');
  await fs.writeFile(path.join(root, 'index.js'), 'throw new Error("Do not execute the installer");');
  assert.equal(installedElectronExecutable(manifest), false);
  await fs.writeFile(path.join(root, 'path.txt'), 'electron');
  assert.equal(installedElectronExecutable(manifest), false);
  await fs.mkdir(path.join(root, 'dist'));
  await fs.writeFile(path.join(root, 'dist/electron'), 'synthetic executable');
  assert.equal(installedElectronExecutable(manifest), true);
  await fs.writeFile(path.join(root, 'path.txt'), '../index.js');
  assert.equal(installedElectronExecutable(manifest), false);
});
