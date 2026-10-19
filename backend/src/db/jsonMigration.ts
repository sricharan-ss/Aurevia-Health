import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { AppDatabase } from './index';
import { createPatientSchema, type PatientRecord } from './patients';

export interface MigrationSources { backendRoot: string; patientFile: string; consultationsDir: string; frontendPatientsFile: string; }
const backendRoot = path.resolve(__dirname, '../../');
export const defaultMigrationSources: MigrationSources = {
    backendRoot,
    patientFile: path.join(backendRoot, 'src/data/patients.json'),
    consultationsDir: path.join(backendRoot, 'src/data/consultations'),
    frontendPatientsFile: path.resolve(backendRoot, '../frontend/src/data/mockData.ts')
};
const sourceDefaults = defaultMigrationSources;
const patientFields = ['id', 'name', 'age', 'gender', 'bloodGroup', 'conditions', 'medications', 'allergies', 'lastAbnormalLab', 'visitReason'];

export interface MigrationReport {
    patientCount: number;
    consultationCount: number;
    transcriptCount: number;
    conflicts: Array<{ id: string; fields: string[] }>;
    orphanPatients: string[];
    timestamps: Array<{ file: string; rule: 'report' | 'filename' | 'mtime' }>;
}

export function getMigrationPreview(sources = sourceDefaults): { backendPatientCount: number; frontendPatientCount: number; consultationCount: number; transcriptCount: number; unionPatientCount: number; conflicts: MigrationReport['conflicts'] } {
    const backend = JSON.parse(fs.readFileSync(sources.patientFile, 'utf8')) as Array<Record<string, unknown>>;
    const frontend = readFrontendPatients(sources.frontendPatientsFile);
    const { patients, conflicts } = getUnionPatients(sources);
    const consultations = readConsultations(sources);
    return { backendPatientCount: backend.length, frontendPatientCount: frontend.length, consultationCount: consultations.length,
        transcriptCount: consultations.reduce((sum, consultation) => sum + consultation.transcript.length, 0), unionPatientCount: patients.length, conflicts };
}

function hashFile(file: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function listSourceFiles(sources = sourceDefaults): string[] {
    return [sources.patientFile, sources.frontendPatientsFile, ...fs.readdirSync(sources.consultationsDir).filter(name => name.endsWith('.json')).sort().map(name => path.join(sources.consultationsDir, name))];
}

export function createSourceBackup(now = new Date()): { directory: string; manifestPath: string; manifestHash: string } {
    const root = path.join(backendRoot, 'storage/backups');
    fs.mkdirSync(root, { recursive: true });
    const label = `pre-migration-${now.toISOString().replace(/[:.]/g, '-')}`;
    const directory = path.join(root, label);
    fs.mkdirSync(directory, { recursive: false });
    const entries = listSourceFiles().map(file => {
        const relative = path.relative(backendRoot, file);
        const destination = path.join(directory, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(file, destination);
        return { file: relative.replace(/\\/g, '/'), sha256: hashFile(file) };
    });
    const manifestPath = path.join(directory, 'manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify({ createdAt: now.toISOString(), files: entries }, null, 2)}\n`);
    const manifestHash = hashFile(manifestPath);
    for (const entry of entries) {
        const copy = path.join(directory, entry.file);
        if (hashFile(copy) !== entry.sha256 || hashFile(path.resolve(backendRoot, entry.file)) !== entry.sha256) {
            throw new Error(`Backup verification failed for ${entry.file}.`);
        }
    }
    return { directory, manifestPath, manifestHash };
}

function parseTsLiteral(node: ts.Expression): unknown {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(element => parseTsLiteral(element as ts.Expression));
    if (ts.isObjectLiteralExpression(node)) {
        const result: Record<string, unknown> = {};
        for (const property of node.properties) {
            if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) throw new Error('Unsupported patient fixture syntax.');
            result[property.name.text] = parseTsLiteral(property.initializer);
        }
        return result;
    }
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return -Number(node.operand.text);
    throw new Error('Unsupported patient fixture syntax.');
}

export function readFrontendPatients(file = sourceDefaults.frontendPatientsFile): Array<Record<string, unknown>> {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const statement of source.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
            if (declaration.name.getText(source) === 'patients' && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer)) {
                return declaration.initializer.elements.map(element => parseTsLiteral(element as ts.Expression) as Record<string, unknown>);
            }
        }
    }
    throw new Error('Could not locate the frontend patient fixture.');
}

