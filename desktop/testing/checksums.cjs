const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

(async () => {
  const directory = path.resolve(__dirname, '../dist');
  const names = (await fsp.readdir(directory)).filter(name => /^TaxSorted-Local-[\w.-]+\.(dmg|zip|exe|AppImage)$/.test(name)).sort();
  if (!names.length) throw new Error('No installer or archive artifacts found');
  const artifacts = [];
  for (const name of names) {
    const location = path.join(directory, name);
    const stat = await fsp.lstat(location);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Artifact must be a regular file');
    const hash = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(location)) hash.update(chunk);
    artifacts.push({ file: name, bytes: stat.size, sha256: hash.digest('hex') });
  }
  const project = path.resolve(__dirname, '../..');
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: project, encoding: 'utf8', timeout: 3000 });
  const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: project, encoding: 'utf8', timeout: 3000 });
  const commit = revision.status === 0 && /^[a-f0-9]{40,64}$/.test(revision.stdout.trim()) ? revision.stdout.trim() : null;
  const manifest = { schema: 'taxsorted.desktop-artifacts/1', createdAt: new Date().toISOString(), checkoutCommitAtHashTime: commit, checkoutHadLocalChanges: dirty.status === 0 ? Boolean(dirty.stdout.trim()) : null, hostPlatform: process.platform, hostArch: process.arch, artifacts, limits: 'Checksums identify these files. Checkout metadata describes hash time, not build provenance; files may predate this checkout. This does not establish platform compatibility or signing.' };
  await fsp.writeFile(path.join(directory, 'SHA256SUMS.txt'), artifacts.map(item => `${item.sha256}  ${item.file}`).join('\n') + '\n');
  await fsp.writeFile(path.join(directory, 'artifact-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote checksums and manifest for ${artifacts.length} local artifacts.`);
})().catch(() => { console.error('Could not hash local artifacts. Check desktop/dist contains regular installer/archive files.'); process.exitCode = 1; });
