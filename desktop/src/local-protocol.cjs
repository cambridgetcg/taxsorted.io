const fs = require('node:fs/promises');
const path = require('node:path');
const { relativeAsset, isGuardedAsset, isWithin, contentSecurityPolicy } = require('./local-policy.cjs');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf' };

function plain(message, status) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' } });
}

function createLocalHandler(bundleRoot) {
  return async function serveLocal(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return plain('This local app only reads its bundled pages.', 405);
    const asset = relativeAsset(request.url);
    if (asset === null) return plain('This address is unavailable.', 400);
    if (isGuardedAsset(asset)) return plain('This research is not included in the offline edition. Return to TaxSorted services.', 403);
    const type = TYPES[path.extname(asset).toLowerCase()];
    if (!type) return plain('This file type is unavailable.', 404);
    try {
      const root = await fs.realpath(bundleRoot);
      const target = await fs.realpath(path.resolve(root, asset));
      if (!isWithin(root, target)) return plain('This address is unavailable.', 403);
      if (isGuardedAsset(path.relative(root, target).split(path.sep).join('/'))) return plain('This research is unavailable offline.', 403);
      if (!(await fs.stat(target)).isFile()) return plain('Page not found.', 404);
      const body = await fs.readFile(target);
      return new Response(request.method === 'HEAD' ? null : body, { headers: {
        'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': contentSecurityPolicy(type.startsWith('text/html') ? body.toString('utf8') : ''),
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        'Referrer-Policy': 'no-referrer',
      } });
    } catch { return plain('Page not found in this local installation.', 404); }
  };
}

module.exports = { createLocalHandler };
