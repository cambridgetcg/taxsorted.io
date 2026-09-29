const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');

function electronExecutablePath(packageFile) {
  // Electron 44's module entry installs a missing binary as a side effect.
  // Preflight must inspect installation metadata without evaluating that entry.
  try {
    const directory = path.dirname(packageFile || require.resolve('electron/package.json'));
    const relative = fs.readFileSync(path.join(directory, 'path.txt'), 'utf8').trim();
    const dist = path.join(directory, 'dist');
    const executable = path.resolve(dist, relative);
    const within = path.relative(dist, executable);
    return relative && within && !within.startsWith('..') && !path.isAbsolute(within) && fs.statSync(executable).isFile() ? executable : null;
  } catch { return null; }
}

const installedElectronExecutable = packageFile => Boolean(electronExecutablePath(packageFile));

function doctor(options = {}) {
  const checks = [];
  const check = (name, ok, detail) => checks.push({ name, status: ok ? 'pass' : 'fail', detail });
  check('node', Number(process.versions.node.split('.')[0]) === 22, `Node ${process.versions.node}; use Node 22`);
  check('supported-platform', ['darwin', 'win32', 'linux'].includes(process.platform), process.platform);
  if (options['expect-platform']) check('expected-platform', process.platform === options['expect-platform'], options['expect-platform']);
  if (options['expect-arch']) check('expected-architecture', process.arch === options['expect-arch'], options['expect-arch']);
  let translated = false;
  if (process.platform === 'darwin') {
    const probe = spawnSync('/usr/sbin/sysctl', ['-in', 'sysctl.proc_translated'], { encoding: 'utf8', timeout: 3000 });
    translated = probe.status === 0 && probe.stdout.trim() === '1';
    if (options['expect-arch'] === 'x64') check('native-intel', !translated, 'Rosetta execution does not establish native Intel coverage');
  }
  try { check('electron-installed', installedElectronExecutable(), 'Electron executable exists; launch still needs verification'); }
  catch { check('electron-installed', false, 'Run the scoped npm ci without --ignore-scripts'); }
  try { check('playwright-installed', Boolean(require.resolve('playwright')), 'Project-pinned Electron automation'); }
  catch { check('playwright-installed', false, 'Run the scoped npm ci'); }
  if (options['require-bundle']) check('staged-pages', fs.existsSync(path.join(__dirname, '../bundle/index.html')), 'Run npm run desktop:build');
  const warnings = [];
  if (process.platform === 'linux') {
    check('non-root-session', process.getuid?.() !== 0, 'Run Electron as a normal test user');
    check('display', Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY), 'Desktop session or xvfb-run required');
    warnings.push('A display and installed executable do not prove the Linux sandbox works; run the runtime smoke.');
    try { if (fs.readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim() === '1') warnings.push('AppArmor restricts user namespaces. Use the documented scoped CI profile; do not disable the sandbox.'); } catch {}
  }
  return { schema: 'taxsorted.desktop-environment/1', checkedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, osRelease: os.release(), translated, readyForSourceSmoke: checks.every(item => item.status === 'pass'), checks, warnings, limits: 'Preflight only: no application launch, installation test, profile access or network test.' };
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { 'expect-platform': { type: 'string' }, 'expect-arch': { type: 'string' }, 'require-bundle': { type: 'boolean' } } });
    const report = doctor(values);
    console.log(JSON.stringify(report, null, 2));
    if (!report.readyForSourceSmoke) process.exitCode = 1;
  } catch { console.error('Invalid preflight arguments. Use --expect-platform, --expect-arch and/or --require-bundle.'); process.exitCode = 1; }
}
module.exports = { doctor, installedElectronExecutable, electronExecutablePath };
