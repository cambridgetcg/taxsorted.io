const path = require('node:path');
const crypto = require('node:crypto');

const LOCAL_ORIGIN = 'taxsorted://app';
const GUARDED_ROOTS = ['/uk/opportunities', '/uk/regulator-scrutiny'];

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'taxsorted:' && url.hostname === 'app' && !url.port && !url.username && !url.password;
  } catch { return false; }
}

function isLocalBlob(value) {
  return value.startsWith(`blob:${LOCAL_ORIGIN}/`) && isLocalUrl(value.slice(5));
}

function externalWebUrl(value) {
  if (typeof value !== 'string' || value.length > 4096 || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function relativeAsset(value) {
  if (!isLocalUrl(value)) return null;
  try {
    const decoded = decodeURIComponent(new URL(value).pathname);
    if (/[\\:\u0000-\u001f\u007f]/.test(decoded)) return null;
    const segments = decoded.split('/').filter(Boolean);
    if (segments.some(part => part.startsWith('.') || /[. ]$/.test(part))) return null;
    const name = segments.join('/');
    if (['_worker.js', '_routes.json', '_headers', '_redirects'].includes(name.toLowerCase())) return null;
    return !name || decoded.endsWith('/') || !path.posix.extname(name) ? `${name ? `${name}/` : ''}index.html` : name;
  } catch { return null; }
}

function isGuardedAsset(asset) {
  const route = `/${asset.toLowerCase()}`;
  return GUARDED_ROOTS.some(root => route === root || route.startsWith(`${root}/`) || route.startsWith(`${root}.`));
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function contentSecurityPolicy(html = '') {
  const hashes = [];
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/i.test(script[1])) hashes.push(`'sha256-${crypto.createHash('sha256').update(script[2]).digest('base64')}'`);
  }
  return [
    "default-src 'none'", `script-src 'self' ${[...new Set(hashes)].join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
    "connect-src 'self'", "frame-src 'none'", "frame-ancestors 'none'", "object-src 'none'",
    "base-uri 'none'", "form-action 'none'", "worker-src 'none'",
  ].join('; ');
}

module.exports = { LOCAL_ORIGIN, isLocalUrl, isLocalBlob, externalWebUrl, relativeAsset, isGuardedAsset, isWithin, contentSecurityPolicy };
