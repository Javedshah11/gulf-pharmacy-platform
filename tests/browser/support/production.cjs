const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { createHarness } = require('../../../apps/api/test/support/harness.cjs');
async function productionHarness() {
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const baseURL = 'http://localhost:' + port;
  const h = await createHarness({ listen: true, origin: baseURL });
  const webRoot = path.resolve(__dirname, '../../../apps/web');
  const webRequire = createRequire(path.join(webRoot, 'package.json'));
  const child = spawn(
    process.execPath,
    [
      webRequire.resolve('next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        API_INTERNAL_URL: h.url,
        SITE_ORIGIN: 'https://pharmacy.test',
      },
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  async function close() {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        delay(5000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    await h.close();
  }
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null)
        throw new Error(
          'Isolated production frontend exited. Run pnpm build first.',
        );
      try {
        const response = await globalThis.fetch(baseURL + '/en', {
          signal: globalThis.AbortSignal.timeout(1000),
        });
        if (response.ok) return { ...h, baseURL, close };
      } catch {
        /* Wait for the owned test server. */
      }
      await delay(200);
    }
    throw new Error('Isolated production frontend did not become ready.');
  } catch (error) {
    await close();
    throw error;
  }
}
module.exports = { productionHarness };
