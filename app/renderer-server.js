const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

function isInsideRoot(root, file) {
  return file === root || file.startsWith(`${root}${path.sep}`);
}

async function resolveRequestFile(root, requestPath) {
  let pathname;

  try {
    pathname = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const requestedFile = path.resolve(root, `.${pathname}`);
  if (!isInsideRoot(root, requestedFile)) return null;

  try {
    const stats = await fs.stat(requestedFile);
    if (stats.isFile()) return requestedFile;
  } catch {
    // Client-side routes fall through to index.html.
  }

  const fallback = path.join(root, 'index.html');
  return isInsideRoot(root, fallback) ? fallback : null;
}

function startRendererServer(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const server = http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const file = await resolveRequestFile(root, requestUrl.pathname);
    if (!file) {
      response.writeHead(404);
      response.end();
      return;
    }

    try {
      const body = await fs.readFile(file);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': CONTENT_TYPES.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });

  return new Promise((resolve, reject) => {
    const handleError = (error) => reject(error);
    server.once('error', handleError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', handleError);
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not determine the local renderer address.'));
        return;
      }

      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((closeResolve, closeReject) => {
          server.close((error) => error ? closeReject(error) : closeResolve());
        })
      });
    });
  });
}

module.exports = { startRendererServer };
