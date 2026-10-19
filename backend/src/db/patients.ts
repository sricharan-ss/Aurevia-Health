import { z } from 'zod';
import type { AppDatabase } from './index';

const stringList = z.array(z.string().trim().min(1).max(200)).max(50);
const patientFields = {
    name: z.string().trim().min(1).max(120),
    age: z.number().int().min(0).max(130),
    gender: z.enum(['Male', 'Female']),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).or(z.literal('')).optional(),
    conditions: stringList.default([]),
    medications: stringList.default([]),
    allergies: stringList.default([]),
    lastAbnormalLab: z.string().max(500).optional(),
    visitReason: z.string().max(500).optional()
};
export const createPatientSchema = z.object(patientFields).strip();
export const updatePatientSchema = z.object({
    name: patientFields.name.optional(), age: patientFields.age.optional(), gender: patientFields.gender.optional(),
    bloodGroup: patientFields.bloodGroup, conditions: stringList.optional(), medications: stringList.optional(),
    allergies: stringList.optional(), lastAbnormalLab: patientFields.lastAbnormalLab, visitReason: patientFields.visitReason
}).strip().refine(value => Object.keys(value).length > 0, 'At least one field is required.');

type PatientRow = {
    id: string; name: string; age: number | null; gender: string | null; blood_group: string | null;
    conditions_json: string; medications_json: string; allergies_json: string;
    last_abnormal_lab: string | null; visit_reason: string | null;
};

export interface PatientRecord {
    id: string; name: string; age: number | null; gender: string | null; bloodGroup: string;
    conditions: string[]; medications: string[]; allergies: string[]; lastAbnormalLab: string;
    visitReason: string; status: 'waiting' | 'in-progress' | 'completed';
}

function mapPatient(row: PatientRow, status: PatientRecord['status'] = 'waiting'): PatientRecord {
    return {
        id: row.id, name: row.name, age: row.age, gender: row.gender, bloodGroup: row.blood_group ?? '',
        conditions: JSON.parse(row.conditions_json) as string[], medications: JSON.parse(row.medications_json) as string[],
        allergies: JSON.parse(row.allergies_json) as string[], lastAbnormalLab: row.last_abnormal_lab ?? '',
        visitReason: row.visit_reason ?? '', status
    };
}

function statusFor(db: AppDatabase, patientId: string): PatientRecord['status'] {
    const active = db.prepare("SELECT 1 FROM consultations WHERE patient_id = ? AND status IN ('active','finalizing') LIMIT 1").get(patientId);
    if (active) return 'in-progress';
    const completed = db.prepare("SELECT ended_at FROM consultations WHERE patient_id = ? AND status = 'completed' ORDER BY ended_at DESC LIMIT 1").get(patientId) as { ended_at: string | null } | undefined;
    if (completed?.ended_at && new Date(completed.ended_at).toDateString() === new Date().toDateString()) return 'completed';
    return 'waiting';
}

export function getPatient(db: AppDatabase, id: string): PatientRecord | undefined {
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as PatientRow | undefined;
    return row ? mapPatient(row, statusFor(db, id)) : undefined;
}
export function listPatients(db: AppDatabase): PatientRecord[] {
    return (db.prepare('SELECT * FROM patients ORDER BY id').all() as PatientRow[]).map(row => mapPatient(row, statusFor(db, row.id)));
}

function insertPatient(db: AppDatabase, id: string, data: z.infer<typeof createPatientSchema>, now: string): void {
    db.prepare(`INSERT INTO patients (id,name,age,gender,blood_group,conditions_json,medications_json,allergies_json,last_abnormal_lab,visit_reason,created_at,updated_at)
        VALUES (@id,@name,@age,@gender,@bloodGroup,@conditions,@medications,@allergies,@lastAbnormalLab,@visitReason,@now,@now)`)
        .run({ id, name: data.name, age: data.age, gender: data.gender, bloodGroup: data.bloodGroup ?? '',
            conditions: JSON.stringify(data.conditions ?? []), medications: JSON.stringify(data.medications ?? []), allergies: JSON.stringify(data.allergies ?? []),
            lastAbnormalLab: data.lastAbnormalLab ?? '', visitReason: data.visitReason ?? '', now });
}

export function createPatient(db: AppDatabase, input: unknown, now = new Date().toISOString()): PatientRecord {
    const data = createPatientSchema.parse(input);
    const year = new Date(now).getFullYear();
    const generate = db.transaction(() => {
        const rows = db.prepare('SELECT id FROM patients WHERE id GLOB ?').all(`PT-${year}-[0-9]*`) as Array<{ id: string }>;
        const seq = rows.reduce((max, row) => Math.max(max, Number(row.id.slice(-4)) || 0), 0);
        const id = `PT-${year}-${String(seq + 1).padStart(4, '0')}`;
        insertPatient(db, id, data, now);
        return id;
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try { return getPatient(db, generate())!; }
        catch (error) {
            if (!(error instanceof Error) || !error.message.includes('UNIQUE constraint failed') || attempt === 2) throw error;
        }
    }
    throw new Error('Unable to generate a unique patient ID.');
}

export function updatePatient(db: AppDatabase, id: string, input: unknown, now = new Date().toISOString()): PatientRecord | undefined {
    const data = updatePatientSchema.parse(input);
    if (!getPatient(db, id)) return undefined;
    const mapping: Record<string, string> = { name: 'name', age: 'age', gender: 'gender', bloodGroup: 'blood_group',
        conditions: 'conditions_json', medications: 'medications_json', allergies: 'allergies_json', lastAbnormalLab: 'last_abnormal_lab', visitReason: 'visit_reason' };
    const values: Record<string, unknown> = {};
    const assignments = Object.entries(data).map(([key, value]) => {
        const column = mapping[key];
        values[column] = key.endsWith('ions') || key === 'medications' || key === 'allergies' ? JSON.stringify(value) : value;
        return `${column} = @${column}`;
    });
    values.id = id; values.updated_at = now;
    db.prepare(`UPDATE patients SET ${assignments.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(values);
    return getPatient(db, id);
}
