'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateInstalledRuntime } = require('./runtime-evidence.cjs');

const PROJECT = path.resolve(__dirname, '../..');
const TARGETS = {
  'windows-x64': { platform: 'win32', arch: 'x64', suffix: 'win-x64.exe', report: 'windows-installer.json', schema: 'taxsorted.windows-installer-test/1', checks: 5, cleanup: ['uninstalled', 'registrationRemoved', 'shortcutsRemoved', 'sentinelRemoved', 'temporaryFilesRemoved', 'lockRemoved'], environment: 'Windows 11 x64; standard disposable local account on an x64 host', limits: 'CI used Windows Server, silent installation and an administrator runner. Interactive installation, SmartScreen, UAC and standard-user behavior remain untested.' },
  'linux-x64': { platform: 'linux', arch: 'x64', suffix: 'linux-x86_64.AppImage', report: 'linux-installer.json', schema: 'taxsorted.linux-appimage-test/1', checks: 3, cleanup: ['appClosed', 'observerClosed', 'temporaryFilesRemoved', 'packagedProfileRemoved'], environment: 'Ubuntu 24.04 x64 Desktop; GNOME graphical session and standard disposable account', limits: 'CI used Xvfb, FUSE and a scoped AppArmor user-namespace allowance. Stock GNOME and stock security policy remain untested.' },
  'macos-x64': { platform: 'darwin', arch: 'x64', suffix: 'mac-x64.dmg', report: 'macos-installer.json', schema: 'taxsorted.desktop-installer/1', checks: 6, cleanup: ['imageDetached', 'installationRemoved'], environment: 'Actual Intel Mac running macOS 15; standard disposable account', limits: 'CI copied into a temporary Applications folder and used CLI launch. Finder, quarantine and native dialogs remain untested. Rosetta is supplemental and cannot establish Intel hardware acceptance.' },
  'macos-arm64': { platform: 'darwin', arch: 'arm64', suffix: 'mac-arm64.dmg', report: 'macos-installer.json', schema: 'taxsorted.desktop-installer/1', checks: 6, cleanup: ['imageDetached', 'installationRemoved'], environment: 'Apple silicon Mac running macOS 15; standard disposable account', limits: 'CI copied into a temporary Applications folder and used CLI launch. Finder, quarantine and native dialogs remain untested.' },
};
const CSV = 'date,amount,description\n2026-05-01,120.00,SYNTHETIC desktop income\n2026-05-02,-20.00,SYNTHETIC desktop expense\n';
const LIMITS = 'Checksums identify bytes, not publisher trust. Checkout metadata describes hash/test time, not independent build provenance. Packet preparation does not run the installer or establish manual acceptance.';

