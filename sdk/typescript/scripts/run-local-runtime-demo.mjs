import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../runtime/local/src/server.mjs';

const stateDirUrl = new URL('../../../runtime/local/.data/', import.meta.url);
const stateFileUrl = new URL(
  `../../../runtime/local/.data/demo-state-${Date.now()}.json`,
  import.meta.url,
);
const builtExampleUrl = new URL('../dist/examples/local-runtime-flow.js', import.meta.url);
const stateFilePath = fileURLToPath(stateFileUrl);

async function main() {
  await mkdir(stateDirUrl, { recursive: true });
  await rm(stateFileUrl, { force: true });

  const server = createServer({
    stateFilePath,
  });

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(undefined);
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve demo runtime address.');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Demo runtime listening on ${baseUrl}`);

  try {
    const { runLocalRuntimeFlow } = await import(builtExampleUrl.href);
    await runLocalRuntimeFlow({ baseUrl, log: console });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve(undefined)));
    });
    await rm(stateFileUrl, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
