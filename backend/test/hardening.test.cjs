const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { once } = require('node:events');
const WebSocket = require('ws');
const { loadConfig } = require('../src/config');
const { isValidConsultationId } = require('../src/db/consultations');
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

test('consultation IDs reject path fragments and over-length values', () => {
    for (const id of ['../x', '..%2f', 'C:/temp/file', 'x'.repeat(101), '', '..']) assert.equal(isValidConsultationId(id), false);
    assert.equal(isValidConsultationId('PT-2024-0001_1234'), true);
});

let server;
let websocketServer;
let baseUrl;
let db;
let activeConsultationId;
let completedConsultationId;
const clients = new Set();
let processCalls = 0;
let activeProcessCalls = 0;
let maximumProcessCalls = 0;
let finalReportCalls = 0;
let finalResultStatus = 'ok';
const fakeEngine = {
    processLiveChunk: async () => {
        processCalls += 1; activeProcessCalls += 1; maximumProcessCalls = Math.max(maximumProcessCalls, activeProcessCalls);
        await new Promise(resolve => setTimeout(resolve, 20)); activeProcessCalls -= 1;
        return { status: 'ok', data: { soap: { subjective: [], objective: [], assessment: [], plan: [] }, alerts: [], patientSummary: '', suggestedQuestions: [] } };
    },
    generateFinalReport: async () => {
        finalReportCalls += 1;
        const data = { soap: { subjective: [], objective: [], assessment: [], plan: [] }, aiSummary: { narrative: 'Test report', medications: [], warnings: [] } };
        return finalResultStatus === 'ok' ? { status: 'ok', data } : { status: finalResultStatus, reason: 'fake provider unavailable', data };
    }
};

before(async () => {
    db = openDb(':memory:');
    const created = createApplicationServer(loadConfig({ PORT: '3001', FRONTEND_ORIGINS: 'http://localhost:3000' }), db, { engine: fakeEngine });
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
    const session = await started.json();
    const processed = await fetch(`${baseUrl}/api/consultation/process`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId, chunks: [{ speaker: 'doctor', text: 'Offline test utterance.' }] }) });
    assert.equal(processed.status, 200);
    const ended = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(ended.status, 200);
    const response = await ended.json();
    assert.equal(response.consultationId, session.consultationId);
    completedConsultationId = session.consultationId;
    const saved = await fetch(`${baseUrl}/api/consultation/report/${response.consultationId}`);
    const savedData = await saved.json();
    assert.equal(savedData.patient.id, patient.id);
    assert.equal(savedData.transcript.length, 1);
    assert.equal((await (await fetch(`${baseUrl}/api/consultation/recent`)).json()).length, 1);
    const repeated = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).alreadyCompleted, true);
    assert.equal(finalReportCalls, 1);
});

test('persistence failure leaves the active consultation retryable', async () => {
    const patient = createPatient(db, { name: 'Retry Fixture', age: 41, gender: 'Male', conditions: [], medications: [], allergies: [] });
    const started = await fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    const session = await started.json();
    db.pragma('query_only = ON');
    const failed = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(failed.status, 500);
    assert.equal((await failed.json()).code, 'PERSISTENCE_FAILED');
    db.pragma('query_only = OFF');
    const retry = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(retry.status, 200);
});

test('start creates an isolated persisted session and interrupts the previous one', async () => {
    const patient = createPatient(db, { name: 'Socket Fixture', age: 37, gender: 'Female', conditions: [], medications: [], allergies: [] });
    const start = () => fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    const firstResponse = await start();
    const first = await firstResponse.json();
    const transcriptResponse = await fetch(`${baseUrl}/api/consultation/process`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: first.consultationId, chunks: [{ speaker: 'doctor', text: 'interrupted-session fixture utterance' }] }) });
    assert.equal(transcriptResponse.status, 200);
    const secondResponse = await start();
    const second = await secondResponse.json();
    assert.notEqual(first.consultationId, second.consultationId);
    assert.equal(second.previousInterruptedConsultationId, first.consultationId);
    assert.equal(db.prepare('SELECT status FROM consultations WHERE id=?').get(first.consultationId).status, 'interrupted');
    const interrupted = await (await fetch(`${baseUrl}/api/consultation/report/${first.consultationId}`)).json();
    assert.equal(interrupted.status, 'interrupted');
    assert.equal(interrupted.report, null);
    assert.equal(db.prepare('SELECT patient_snapshot_json FROM consultations WHERE id=?').get(second.consultationId).patient_snapshot_json.length > 0, true);
    const resumed = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: first.consultationId }) });
    assert.equal(resumed.status, 200);
    assert.equal((await (await fetch(`${baseUrl}/api/consultation/report/${first.consultationId}`)).json()).transcript.length, 1);
    activeConsultationId = second.consultationId;
});

