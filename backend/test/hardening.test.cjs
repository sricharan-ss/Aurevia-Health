const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { once } = require('node:events');
const WebSocket = require('ws');
const { loadConfig } = require('../src/config');
const { resolveReportPath } = require('../src/controllers/consultationController');
const { createApplicationServer } = require('../src/index');

test('configuration uses safe defaults and permits absent provider keys', () => {
    const config = loadConfig({});
    assert.equal(config.port, 3001);
    assert.deepEqual(config.frontendOrigins, ['http://localhost:3000', 'http://127.0.0.1:3000']);
    assert.equal(config.groqModel, 'qwen/qwen3.8-27b');
    assert.equal(config.groqApiKey, undefined);
    assert.equal(config.deepgramApiKey, undefined);
});

test('invalid configuration fails without echoing secret values', () => {
    assert.throws(() => loadConfig({ PORT: '0', GROQ_API_KEY: 'never-print-this' }), error => {
        assert.match(error.message, /Invalid PORT/);
        assert.doesNotMatch(error.message, /never-print-this/);
        return true;
    });
    assert.throws(() => loadConfig({ PORT: '3001;bad' }), /Invalid PORT/);
    assert.throws(() => loadConfig({ DEBUG_VERBOSE_LOGS: 'sometimes' }), /Invalid DEBUG_VERBOSE_LOGS/);
});

test('report IDs are constrained to safe filenames inside the report directory', () => {
    const base = 'C:/aurevia/consultations';
    for (const id of ['../x', '..%2f', 'C:/temp/file', 'x'.repeat(101), '']) {
        assert.equal(resolveReportPath(base, id), null);
    }
    assert.equal(resolveReportPath(base, 'PT-2024-0001_1234'), 'C:\\aurevia\\consultations\\PT-2024-0001_1234.json');
});

let server;
let websocketServer;
let baseUrl;
const clients = new Set();

before(async () => {
    const created = createApplicationServer(loadConfig({ PORT: '3001', FRONTEND_ORIGINS: 'http://localhost:3000' }));
    server = created.server;
    websocketServer = created.webSocketServer;
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    for (const client of clients) client.terminate();
    await new Promise(resolve => websocketServer.close(resolve));
    await new Promise(resolve => server.close(resolve));
});

test('HTTP CORS returns allow-origin only for configured origins', async () => {
    const allowed = await fetch(`${baseUrl}/api/patients`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');

    const denied = await fetch(`${baseUrl}/api/patients`, { headers: { Origin: 'http://example.invalid' } });
    assert.equal(denied.status, 200);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    await allowed.body?.cancel();
    await denied.body?.cancel();
});

function connectWebSocket(origin) {
    const options = origin ? { headers: { Origin: origin } } : {};
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/api/consultation/live`, options);
    socket.on('error', () => {});
    clients.add(socket);
    return socket;
}

test('WebSocket accepts an allowed Origin and a missing Origin', async () => {
    for (const origin of ['http://localhost:3000', undefined]) {
        const socket = connectWebSocket(origin);
        const [message] = await once(socket, 'message');
        assert.equal(JSON.parse(message.toString()).type, 'transcript');
        socket.close();
        await once(socket, 'close');
        clients.delete(socket);
    }
});

test('WebSocket rejects an Origin outside the allow-list with HTTP 403', async () => {
    const socket = connectWebSocket('http://example.invalid');
    const [, response] = await once(socket, 'unexpected-response');
    assert.equal(response.statusCode, 403);
    socket.terminate();
    clients.delete(socket);
});
