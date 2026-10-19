const assert = require('node:assert/strict');
const { test } = require('node:test');
const { openDb } = require('../src/db');
const { applyMigrations } = require('../src/db/migrations');
const { createPatient, createPatientSchema, updatePatient, updatePatientSchema, listPatients } = require('../src/db/patients');

function withDb(run) {
    const db = openDb(':memory:');
    try { return run(db); } finally { db.close(); }
}

const validInput = { name: 'Example Patient', age: 38, gender: 'Female', bloodGroup: 'O+', conditions: ['Condition'], medications: [], allergies: [] };

test('schema v1 migrates once and is safe to open repeatedly', () => withDb(db => {
    assert.equal(db.pragma('user_version', { simple: true }), 1);
    applyMigrations(db);
    assert.equal(db.pragma('user_version', { simple: true }), 1);
}));

test('patient creation applies defaults, strips unknown fields and generates sequential IDs', () => withDb(db => {
    const first = createPatient(db, { ...validInput, ignoredField: 'discarded' }, '2026-01-02T03:04:05.000Z');
    const second = createPatient(db, { ...validInput, name: 'Second Patient' }, '2026-01-02T03:04:06.000Z');
    assert.equal(first.id, 'PT-2026-0001');
    assert.equal(second.id, 'PT-2026-0002');
    assert.deepEqual(first.allergies, []);
    assert.equal(Object.hasOwn(first, 'ignoredField'), false);
}));

test('patient validators reject missing, invalid and oversized values', () => {
    for (const input of [
        { ...validInput, name: '   ' }, { ...validInput, age: 131 }, { ...validInput, gender: 'Other' },
        { ...validInput, bloodGroup: 'X+' }, { ...validInput, conditions: [''] }, { ...validInput, medications: Array(51).fill('item') }
    ]) assert.equal(createPatientSchema.safeParse(input).success, false);
    assert.equal(updatePatientSchema.safeParse({ id: 'changed' }).success, false);
});

test('partial update leaves other values intact and cannot alter ID', () => withDb(db => {
    const created = createPatient(db, validInput);
    const updated = updatePatient(db, created.id, { visitReason: 'Updated reason', id: 'changed', unknown: true });
    assert.equal(updated.id, created.id);
    assert.equal(updated.name, created.name);
    assert.equal(updated.visitReason, 'Updated reason');
    assert.equal(updatePatient(db, 'unknown', { name: 'Other Name' }), undefined);
}));

test('patient status is derived from consultation rows', () => withDb(db => {
    const patient = createPatient(db, validInput);
    const now = new Date().toISOString();
    const add = db.prepare(`INSERT INTO consultations(id,patient_id,status,started_at,ended_at,patient_snapshot_json)
        VALUES(?,?,?,?,?,?)`);
    add.run('active-one', patient.id, 'active', now, null, JSON.stringify(patient));
    assert.equal(listPatients(db)[0].status, 'in-progress');
    db.prepare("UPDATE consultations SET status='completed',ended_at=? WHERE id='active-one'").run(now);
    assert.equal(listPatients(db)[0].status, 'completed');
}));
