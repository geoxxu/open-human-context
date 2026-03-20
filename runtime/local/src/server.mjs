import http from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import { HcpRuntimeError, LocalHcpRuntime } from './runtime.mjs';

const DEFAULT_HOST = process.env.HCP_HOST ?? '127.0.0.1';
const DEFAULT_PORT = Number(process.env.HCP_PORT ?? '4318');
const DEFAULT_REQUEST_BODY_LIMIT_BYTES = 1024 * 1024;
const DEFAULT_STATE_FILE_PATH = fileURLToPath(new URL('../.data/runtime-state.json', import.meta.url));

export function createServer(options = {}) {
  const runtime = options.runtime ?? new LocalHcpRuntime({ stateFilePath: options.stateFilePath });
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const requestBodyLimitBytes = options.requestBodyLimitBytes ?? DEFAULT_REQUEST_BODY_LIMIT_BYTES;

  return http.createServer(async (request, response) => {
    try {
      const method = request.method ?? 'GET';
      const authority = request.headers.host ?? `${host}:${port}`;
      const requestUrl = new URL(request.url ?? '/', `http://${authority}`);
      const path = requestUrl.pathname;
      const body = await readJsonBody(request, requestBodyLimitBytes);

      if (method === 'GET' && path === '/capabilities') {
        return sendJson(response, 200, runtime.listCapabilities());
      }

      if (method === 'POST' && path === '/authorizations') {
        return sendJson(response, 201, runtime.requestAuthorization(body));
      }

      if (method === 'GET' && /^\/grants\/[^/]+$/.test(path)) {
        const grantId = decodeURIComponent(path.split('/')[2] ?? '');
        return sendJson(response, 200, runtime.getGrant(grantId));
      }

      if (method === 'POST' && path === '/bindings') {
        return sendJson(response, 201, runtime.createBinding(body));
      }

      if (method === 'POST' && /^\/bindings\/[^/]+\/release$/.test(path)) {
        const bindingId = decodeURIComponent(path.split('/')[2] ?? '');
        runtime.releaseBinding(bindingId);
        return sendNoContent(response);
      }

      if (method === 'POST' && /^\/grants\/[^/]+\/revoke$/.test(path)) {
        const grantId = decodeURIComponent(path.split('/')[2] ?? '');
        runtime.revokeGrant(grantId, typeof body?.reason === 'string' ? body.reason : undefined);
        return sendNoContent(response);
      }

      if (method === 'GET' && path === '/audit-events') {
        const filter = Object.fromEntries(requestUrl.searchParams.entries());
        return sendJson(response, 200, runtime.listAuditEvents(filter));
      }

      if (method === 'GET' && path === '/.well-known/hcp-skills.json') {
        return sendJson(response, 200, runtime.getSkillManifest(`http://${authority}`));
      }

      if (method === 'POST' && path === '/skills/hcp.inject_context') {
        return sendJson(response, 201, runtime.injectContext(body));
      }

      throw new HcpRuntimeError(404, 'invalid_request', 'The requested endpoint does not exist.');
    } catch (error) {
      if (error instanceof HcpRuntimeError) {
        return sendJson(response, error.status, error.toResponse());
      }

      console.error(error);
      return sendJson(response, 500, {
        error: {
          code: 'internal_error',
          message: 'The local runtime encountered an unexpected error.',
          retryable: false,
          details: {},
        },
      });
    }
  });
}

export function startServer(options = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const stateFilePath = options.stateFilePath ?? process.env.HCP_STATE_FILE ?? DEFAULT_STATE_FILE_PATH;
  const server = createServer({
    ...options,
    host,
    port,
    stateFilePath,
  });

  server.listen(port, host, () => {
    console.log(`HCP local runtime listening on http://${host}:${port}`);
  });

  return server;
}

async function readJsonBody(request, limitBytes = DEFAULT_REQUEST_BODY_LIMIT_BYTES) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > limitBytes) {
      throw new HcpRuntimeError(413, 'invalid_request', `Request body must not exceed ${limitBytes} bytes.`);
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new HcpRuntimeError(400, 'invalid_request', 'Request body must be valid JSON.');
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendNoContent(response) {
  response.writeHead(204, {
    'cache-control': 'no-store',
  });
  response.end();
}

const isEntrypoint = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isEntrypoint) {
  startServer();
}
