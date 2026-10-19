const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');
const { loadConfig } = require('../src/config');
const { createApplicationServer } = require('../src/index');
const { openDb } = require('../src/db');
const { createPatient } = require('../src/db/patients');

test('live upstream final utterance after CloseStream is persisted once before report generation', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurevia-lifecycle-'));
    const databasePath = path.join(tempRoot, 'lifecycle.db');
    const upstreamServer = new WebSocket.Server({ host: '127.0.0.1', port: 0 });
    await once(upstreamServer, 'listening');
    let upstreamConnections = 0;
    let closeStreamCount = 0;
    upstreamServer.on('connection', socket => {
        upstreamConnections += 1;
        socket.on('message', message => {
            if (message.toString() === JSON.stringify({ type: 'CloseStream' })) {
                closeStreamCount += 1;
                socket.send(JSON.stringify({ is_final: true, channel: { alternatives: [{ transcript: 'final fixture utterance', words: [{ speaker: 0 }] }] } }));
                socket.close();
            }
        });
    });

    let db = openDb(databasePath);
    const fakeEngine = {
        processLiveChunk: async () => ({ status: 'ok', data: { soap: { subjective: [], objective: [], assessment: [], plan: [] }, alerts: [], patientSummary: '', suggestedQuestions: [] } }),
        generateFinalReport: async transcript => ({ status: 'ok', data: { soap: { subjective: [], objective: [], assessment: [], plan: [] }, aiSummary: { narrative: `segments:${transcript.length}`, medications: [], warnings: [] } } })
    };
    const upstreamPort = upstreamServer.address().port;
    let { server, webSocketServer } = createApplicationServer(
        loadConfig({ DEEPGRAM_API_KEY: 'fake-local-key', FRONTEND_ORIGINS: 'http://localhost:3000' }), db,
        { engine: fakeEngine, upstreamFactory: (_url, options) => new WebSocket(`ws://127.0.0.1:${upstreamPort}`, options) }
    );
    try {
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const base = `http://127.0.0.1:${server.address().port}`;
        const patient = createPatient(db, { name: 'Local Fixture', age: 39, gender: 'Male', conditions: [], medications: [], allergies: [] });
        const start = await fetch(`${base}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
        const session = await start.json();
        const client = new WebSocket(`ws://127.0.0.1:${server.address().port}/api/consultation/live?consultationId=${session.consultationId}`, { headers: { Origin: 'http://localhost:3000' } });
        client.on('error', () => {});
        await once(client, 'open');
        while (upstreamConnections === 0) await new Promise(resolve => setTimeout(resolve, 5));
        client.send(Buffer.from('fake audio bytes'));
        const messagePromise = once(client, 'message');
        const endPromise = fetch(`${base}/api/consultation/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: session.consultationId }) });
        const [message] = await messagePromise;
        const forwarded = JSON.parse(message.toString());
        assert.equal(forwarded.type, 'transcript');
        assert.equal(forwarded.seq, 1);
        const ended = await endPromise;
        assert.equal(ended.status, 200);
        const saved = await (await fetch(`${base}/api/consultation/report/${session.consultationId}`)).json();
        assert.equal(saved.transcript.length, 1);
        assert.equal(db.prepare('SELECT source,seq FROM transcript_segments WHERE consultation_id=?').get(session.consultationId).source, 'speech');
        assert.equal(closeStreamCount, 1);

        const unfinishedStart = await fetch(`${base}/api/consultation/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: patient.id }) });
        const unfinished = await unfinishedStart.json();
        await new Promise(resolve => webSocketServer.close(resolve));
        await new Promise(resolve => server.close(resolve));

        db = openDb(databasePath);
        ({ server, webSocketServer } = createApplicationServer(
            loadConfig({ DEEPGRAM_API_KEY: 'fake-local-key', FRONTEND_ORIGINS: 'http://localhost:3000' }), db, { engine: fakeEngine }
        ));
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const restartedBase = `http://127.0.0.1:${server.address().port}`;
        const history = await (await fetch(`${restartedBase}/api/consultation/recent`)).json();
        assert.equal(history.length, 1);
        const incomplete = await (await fetch(`${restartedBase}/api/consultation/recent?includeIncomplete=true`)).json();
        assert.equal(incomplete.find(item => item.id === unfinished.consultationId).status, 'interrupted');
        const recoveredReport = await (await fetch(`${restartedBase}/api/consultation/report/${unfinished.consultationId}`)).json();
        assert.equal(recoveredReport.report, null);
        assert.equal(recoveredReport.status, 'interrupted');
        const storedReport = await (await fetch(`${restartedBase}/api/consultation/report/${session.consultationId}`)).json();
        assert.equal(storedReport.transcript.length, 1);
    } finally {
        await new Promise(resolve => webSocketServer.close(resolve));
        if (server.listening) await new Promise(resolve => server.close(resolve));
        else if (db.open) db.close();
        await new Promise(resolve => upstreamServer.close(resolve));
        const absoluteTemp = path.resolve(tempRoot);
        if (path.dirname(absoluteTemp) !== path.resolve(os.tmpdir()) || !path.basename(absoluteTemp).startsWith('aurevia-lifecycle-')) throw new Error('Refusing to remove an unexpected database fixture.');
        fs.rmSync(absoluteTemp, { recursive: true, force: true });
    }
});
