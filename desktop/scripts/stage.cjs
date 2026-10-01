const fs = require('node:fs/promises');
const path = require('node:path');

function assertClosedPublicationGate(worker) {
  const declaration = worker.match(/^const manifest = (.+);$/m);
  const gate = declaration ? JSON.parse(declaration[1]) : null;
  if (gate?.schema !== 'taxsorted.uk.professional-opportunity-edge-gate/1' || gate.state !== 'closed') {
    throw new Error('The offline edition requires a build with the research publication gate closed. Its hosted review-expiry guard cannot run offline.');
  }
}

async function stage(source, destination) {
  const worker = await fs.readFile(path.join(source, '_worker.js'), 'utf8');
  assertClosedPublicationGate(worker);
  await fs.access(path.join(source, 'index.html'));
  // Destination is generated app code only. Never point it at a profile or source folder.
  if (destination !== path.resolve(__dirname, '../bundle')) throw new Error('Unexpected staging destination.');
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(source, destination, { recursive: true, filter: async candidate => {
    if ((await fs.lstat(candidate)).isSymbolicLink()) throw new Error('Symbolic links cannot be bundled.');
    return !['_worker.js', '_routes.json', '_headers', '_redirects'].includes(path.basename(candidate));
  } });
  await fs.writeFile(path.join(destination, 'local-build.json'), JSON.stringify({ schema: 'taxsorted.local-build/1', builtAt: new Date().toISOString(), offline: true, publicationGate: 'closed' }, null, 2));
  console.log('Staged offline app pages. No personal profiles or credentials are included.');
}

if (require.main === module) stage(path.resolve(__dirname, '../../frontend/out'), path.resolve(__dirname, '../bundle')).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { stage, assertClosedPublicationGate };