async function regularFile(file, maxBytes = Infinity) {
  const stat = await fsp.lstat(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Input must be a regular file');
  assert.ok(stat.size > 0 && stat.size <= maxBytes, 'Input size is invalid');
  return stat;
}

async function readJson(file) {
  await regularFile(file, 1024 * 1024);
  return JSON.parse(await fsp.readFile(file, 'utf8'));
}

async function digest(file) {
  const stat = await regularFile(file);
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return { bytes: stat.size, sha256: hash.digest('hex') };
}

function timestamp(value) {
  assert.equal(typeof value, 'string');
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(Number.isFinite(Date.parse(value)), 'Evidence timestamp is invalid');
  return value;
}

function version(value) {
  assert.equal(typeof value, 'string');
  assert.match(value, /^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/);
  return value;
}

async function inspectTarget(campaign, commit, audit, target) {
  const config = TARGETS[target];
  const packageDir = path.join(campaign, `taxsorted-${target}-preview`);
  const evidenceDir = `${packageDir}-test-evidence`;
  for (const dir of [packageDir, evidenceDir]) {
    assert.ok((await fsp.lstat(dir)).isDirectory(), 'Input directory cannot be a symlink');
  }
  const manifest = await readJson(path.join(packageDir, 'artifact-manifest.json'));
  assert.equal(manifest.schema, 'taxsorted.desktop-artifacts/1');
  assert.equal(manifest.checkoutCommitAtHashTime, commit, 'Manifest source mismatch');
  assert.equal(manifest.checkoutHadLocalChanges, false, 'Manifest must identify a clean checkout');
  assert.equal(manifest.hostPlatform, config.platform, 'Manifest platform mismatch');
  assert.equal(manifest.hostArch, config.arch, 'Manifest architecture mismatch');
  timestamp(manifest.createdAt);
  assert.ok(Array.isArray(manifest.artifacts));
  const candidates = manifest.artifacts.filter(item => typeof item?.file === 'string' && item.file.endsWith(config.suffix));
  assert.equal(candidates.length, 1, 'Exactly one matching installer is required');
  const artifact = candidates[0];
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0);
  const installer = await readJson(path.join(evidenceDir, config.report));
  const runtime = await readJson(path.join(evidenceDir, 'installed-smoke.json'));
  const appVersion = version(runtime.runtime?.appVersion);
  assert.equal(artifact.file, `TaxSorted-Local-${appVersion}-${config.suffix}`, 'Artifact name/version/target mismatch');
  assert.equal(installer.schema, config.schema);
  assert.equal(installer.status, 'passed');
  assert.equal(installer.platform, config.platform);
  assert.equal(installer.arch, config.arch);
  assert.equal(installer.checkoutCommit, commit, 'Installer source mismatch');
  assert.equal(installer.checkoutHadLocalChanges, false);
  const startedAt = timestamp(installer.startedAt);
  const finishedAt = timestamp(installer.finishedAt);
  assert.ok(Date.parse(finishedAt) >= Date.parse(startedAt));
  assert.equal(installer.checks?.length, config.checks);
  for (const key of config.cleanup) assert.equal(installer.cleanup?.[key], true, `Installer cleanup missing: ${key}`);
  assert.equal(installer.artifact?.file ?? installer.artifact?.name, artifact.file);
  assert.equal(installer.artifact.sha256, artifact.sha256, 'Installer checksum mismatch');
  if (config.platform !== 'win32') assert.equal(installer.artifact.bytes ?? installer.artifact.sizeBytes, artifact.bytes);
  validateInstalledRuntime(runtime, { ...config, appImage: config.platform === 'linux', startedAt, checkoutCommit: commit, checkoutHadLocalChanges: false });
  assert.ok(Date.parse(runtime.finishedAt) <= Date.parse(finishedAt), 'Runtime must finish within the installer run');
  const inspection = config.platform === 'linux' ? installer.appImage?.payloadInspection : installer.packageInspection;
  assert.equal(inspection?.status, 'pass');
  assert.equal(inspection.version, appVersion);
  if (config.platform === 'linux') {
    for (const flag of ['archiveMatches', 'executableInsideMount', 'fuseMounted', 'readOnlyMount', 'reviewedLauncher', 'sandboxedDesktopEntry', 'mountsReleased']) assert.equal(installer.appImage?.[flag], true);
  }
  let trust = null;
  if (config.platform === 'darwin') {
    assert.equal(installer.trust?.codeSignatureVerifies, true);
    assert.ok(['accepted', 'rejected'].includes(installer.trust?.gatekeeperAssessment));
    assert.ok(Number.isInteger(installer.trust.assessmentExitCode));
    trust = { codeSignatureVerifies: true, gatekeeperAssessment: installer.trust.gatekeeperAssessment, assessmentExitCode: installer.trust.assessmentExitCode };
  }
  const matchingTargets = audit.targets.filter(item => item.target === target);
  assert.equal(matchingTargets.length, 1, 'Campaign target missing or duplicated');
  const recordedTarget = matchingTargets[0];
  assert.equal(recordedTarget.platform, config.platform);
  assert.equal(recordedTarget.arch, config.arch);
  assert.equal(recordedTarget.artifacts?.filter(item => item.file === artifact.file && item.bytes === artifact.bytes && item.sha256 === artifact.sha256 && item.installed === true).length, 1, 'Campaign artifact mismatch');
  const sumsFile = path.join(packageDir, 'SHA256SUMS.txt');
  await regularFile(sumsFile, 64 * 1024);
  const checksumLines = (await fsp.readFile(sumsFile, 'utf8')).trim().split(/\r?\n/);
  const selectedLines = checksumLines.filter(line => line.endsWith(`  ${artifact.file}`));
  assert.deepEqual(selectedLines, [`${artifact.sha256}  ${artifact.file}`], 'Checksum list mismatch');
  const source = path.join(packageDir, artifact.file);
  assert.deepEqual(await digest(source), { bytes: artifact.bytes, sha256: artifact.sha256 }, 'Installer bytes mismatch');
  return {
    target, source, config, version: appVersion,
    manifest: { schema: manifest.schema, createdAt: manifest.createdAt, checkoutCommitAtHashTime: commit, checkoutHadLocalChanges: false, hostPlatform: config.platform, hostArch: config.arch, artifacts: [{ file: artifact.file, bytes: artifact.bytes, sha256: artifact.sha256 }], limits: LIMITS },
    provenance: {
      schema: 'taxsorted.desktop-acceptance-packet/1', target, version: appVersion,
      campaignRunId: audit.runId, testedCheckout: commit, checkoutHadLocalChanges: false,
      artifact: { file: artifact.file, bytes: artifact.bytes, sha256: artifact.sha256 },
      evidence: { installerReport: config.report, installerStartedAt: startedAt, installerFinishedAt: finishedAt, installerChecks: installer.checks.length, installedRuntimeChecks: runtime.checks.length, electronVersion: version(runtime.runtime.electronVersion), embeddedNodeVersion: version(runtime.runtime.nodeVersion), trust },
      manualAcceptance: 'NOT RUN', limits: `${LIMITS} ${config.limits}`,
    },
  };
}

