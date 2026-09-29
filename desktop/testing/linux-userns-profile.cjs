// Generates an exact-path exception for user namespaces in disposable Ubuntu CI.
// This script prints configuration only; it never invokes sudo or changes the OS.
const fs = require('node:fs');
const path = require('node:path');

function makeProfile(executables) {
  return 'abi <abi/4.0>,\n\n' + executables.map((executable, index) => {
    if (!/^\/[A-Za-z0-9_./-]+$/.test(executable) || executable.split('/').includes('..')) throw new Error('Unsupported AppArmor path');
    return `profile taxsorted-ci-${index} "${executable}" flags=(unconfined) {\n  userns,\n}\n`;
  }).join('\n');
}

if (require.main === module) {
  try {
    if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true') throw new Error('Disposable Linux GitHub runner required');
    const root = fs.realpathSync(path.resolve(__dirname, '../..'));
    const executables = [require('./doctor.cjs').electronExecutablePath(), path.join(root, 'desktop/dist/linux-unpacked/taxsorted-local')].map(location => {
      const actual = fs.realpathSync(location);
      if (!actual.startsWith(root + path.sep) || !fs.statSync(actual).isFile()) throw new Error('Expected project executable missing');
      return actual;
    });
    console.log(makeProfile(executables));
  } catch { console.error('Cannot generate the scoped Linux CI profile. Build the Linux package in a disposable GitHub runner first.'); process.exitCode = 1; }
}
module.exports = { makeProfile };
