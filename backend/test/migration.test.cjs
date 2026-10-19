const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { openDb } = require('../src/db');
const { getMigrationPreview, migrateJson, verifyMigration } = require('../src/db/jsonMigration');

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurevia-migration-'));
    const consultationDir = path.join(root, 'consultations');
    fs.mkdirSync(consultationDir);
    const backendPatient = { id: 'PT-2026-0001', name: 'Canonical Fixture', age: 40, gender: 'Male', bloodGroup: 'A+', conditions: [], medications: [], allergies: [], lastAbnormalLab: '', visitReason: '' };
    const frontendPatients = [
        { ...backendPatient, name: 'Different Fixture Name', status: 'waiting' },
        { ...backendPatient, id: 'PT-2026-0002', name: 'Frontend Fixture' }
    ];
    const orphan = { ...backendPatient, id: 'PT-2026-0003', name: 'Snapshot Fixture' };
    const report = { aiSummary: { narrative: 'fixture summary' } };
    const consultation = { patient: orphan, transcript: [{ speaker: 'doctor', text: 'fixture utterance', timestamp: '10:00' }], report };
    const patientFile = path.join(root, 'patients.json');
    const frontendPatientsFile = path.join(root, 'mockData.ts');
    fs.writeFileSync(patientFile, JSON.stringify([backendPatient]));
    fs.writeFileSync(frontendPatientsFile, `export const patients = ${JSON.stringify(frontendPatients)};`);
    fs.writeFileSync(path.join(consultationDir, 'fixture_1772356991245.json'), JSON.stringify(consultation));
    return { root, patientFile, frontendPatientsFile, consultationsDir: consultationDir, backendRoot: root, backendPatient, consultationFile: path.join(consultationDir, 'fixture_1772356991245.json') };
}

function removeFixture(root) {
    const tempRoot = path.resolve(os.tmpdir());
    const absolute = path.resolve(root);
    if (path.dirname(absolute) !== tempRoot || !path.basename(absolute).startsWith('aurevia-migration-')) throw new Error('Refusing to remove an unexpected fixture path.');
    fs.rmSync(absolute, { recursive: true, force: true });
}

test('migration unions sources, reports field conflicts, inserts snapshot patients and is idempotent', () => {
    const source = fixture();
    const db = openDb(':memory:');
    try {
        const preview = getMigrationPreview(source);
        assert.equal(preview.unionPatientCount, 2);
        const first = migrateJson(db, undefined, source);
        assert.deepEqual(first.conflicts, [{ id: 'PT-2026-0001', fields: ['name'] }]);
        assert.deepEqual(first.orphanPatients, ['PT-2026-0003']);
        assert.equal(first.patientCount, 3);
        assert.equal(first.consultationCount, 1);
        assert.equal(first.transcriptCount, 1);
        const before = db.prepare('SELECT id,patient_id,status,report_json FROM consultations').all();
        const second = migrateJson(db, undefined, source);
        assert.equal(second.transcriptCount, 1);
        assert.deepEqual(db.prepare('SELECT id,patient_id,status,report_json FROM consultations').all(), before);
        assert.equal(verifyMigration(db, undefined, source).ok, true);
    } finally {
        db.close();
        removeFixture(source.root);
    }
});

test('malformed source is rejected before database changes and source bytes stay unchanged', () => {
    const source = fixture();
    const malformed = JSON.parse(fs.readFileSync(source.consultationFile, 'utf8'));
    malformed.transcript = [{ speaker: 'doctor' }];
    fs.writeFileSync(source.consultationFile, JSON.stringify(malformed));
    const beforeHash = crypto.createHash('sha256').update(fs.readFileSync(source.consultationFile)).digest('hex');
    const db = openDb(':memory:');
    try {
        assert.throws(() => migrateJson(db, undefined, source), /Invalid transcript segment/);
        assert.equal(db.prepare('SELECT COUNT(*) count FROM patients').get().count, 0);
        assert.equal(db.prepare('SELECT COUNT(*) count FROM consultations').get().count, 0);
        const afterHash = crypto.createHash('sha256').update(fs.readFileSync(source.consultationFile)).digest('hex');
        assert.equal(afterHash, beforeHash);
    } finally {
        db.close();
        removeFixture(source.root);
    }
});