function normalizePatient(source: Record<string, unknown>, fallbackId?: string): PatientRecord {
    const input: Record<string, unknown> = { ...source, id: source.id ?? fallbackId };
    const parsed = createPatientSchema.safeParse({
        name: input.name, age: input.age, gender: input.gender, bloodGroup: input.bloodGroup ?? '',
        conditions: input.conditions ?? [], medications: input.medications ?? [], allergies: input.allergies ?? [],
        lastAbnormalLab: input.lastAbnormalLab ?? '', visitReason: input.visitReason ?? ''
    });
    if (!parsed.success || typeof input.id !== 'string' || !input.id) throw new Error('Patient record failed validation.');
    return { id: input.id, ...parsed.data, bloodGroup: parsed.data.bloodGroup ?? '', lastAbnormalLab: parsed.data.lastAbnormalLab ?? '', visitReason: parsed.data.visitReason ?? '', status: 'waiting' };
}

function getUnionPatients(sources = sourceDefaults): { patients: PatientRecord[]; conflicts: MigrationReport['conflicts'] } {
    const backend = JSON.parse(fs.readFileSync(sources.patientFile, 'utf8')) as Array<Record<string, unknown>>;
    const frontend = readFrontendPatients(sources.frontendPatientsFile);
    const byId = new Map<string, Record<string, unknown>>();
    for (const patient of frontend) {
        if (typeof patient.id !== 'string') throw new Error('Frontend patient record has no ID.');
        byId.set(patient.id, patient);
    }
    const conflicts: MigrationReport['conflicts'] = [];
    for (const patient of backend) {
        if (typeof patient.id !== 'string') throw new Error('Backend patient record has no ID.');
        const old = byId.get(patient.id);
        if (old) {
            const fields = patientFields.filter(key => JSON.stringify(old[key] ?? null) !== JSON.stringify(patient[key] ?? null));
            if (fields.length) conflicts.push({ id: patient.id, fields });
        }
        byId.set(patient.id, patient);
    }
    return { patients: [...byId.values()].map(patient => normalizePatient(patient)), conflicts };
}

function reportTimestamp(report: unknown): string | undefined {
    if (!report || typeof report !== 'object') return undefined;
    const row = report as Record<string, unknown>;
    for (const key of ['endedAt', 'completedAt', 'timestamp', 'date']) {
        if (typeof row[key] === 'string' && Number.isFinite(Date.parse(row[key] as string))) return new Date(row[key] as string).toISOString();
    }
    return undefined;
}