function prefillResult(template, packet) {
  const { artifact, testedCheckout, evidence } = packet.provenance;
  const values = {
    'App version / source revision / dirty source description': `${packet.version} / ${testedCheckout} / retained CI checkout clean; see provenance.json`,
    'Artifact filename / SHA-256': `${artifact.file} / ${artifact.sha256}`,
    'Host architecture / app architecture': `Host NOT RUN / app ${packet.config.arch}; native host required`,
  };
  let result = template.replace('[Desktop validation](../DESKTOP-TESTING.md)', '[Packet instructions](README.md)');
  for (const [label, value] of Object.entries(values)) {
    const before = `| ${label} | NOT RUN |`;
    assert.ok(result.includes(before), `Result template changed: ${label}`);
    result = result.replace(before, `| ${label} | ${value} |`);
  }
  const manualRows = result.split('\n').filter(line => /^\| M\d{2} /.test(line));
  assert.equal(manualRows.length, 15, 'All 15 manual cases must exist');
  assert.ok(manualRows.every(line => line.includes('| NOT RUN |')), 'Manual template must start unrun');
  return result.replace('## Failures and environment blocks', `## Retained automated evidence\n\nPacket preparation verified the artifact bytes, ${evidence.installerChecks} installer\nchecks and ${evidence.installedRuntimeChecks} installed-runtime checks against this clean\ntest checkout. See provenance.json. This is retained CI evidence, not a new run in\nthe acceptance environment. The automated table above remains NOT RUN for this\nenvironment. ${packet.config.limits}\n\n## Failures and environment blocks`);
}