test('processing is serialized and does not invoke the engine without new segments', async () => {
    const initialCalls = processCalls;
    const send = text => fetch(`${baseUrl}/api/consultation/process`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: activeConsultationId, chunks: [{ speaker: 'doctor', text }] }) });
    const responses = await Promise.all([send('First fixture utterance'), send('Second fixture utterance')]);
    assert.deepEqual(responses.map(response => response.status), [200, 200]);
    assert.equal(maximumProcessCalls, 1);
    const after = processCalls;
    const unchanged = await fetch(`${baseUrl}/api/consultation/process`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: activeConsultationId }) });
    assert.equal(unchanged.status, 200);
    assert.equal(processCalls, after);
    assert.equal(after, initialCalls + 2);
});

test('fallback final generation marks the session failed without storing a report and remains retryable', async () => {
    const patient = createPatient(db, { name: 'Fallback Fixture', age: 31, gender: 'Female', conditions: [], medications: [], allergies: [] });
    const start = await fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    const session = await start.json();
    finalResultStatus = 'fallback';
    const failed = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(failed.status, 502);
    assert.equal((await failed.json()).code, 'AI_FAILED');
    const row = db.prepare('SELECT status,report_json FROM consultations WHERE id=?').get(session.consultationId);
    assert.equal(row.status, 'failed');
    assert.equal(row.report_json, null);
    const incomplete = await (await fetch(`${baseUrl}/api/consultation/recent?includeIncomplete=true`)).json();
    assert.equal(incomplete.find(item => item.id === session.consultationId).status, 'failed');
    finalResultStatus = 'ok';
    const retry = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(retry.status, 200);
});

test('final report write failure marks the session failed and a later retry can complete', async () => {
    const patient = createPatient(db, { name: 'Write Retry Fixture', age: 33, gender: 'Female', conditions: [], medications: [], allergies: [] });
    const start = await fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    const session = await start.json();
    db.exec("CREATE TRIGGER fail_test_completion BEFORE UPDATE OF status ON consultations WHEN NEW.status='completed' BEGIN SELECT RAISE(FAIL, 'offline write failure'); END");
    const failed = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(failed.status, 500);
    assert.equal((await failed.json()).code, 'PERSISTENCE_FAILED');
    const row = db.prepare('SELECT status,report_json FROM consultations WHERE id=?').get(session.consultationId);
    assert.equal(row.status, 'failed');
    assert.equal(row.report_json, null);
    db.exec('DROP TRIGGER fail_test_completion');
    const retry = await fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    assert.equal(retry.status, 200);
});

test('racing end calls generate and store exactly one report', async () => {
    const patient = createPatient(db, { name: 'Race Fixture', age: 35, gender: 'Male', conditions: [], medications: [], allergies: [] });
    const start = await fetch(`${baseUrl}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
    const session = await start.json();
    const beforeCalls = finalReportCalls;
    const send = () => fetch(`${baseUrl}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
    const responses = await Promise.all([send(), send()]);
    assert.deepEqual(responses.map(response => response.status), [200, 200]);
    const bodies = await Promise.all(responses.map(response => response.json()));
    assert.equal(bodies.filter(body => body.alreadyCompleted).length, 1);
    assert.equal(finalReportCalls, beforeCalls + 1);
});

function connectWebSocket(origin, consultationId = activeConsultationId) {
    const options = origin ? { headers: { Origin: origin } } : {};
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/api/consultation/live?consultationId=${encodeURIComponent(consultationId)}`, options);
    socket.on('error', () => {});
    clients.add(socket);
    return socket;
}

test('WebSocket closes invalid, unknown and completed consultation IDs with application codes', async () => {
    const urls = [
        [`${baseUrl.replace(/^http/, 'ws')}/api/consultation/live`, 4400],
        [`${baseUrl.replace(/^http/, 'ws')}/api/consultation/live?consultationId=unknown-id`, 4404],
        [`${baseUrl.replace(/^http/, 'ws')}/api/consultation/live?consultationId=${completedConsultationId}`, 4409]
    ];
    for (const [url, expectedCode] of urls) {
        const socket = new WebSocket(url);
        socket.on('error', () => {});
        const [code] = await once(socket, 'close');
        assert.equal(code, expectedCode);
    }
});

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
