const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { once } = require('node:events');
const WebSocket = require('ws');
const { loadConfig } = require('../src/config');
const { resolveReportPath } = require('../src/controllers/consultationController');
const { createApplicationServer } = require('../src/index');
const { openDb } = require('../src/db');
const { createPatient } = require('../src/db/patients');

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
let db;
const clients = new Set();

before(async () => {
    db = openDb(':memory:');
    const created = createApplicationServer(loadConfig({ PORT: '3001', FRONTEND_ORIGINS: 'http://localhost:3000' }), db);
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

test('patient HTTP API creates, lists, reads and partially updates records', async () => {
    const input = { name: 'Example Patient', age: 36, gender: 'Female', bloodGroup: 'A+', conditions: ['Condition'], medications: [], allergies: [] };
    const invalid = await fetch(`${baseUrl}/api/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, age: 131 }) });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'VALIDATION_ERROR');

    const created = await fetch(`${baseUrl}/api/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, ignored: true }) });
    assert.equal(created.status, 201);
    const patient = await created.json();
    assert.match(patient.id, /^PT-\d{4}-\d{4}$/);
    assert.equal(Object.hasOwn(patient, 'ignored'), false);
    assert.equal((await (await fetch(`${baseUrl}/api/patients`)).json()).length, 1);
    assert.equal((await (await fetch(`${baseUrl}/api/patients/${patient.id}`)).json()).name, input.name);

    const updated = await fetch(`${baseUrl}/api/patients/${patient.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitReason: 'Updated', id: 'ignored' }) });
    assert.equal(updated.status, 200);
    const result = await updated.json();
    assert.equal(result.id, patient.id);
    assert.equal(result.name, input.name);
    assert.equal(result.visitReason, 'Updated');
    assert.equal((await fetch(`${baseUrl}/api/patients/unknown`)).status, 404);
});

test('consultation completion stores its report, snapshot and transcript transactionally', async () => {
    const patient = createPatient(db, { name: 'Smoke Patient', age: 42, gender: 'Male', conditions: [], medications: [], allergies: [] });
    const started = await fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    assert.equal(started.status, 200);
    const processed = await fetch(`${baseUrl}/api/consultation/process`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id, chunks: [{ speaker: 'doctor', text: 'Offline test utterance.' }] }) });
    assert.equal(processed.status, 200);
    const ended = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    assert.equal(ended.status, 200);
    const response = await ended.json();
    assert.match(response.consultationId, new RegExp(`^${patient.id}_`));
    const saved = await fetch(`${baseUrl}/api/consultation/report/${response.consultationId}`);
    const savedData = await saved.json();
    assert.equal(savedData.patient.id, patient.id);
    assert.equal(savedData.transcript.length, 1);
    assert.equal((await (await fetch(`${baseUrl}/api/consultation/recent`)).json()).length, 1);
});

test('persistence failure leaves the active in-memory consultation retryable', async () => {
    const patient = createPatient(db, { name: 'Retry Fixture', age: 41, gender: 'Male', conditions: [], medications: [], allergies: [] });
    await fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    db.pragma('query_only = ON');
    const failed = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    assert.equal(failed.status, 500);
    assert.equal((await failed.json()).code, 'PERSISTENCE_FAILED');
    db.pragma('query_only = OFF');
    const retry = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    assert.equal(retry.status, 200);
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