function instructions(packet, plan) {
  const { artifact, testedCheckout, campaignRunId } = packet.provenance;
  const windows = packet.config.platform === 'win32';
  const linux = packet.config.platform === 'linux';
  const verify = windows
    ? `Get-FileHash -Algorithm SHA256 -LiteralPath '.\\${artifact.file}'`
    : linux ? 'sha256sum --check SHA256SUMS.txt' : 'shasum -a 256 --check SHA256SUMS.txt';
  const launch = windows
    ? 'Keep Defender, SmartScreen and UAC enabled. Double-click the EXE as the standard test account. Record the wizard, destination, elevation requests and trust prompts. The current preview campaign is unsigned; the packet does not authenticate its publisher.'
    : linux
      ? `Keep AppArmor and normal user-namespace policy enabled. In the file manager, permit executing ${artifact.file} and launch it from the graphical desktop. Ubuntu 24.04 may need libfuse2t64 through its normal package manager; record any installation and keep FUSE 3. A sandbox refusal under stock policy is BLOCKED, not a reason to copy the CI AppArmor allowance. Do not extract-and-run, add --no-sandbox, disable AppArmor or launch as root.`
      : 'Keep Gatekeeper and SIP enabled. In Finder, open the DMG, copy TaxSorted Local into Applications, eject the DMG, then launch the installed app. Record any permissions or trust prompt. The current preview campaign uses ad-hoc signatures without Developer ID or notarisation. If normal policy blocks launch, record BLOCKED; do not remove quarantine or disable security policy.';
  const start = plan.indexOf('## Manual cases on each native desktop');
  const end = plan.indexOf('## Preparation evidence on this development Mac');
  assert.ok(start >= 0 && end > start, 'Canonical manual instructions are missing');
  const manual = plan.slice(start, end).replace(/\[([^\]]+)\]\((?!https?:)([^)]+)\)/g, (_, label, destination) => {
    if (destination === 'testing/desktop-result-template.md') return `[${label}](RESULT.md)`;
    return `[${label}](https://github.com/cambridgetcg/taxsorted.io/blob/${testedCheckout}/docs/${destination})`;
  });
  return `# TaxSorted Local: ${packet.target} acceptance packet\n\n**Manual acceptance: NOT RUN.** This folder prepares a test; it does not install\nor launch the app. Transfer the entire folder into the dedicated test environment.\n\nRequired environment: **${packet.config.environment}**. Use synthetic data only.\nNo personal accounts, cloud mounts or real tax files should enter the test account.\nKeep its clean snapshot/reference before launch. Do not delete an existing profile.\n\n## Verify and install\n\n1. Open a terminal in this folder and run:\n\n\`\`\`${windows ? 'powershell' : 'sh'}\n${verify}\n\`\`\`\n\nExpected SHA-256: \`${artifact.sha256}\`. On Windows compare the displayed Hash\n(case-insensitively) to this value and SHA256SUMS.txt. Stop if it differs.\nA matching checksum identifies bytes; it does not prove publisher trust.\n\n2. ${launch}\n3. Fill RESULT.md with the actual OS build, non-identifying operator/account label,\nhost architecture and observations. Leave a case NOT RUN until observed. A blocked\nlaunch blocks dependent cases; record its exact boundary and stop that path.\n\n## What is ready\n\n- Installer: ${artifact.file} (${artifact.bytes} bytes), version ${packet.version}.\n- Retained campaign: ${campaignRunId}; tested checkout: ${testedCheckout}.\n- Selected manifest and bounded evidence: artifact-manifest.json and provenance.json.\n- Import fixture: desktop-test.csv (2026–27, self-employment; £120 income and £20 expense).\n- Manual result: RESULT.md, with every manual case NOT RUN.\n\n${packet.config.limits}\n\nThe live working profile is not encrypted by the app. Protected backup files are\nencrypted; use only synthetic passwords and records for this campaign. This packet\ncontains no profiles, backups, credentials, raw logs or source checkout.\n\nM12 and the website-transfer part of M15 additionally need a separately prepared\nsource/browser environment at the recorded checkout. Arrange that environment and\nits downloads before disconnecting the test device; do not mark these cases passed\nfrom the installer alone. M14 needs a genuinely different versioned artifact and\nremains NOT RUN until one is available.\n\nRetain only the completed result and reviewed, minimal synthetic screenshots. Do not\nreturn saved backups, profiles, raw logs, environment dumps or real identifiers.\nRestore network/security changes and reset only the disposable test environment.\n\n${manual}`;
}

