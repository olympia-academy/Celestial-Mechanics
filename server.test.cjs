'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const {once} = require('node:events');
const test = require('node:test');

test('local development server', async t => {
  const originalPort = process.env.PORT;
  process.env.PORT = '0';
  const server = require('./server.cjs');
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const port = server.address().port;

  function get(path) {
    return new Promise((resolve, reject) => {
      const request = http.get({hostname: '127.0.0.1', port, path, agent: false}, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve({status: response.statusCode, headers: response.headers, body}));
        response.on('error', reject);
      });
      request.setTimeout(3000, () => request.destroy(new Error('Local server request timed out')));
      request.on('error', reject);
    });
  }

  await t.test('serves SVG logos as images', async () => {
    const response = await get('/assets/logo/celestial-mechanics-en.svg');
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'image/svg+xml');
    assert.match(response.body, /<svg\b/);
  });

  await t.test('rejects malformed URLs and continues serving the app', async () => {
    for (const path of ['/%00', '/assets/%00/logo.svg', '/%ZZ']) {
      assert.equal((await get(path)).status, 400, path);
    }
    const response = await get('/');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /^text\/html\b/);
    assert.match(response.body, /<!doctype html>/i);
  });

  await t.test('rejects paths outside the project and handles missing files', async () => {
    assert.equal((await get('/%2e%2e%2fpackage.json')).status, 403);
    assert.equal((await get('/this-file-does-not-exist.html')).status, 404);
    assert.equal((await get('/favicon.ico')).status, 204);
  });
});
