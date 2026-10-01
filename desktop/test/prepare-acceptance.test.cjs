'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { prepareAcceptance, parseArgs, TARGETS } = require('../testing/prepare-acceptance.cjs');
const { runtimeFixture } = require('./fixtures/runtime-evidence.cjs');

const COMMIT = 'a'.repeat(40);
const writeJson = (file, value) => fs.writeFile(file, JSON.stringify(value));

async function fixture(t, targets = Object.keys(TARGETS)) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-acceptance-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const campaign = path.join(directory, 'campaign');
  const output = path.join(directory, 'packets');
  await fs.mkdir(campaign);
  const audit = { schema: 'taxsorted.native-campaign-verification/1', status: 'passed', testedCommit: COMMIT, runId: 12345, targets: [] };
  const files = {};
  for (const target of targets) {
    const config = TARGETS[target];
    const packageDir = path.join(campaign, `taxsorted-${target}-preview`);
    const evidenceDir = `${packageDir}-test-evidence`;
    await fs.mkdir(packageDir);
    await fs.mkdir(evidenceDir);
    const content = Buffer.from(`SYNTHETIC installer fixture ${target}`);
    const artifact = { file: `TaxSorted-Local-0.1.0-${config.suffix}`, bytes: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex') };
    const manifest = { schema: 'taxsorted.desktop-artifacts/1', createdAt: new Date(500).toISOString(), checkoutCommitAtHashTime: COMMIT, checkoutHadLocalChanges: false, hostPlatform: config.platform, hostArch: config.arch, artifacts: [artifact], extra: 'NEVER_COPY_UNREVIEWED_METADATA' };
    const runtime = runtimeFixture(config.platform, config.arch, config.platform === 'linux');
    Object.assign(runtime.runtime, { appVersion: '0.1.0', electronVersion: '44.4.5', nodeVersion: '24.21.0' });
    const inspection = { status: 'pass', version: '0.1.0' };
    const installer = {
      schema: config.schema, status: 'passed', platform: config.platform, arch: config.arch,
      checkoutCommit: COMMIT, checkoutHadLocalChanges: false,
      startedAt: new Date(1_000).toISOString(), finishedAt: new Date(4_000).toISOString(),
      checks: Array.from({ length: config.checks }, (_, i) => `Synthetic installer check ${i}`),
      cleanup: Object.fromEntries(config.cleanup.map(key => [key, true])), artifact, packageInspection: inspection,
      ...(config.platform === 'darwin' ? { trust: { codeSignatureVerifies: true, gatekeeperAssessment: 'rejected', assessmentExitCode: 3 } } : {}),
      ...(config.platform === 'linux' ? { appImage: { ...runtime.appImage, payloadInspection: inspection } } : {}),
      extra: 'NEVER_COPY_UNREVIEWED_METADATA',
    };
    files[target] = {
      artifact: path.join(packageDir, artifact.file), manifest: path.join(packageDir, 'artifact-manifest.json'),
      checksums: path.join(packageDir, 'SHA256SUMS.txt'), installer: path.join(evidenceDir, config.report),
      runtime: path.join(evidenceDir, 'installed-smoke.json'),
    };
    await fs.writeFile(files[target].artifact, content);
    await writeJson(files[target].manifest, manifest);
    await fs.writeFile(files[target].checksums, `${artifact.sha256}  ${artifact.file}\n`);
    await writeJson(files[target].installer, installer);
    await writeJson(files[target].runtime, runtime);
    await fs.writeFile(path.join(evidenceDir, 'raw-log.txt'), 'NEVER_COPY_RAW_LOG');
    await fs.writeFile(path.join(packageDir, 'profile.json'), 'NEVER_COPY_PROFILE');
    audit.targets.push({ target, platform: config.platform, arch: config.arch, artifacts: [{ ...artifact, installed: true }] });
  }
  const auditFile = path.join(campaign, 'campaign-verification.json');
  await writeJson(auditFile, audit);
  return { directory, campaign, output, commit: COMMIT, targets, files, auditFile };
}

async function mutate(file, fn) {
  const value = JSON.parse(await fs.readFile(file, 'utf8'));
  fn(value);
  await writeJson(file, value);
}

test('all native packets contain only the matched installer and bounded handoff files, with manual cases unrun', async t => {
  const input = await fixture(t);
  const result = await prepareAcceptance(input);
  assert.deepEqual(result.targets, Object.keys(TARGETS));
  assert.equal(result.manualAcceptance, 'NOT RUN');
  for (const target of result.targets) {
    const directory = path.join(input.output, target);
    const name = path.basename(input.files[target].artifact);
    assert.deepEqual((await fs.readdir(directory)).sort(), [name, 'SHA256SUMS.txt', 'artifact-manifest.json', 'provenance.json', 'desktop-test.csv', 'RESULT.md', 'README.md'].sort());
    assert.deepEqual(await fs.readFile(path.join(directory, name)), await fs.readFile(input.files[target].artifact));
    const resultText = await fs.readFile(path.join(directory, 'RESULT.md'), 'utf8');
    const manualRows = resultText.split('\n').filter(line => /^\| M\d{2} /.test(line));
    assert.equal(manualRows.length, 15);
    assert.ok(manualRows.every(line => line.includes('| NOT RUN |')));
    assert.match(resultText, /Overall: NOT RUN/);
    assert.match(resultText, new RegExp(COMMIT));
    assert.match(resultText, /retained CI evidence, not a new run/);
    assert.match(resultText, /\| Actual installer\/AppImage lifecycle and cleanup \| NOT RUN \|/);
    const readme = await fs.readFile(path.join(directory, 'README.md'), 'utf8');
    assert.match(readme, /M15/);
    assert.match(readme, /M14 needs a genuinely different versioned artifact/);
    assert.match(readme, /standard disposable/);
    const csv = await fs.readFile(path.join(directory, 'desktop-test.csv'), 'utf8');
    assert.equal(csv.trim().split('\n').length, 3);
    assert.match(csv, /120\.00/);
    assert.match(csv, /-20\.00/);
    for (const file of ['artifact-manifest.json', 'provenance.json', 'README.md', 'RESULT.md']) {
      assert.doesNotMatch(await fs.readFile(path.join(directory, file), 'utf8'), /NEVER_COPY_/);
    }
  }
});