function filenameTimestamp(file: string): string | undefined {
    const match = path.basename(file).match(/_(\d{10,13})(?:\.json)?$/);
    if (!match) return undefined;
    const value = Number(match[1]);
    const date = new Date(match[1].length === 10 ? value * 1000 : value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function readConsultations(sources = sourceDefaults) {
    return fs.readdirSync(sources.consultationsDir).filter(name => name.endsWith('.json')).sort().map(name => {
        const file = path.join(sources.consultationsDir, name);
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
        if (!parsed.patient || typeof parsed.patient !== 'object' || !Array.isArray(parsed.transcript) || !parsed.report || typeof parsed.report !== 'object') {
            throw new Error(`Invalid consultation fixture: ${name}.`);
        }
        const patient = parsed.patient as Record<string, unknown>;
        const id = path.basename(name, '.json');
        if (typeof patient.id !== 'string') throw new Error(`Consultation has no patient ID: ${name}.`);
        const reportDate = reportTimestamp(parsed.report);
        const nameDate = filenameTimestamp(name);
        const mtime = new Date(fs.statSync(file).mtimeMs).toISOString();
        const transcript = parsed.transcript as Array<Record<string, unknown>>;
        if (transcript.some(entry => !entry || typeof entry.speaker !== 'string' || typeof entry.text !== 'string')) throw new Error(`Invalid transcript segment in ${name}.`);
        return { file: name, id, patient: normalizePatient(patient), patientSnapshot: patient, report: parsed.report, transcript,
            timestamp: reportDate ?? nameDate ?? mtime, rule: reportDate ? 'report' as const : nameDate ? 'filename' as const : 'mtime' as const };
    });
}

function deepEqualJson(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }

export function verifyMigration(db: AppDatabase, manifestPath?: string, sources = sourceDefaults): { ok: boolean; patientCount: number; consultationCount: number; transcriptCount: number; issues: string[] } {
    const { patients } = getUnionPatients(sources);
    const consultations = readConsultations(sources);
    const issues: string[] = [];
    const patientIds = patients.map(patient => patient.id);
    const consultationIds = consultations.map(item => item.id);
    const patientCount = patientIds.length ? Number((db.prepare(`SELECT COUNT(*) count FROM patients WHERE id IN (${patientIds.map(() => '?').join(',')})`).get(...patientIds) as { count: number }).count) : 0;
    const consultationCount = consultationIds.length ? Number((db.prepare(`SELECT COUNT(*) count FROM consultations WHERE id IN (${consultationIds.map(() => '?').join(',')})`).get(...consultationIds) as { count: number }).count) : 0;
    const transcriptCount = consultationIds.length ? Number((db.prepare(`SELECT COUNT(*) count FROM transcript_segments WHERE consultation_id IN (${consultationIds.map(() => '?').join(',')})`).get(...consultationIds) as { count: number }).count) : 0;
    if (patientCount !== patients.length) issues.push('patient row count mismatch');
    if (consultationCount !== consultations.length) issues.push('consultation row count mismatch');
    if (transcriptCount !== consultations.reduce((sum, item) => sum + item.transcript.length, 0)) issues.push('transcript row count mismatch');
    if ((db.pragma('foreign_key_check') as unknown[]).length) issues.push('foreign key check failed');
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') issues.push('integrity check failed');

    for (const source of patients) {
        const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(source.id) as Record<string, unknown> | undefined;
        if (!row) { issues.push(`missing patient ${source.id}`); continue; }
        const arrays = ['conditions', 'medications', 'allergies'] as const;
        const mapped = { id: row.id, name: row.name, age: row.age, gender: row.gender, bloodGroup: row.blood_group,
            conditions: JSON.parse(String(row.conditions_json)), medications: JSON.parse(String(row.medications_json)), allergies: JSON.parse(String(row.allergies_json)),
            lastAbnormalLab: row.last_abnormal_lab, visitReason: row.visit_reason };
        const expected = Object.fromEntries(patientFields.map(key => [key, source[key as keyof typeof source] ?? (arrays.includes(key as typeof arrays[number]) ? [] : '')]));
        if (!deepEqualJson(mapped, expected)) issues.push(`patient mismatch ${source.id}`);
    }
    for (const source of consultations) {
        const row = db.prepare('SELECT report_json FROM consultations WHERE id = ?').get(source.id) as { report_json: string | null } | undefined;
        if (!row || !deepEqualJson(JSON.parse(row.report_json ?? 'null'), source.report)) issues.push(`report mismatch ${source.id}`);
        const segments = db.prepare('SELECT seq,speaker,text,spoken_at FROM transcript_segments WHERE consultation_id=? ORDER BY seq').all(source.id) as Array<Record<string, unknown>>;
        if (segments.length !== source.transcript.length || segments.some((segment, index) => segment.seq !== index + 1 || segment.speaker !== source.transcript[index]?.speaker || segment.text !== source.transcript[index]?.text)) issues.push(`transcript mismatch ${source.id}`);
        const snapshot = db.prepare('SELECT patient_snapshot_json FROM consultations WHERE id=?').get(source.id) as { patient_snapshot_json: string } | undefined;
        if (!snapshot || !deepEqualJson(JSON.parse(snapshot.patient_snapshot_json), source.patientSnapshot)) issues.push(`patient snapshot mismatch ${source.id}`);
    }
    if (manifestPath && fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { files: Array<{ file: string; sha256: string }> };
        for (const entry of manifest.files) if (hashFile(path.resolve(sources.backendRoot, entry.file)) !== entry.sha256) issues.push(`source hash mismatch ${entry.file}`);
    }
    return { ok: issues.length === 0, patientCount, consultationCount, transcriptCount, issues };
}

export function migrateJson(db: AppDatabase, manifestPath?: string, sources = sourceDefaults): MigrationReport {
    const { patients, conflicts } = getUnionPatients(sources);
    const consultations = readConsultations(sources);
    const patientIds = new Set(patients.map(patient => patient.id));
    const orphanPatients: string[] = [];
    for (const item of consultations) if (!patientIds.has(item.patient.id)) { patients.push(item.patient); patientIds.add(item.patient.id); orphanPatients.push(item.patient.id); }
    const insert = db.transaction(() => {
        const addPatient = db.prepare(`INSERT OR IGNORE INTO patients (id,name,age,gender,blood_group,conditions_json,medications_json,allergies_json,last_abnormal_lab,visit_reason,created_at,updated_at)
          VALUES (@id,@name,@age,@gender,@bloodGroup,@conditions,@medications,@allergies,@lastAbnormalLab,@visitReason,@now,@now)`);
        const addConsultation = db.prepare(`INSERT OR IGNORE INTO consultations (id,patient_id,status,started_at,ended_at,patient_snapshot_json,report_json,report_status,created_via)
          VALUES (@id,@patientId,'completed',@startedAt,@endedAt,@snapshot,@report,'legacy','migration')`);
        const addSegment = db.prepare(`INSERT OR IGNORE INTO transcript_segments (consultation_id,seq,speaker,text,source,spoken_at)
          VALUES (@consultationId,@seq,@speaker,@text,'migration',@spokenAt)`);
        const now = new Date().toISOString();
        for (const patient of patients) addPatient.run({ id: patient.id, name: patient.name, age: patient.age, gender: patient.gender, bloodGroup: patient.bloodGroup,
            conditions: JSON.stringify(patient.conditions), medications: JSON.stringify(patient.medications), allergies: JSON.stringify(patient.allergies),
            lastAbnormalLab: patient.lastAbnormalLab, visitReason: patient.visitReason, now });
        for (const item of consultations) {
            addConsultation.run({ id: item.id, patientId: item.patient.id, startedAt: item.timestamp, endedAt: item.timestamp,
                snapshot: JSON.stringify(item.patientSnapshot), report: JSON.stringify(item.report) });
            item.transcript.forEach((entry, index) => {
                if (typeof entry.text !== 'string' || typeof entry.speaker !== 'string') throw new Error(`Invalid transcript segment in ${item.file}.`);
                addSegment.run({ consultationId: item.id, seq: index + 1, speaker: entry.speaker, text: entry.text,
                    spokenAt: typeof entry.timestamp === 'string' ? entry.timestamp : null });
            });
        }
    });
    db.transaction(() => {
        insert();
        const check = verifyMigration(db, undefined, sources);
        if (!check.ok) throw new Error(`Migration verification failed: ${check.issues.join('; ')}`);
    })();
    const check = verifyMigration(db, manifestPath, sources);
    if (!check.ok) throw new Error(`Migration verification failed: ${check.issues.join('; ')}`);
    return { patientCount: patients.length, consultationCount: consultations.length, transcriptCount: consultations.reduce((sum, item) => sum + item.transcript.length, 0),
        conflicts, orphanPatients, timestamps: consultations.map(({ file, rule }) => ({ file, rule })) };
}