async function prepareAcceptance({ campaign, output, commit, targets = Object.keys(TARGETS) }) {
  assert.match(commit, /^[a-f0-9]{40,64}$/, 'An explicit expected source commit is required');
  assert.ok(Array.isArray(targets) && targets.length > 0 && new Set(targets).size === targets.length && targets.every(target => Object.hasOwn(TARGETS, target)), 'Choose distinct supported targets');
  campaign = await fsp.realpath(path.resolve(campaign));
  output = path.resolve(output);
  try { await fsp.lstat(output); throw new Error('Output already exists; choose a new directory'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const audit = await readJson(path.join(campaign, 'campaign-verification.json'));
  assert.equal(audit.schema, 'taxsorted.native-campaign-verification/1');
  assert.equal(audit.status, 'passed');
  assert.equal(audit.testedCommit, commit, 'Campaign source mismatch');
  assert.ok(Number.isSafeInteger(audit.runId) && audit.runId > 0);
  assert.ok(Array.isArray(audit.targets));
  const packets = [];
  for (const target of targets) packets.push(await inspectTarget(campaign, commit, audit, target));
  const [template, plan] = await Promise.all([
    fsp.readFile(path.join(PROJECT, 'docs/testing/desktop-result-template.md'), 'utf8'),
    fsp.readFile(path.join(PROJECT, 'docs/DESKTOP-TESTING.md'), 'utf8'),
  ]);
  // Validate/render every result before creating output, then copy only an allowlist.
  const rendered = packets.map(packet => ({ packet, result: prefillResult(template, packet), readme: instructions(packet, plan) }));
  await fsp.mkdir(output, { mode: 0o700 }); // No recursive creation or overwrite.
  try {
    for (const { packet, result, readme } of rendered) {
      const directory = path.join(output, packet.target);
      await fsp.mkdir(directory, { mode: 0o700 });
      const artifact = packet.provenance.artifact;
      const destination = path.join(directory, artifact.file);
      await fsp.copyFile(packet.source, destination, fs.constants.COPYFILE_EXCL);
      assert.deepEqual(await digest(destination), { bytes: artifact.bytes, sha256: artifact.sha256 }, 'Copied installer changed');
      for (const [name, content] of Object.entries({
        'SHA256SUMS.txt': `${artifact.sha256}  ${artifact.file}\n`,
        'artifact-manifest.json': `${JSON.stringify(packet.manifest, null, 2)}\n`,
        'provenance.json': `${JSON.stringify(packet.provenance, null, 2)}\n`,
        'desktop-test.csv': CSV, 'RESULT.md': result, 'README.md': readme,
      })) await fsp.writeFile(path.join(directory, name), content, { flag: 'wx', mode: 0o600 });
    }
  } catch (error) {
    await fsp.rm(output, { recursive: true, force: true }); // Only the directory created by this invocation.
    throw error;
  }
  return { output, targets: packets.map(packet => packet.target), manualAcceptance: 'NOT RUN' };
}

function parseArgs(args) {
  const options = {};
  for (const argument of args) {
    const match = /^--(campaign|output|commit|targets)=(.+)$/.exec(argument);
    assert.ok(match && !Object.hasOwn(options, match[1]), 'Use each --name=value argument once');
    options[match[1]] = match[1] === 'targets' ? match[2].split(',') : match[2];
  }
  assert.ok(options.campaign && options.output && options.commit, 'Required: --campaign=DIR --output=NEW_DIR --commit=EXPECTED_COMMIT');
  return options;
}

if (require.main === module) {
  if (process.argv.slice(2).includes('--help')) {
    console.log('node desktop/testing/prepare-acceptance.cjs --campaign=DIR --output=NEW_DIR --commit=EXPECTED_COMMIT [--targets=windows-x64,linux-x64,macos-x64,macos-arm64]');
  } else {
    Promise.resolve().then(() => prepareAcceptance(parseArgs(process.argv.slice(2))))
      .then(result => console.log(`Prepared ${result.targets.length} acceptance packets. Manual acceptance: ${result.manualAcceptance}.`))
      .catch(() => { console.error('Acceptance packet preparation failed. Verify required arguments, exact clean commit, matching artifact/evidence/checksums, and a new output directory with an existing parent. No manual result was recorded.'); process.exitCode = 1; });
  }
}

module.exports = { prepareAcceptance, parseArgs, TARGETS };