test('corrupted or contradictory source, target, size, checksum and runtime evidence cannot prepare a packet', async t => {
  const changes = [
    ['source bytes', f => fs.appendFile(f.files['windows-x64'].artifact, 'changed')],
    ['manifest bytes', f => mutate(f.files['windows-x64'].manifest, x => x.artifacts[0].bytes++)],
    ['manifest commit', f => mutate(f.files['windows-x64'].manifest, x => { x.checkoutCommitAtHashTime = 'b'.repeat(40); })],
    ['campaign commit', f => mutate(f.auditFile, x => { x.testedCommit = 'b'.repeat(40); })],
    ['installer commit', f => mutate(f.files['windows-x64'].installer, x => { x.checkoutCommit = 'b'.repeat(40); })],
    ['dirty source', f => mutate(f.files['windows-x64'].manifest, x => { x.checkoutHadLocalChanges = true; })],
    ['architecture', f => mutate(f.files['windows-x64'].manifest, x => { x.hostArch = 'arm64'; })],
    ['platform', f => mutate(f.files['windows-x64'].installer, x => { x.platform = 'linux'; })],
    ['filename traversal', f => mutate(f.files['windows-x64'].manifest, x => { x.artifacts[0].file = '../' + x.artifacts[0].file; })],
    ['checksum list', f => fs.writeFile(f.files['windows-x64'].checksums, 'f'.repeat(64) + '  TaxSorted-Local-0.1.0-win-x64.exe\n')],
    ['duplicate checksum', async f => fs.appendFile(f.files['windows-x64'].checksums, await fs.readFile(f.files['windows-x64'].checksums))],
    ['installer checksum', f => mutate(f.files['windows-x64'].installer, x => { x.artifact.sha256 = 'f'.repeat(64); })],
    ['uninstalled campaign artifact', f => mutate(f.auditFile, x => { x.targets[0].artifacts[0].installed = false; })],
    ['incomplete recovery', f => mutate(f.files['windows-x64'].runtime, x => { x.workspaceRecovery.confirmedRestore = false; })],
    ['runtime outside installer run', f => mutate(f.files['windows-x64'].runtime, x => { x.finishedAt = new Date(5_000).toISOString(); })],
    ['missing cleanup', f => mutate(f.files['windows-x64'].installer, x => { x.cleanup.lockRemoved = false; })],
    ['missing evidence', f => fs.unlink(f.files['windows-x64'].runtime)],
  ];
  for (const [label, change] of changes) await t.test(label, async sub => {
    const input = await fixture(sub, ['windows-x64']);
    await change(input);
    await assert.rejects(prepareAcceptance(input));
    await assert.rejects(fs.stat(input.output), { code: 'ENOENT' });
  });
});

test('a later target failure leaves no partial acceptance output', async t => {
  const input = await fixture(t);
  await mutate(input.files['macos-arm64'].runtime, x => { x.status = 'failed'; });
  await assert.rejects(prepareAcceptance(input));
  await assert.rejects(fs.stat(input.output), { code: 'ENOENT' });
});

test('existing output is preserved, including a dangling output symlink', async t => {
  const input = await fixture(t, ['windows-x64']);
  await fs.mkdir(input.output);
  await fs.writeFile(path.join(input.output, 'keep.txt'), 'existing work');
  await assert.rejects(prepareAcceptance(input), /Output already exists/);
  assert.equal(await fs.readFile(path.join(input.output, 'keep.txt'), 'utf8'), 'existing work');
  if (process.platform !== 'win32') {
    const link = path.join(input.directory, 'dangling-output');
    await fs.symlink(path.join(input.directory, 'absent'), link);
    await assert.rejects(prepareAcceptance({ ...input, output: link }), /Output already exists/);
    assert.ok((await fs.lstat(link)).isSymbolicLink());
  }
});

test('symlinked artifacts are refused instead of copying another local file', { skip: process.platform === 'win32' ? 'Symlink creation requires Windows privileges' : false }, async t => {
  const input = await fixture(t, ['windows-x64']);
  const original = input.files['windows-x64'].artifact;
  const moved = path.join(input.directory, 'outside-installer');
  await fs.rename(original, moved);
  await fs.symlink(moved, original);
  await assert.rejects(prepareAcceptance(input), /regular file/);
  await assert.rejects(fs.stat(input.output), { code: 'ENOENT' });
});

test('CLI requires explicit paths and expected source and rejects ambiguous arguments', () => {
  assert.deepEqual(parseArgs(['--campaign=campaign', '--output=packets', `--commit=${COMMIT}`, '--targets=windows-x64,linux-x64']), { campaign: 'campaign', output: 'packets', commit: COMMIT, targets: ['windows-x64', 'linux-x64'] });
  for (const args of [[], ['--campaign=one'], ['--campaign=one', '--campaign=two'], ['--unknown=value'], ['--output', 'packets']]) assert.throws(() => parseArgs(args));
});
