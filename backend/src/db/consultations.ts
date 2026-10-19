import { randomUUID } from 'node:crypto';
import type { AppDatabase } from './index';
import type { PatientRecord } from './patients';

export type ConsultationStatus = 'active' | 'finalizing' | 'completed' | 'interrupted' | 'failed';
export interface ConsultationRow {
    id: string; patient_id: string; status: ConsultationStatus; started_at: string; ended_at: string | null;
    patient_snapshot_json: string; report_json: string | null; report_status: 'generated' | 'legacy' | null;
}
export interface TranscriptSegment { seq: number; speaker: string; text: string; source: string; spokenAt: string | null; }

export function isValidConsultationId(id: string): boolean { return /^[A-Za-z0-9_-]{1,100}$/.test(id); }

export function getConsultation(db: AppDatabase, id: string): ConsultationRow | undefined {
    return db.prepare('SELECT * FROM consultations WHERE id=?').get(id) as ConsultationRow | undefined;
}

export function startConsultation(db: AppDatabase, patient: PatientRecord, now = new Date().toISOString()): { consultationId: string; previousInterruptedConsultationId?: string } {
    const consultationId = randomUUID();
    const previous = db.prepare("SELECT id FROM consultations WHERE patient_id=? AND status='active' ORDER BY started_at DESC LIMIT 1").get(patient.id) as { id: string } | undefined;
    const run = db.transaction(() => {
        db.prepare("UPDATE consultations SET status='interrupted' WHERE patient_id=? AND status='active'").run(patient.id);
        db.prepare(`INSERT INTO consultations(id,patient_id,status,started_at,patient_snapshot_json,created_via)
            VALUES(?,?,'active',?,?,'app')`).run(consultationId, patient.id, now, JSON.stringify(patient));
    });
    run();
    return { consultationId, ...(previous ? { previousInterruptedConsultationId: previous.id } : {}) };
}

export function transitionConsultation(db: AppDatabase, id: string, from: ConsultationStatus[], to: ConsultationStatus): boolean {
    if (from.length === 0) return false;
    const placeholders = from.map(() => '?').join(',');
    return db.prepare(`UPDATE consultations SET status=? WHERE id=? AND status IN (${placeholders})`).run(to, id, ...from).changes === 1;
}

export function appendTranscriptSegment(db: AppDatabase, id: string, speaker: string, text: string, source: 'speech' | 'manual', spokenAt: string | null = new Date().toISOString()): number {
    return db.transaction(() => {
        const seq = Number((db.prepare('SELECT COALESCE(MAX(seq),0)+1 seq FROM transcript_segments WHERE consultation_id=?').get(id) as { seq: number }).seq);
        db.prepare('INSERT INTO transcript_segments(consultation_id,seq,speaker,text,source,spoken_at) VALUES(?,?,?,?,?,?)').run(id, seq, speaker, text, source, spokenAt);
        return seq;
    })();
}

export function appendTranscriptSegments(db: AppDatabase, id: string, chunks: Array<{ speaker: string; text: string }>, source: 'manual' | 'speech'): TranscriptSegment[] {
    return db.transaction(() => chunks.map(chunk => {
        const seq = Number((db.prepare('SELECT COALESCE(MAX(seq),0)+1 seq FROM transcript_segments WHERE consultation_id=?').get(id) as { seq: number }).seq);
        db.prepare('INSERT INTO transcript_segments(consultation_id,seq,speaker,text,source,spoken_at) VALUES(?,?,?,?,?,?)')
            .run(id, seq, chunk.speaker, chunk.text, source, new Date().toISOString());
        return { ...chunk, seq, source, spokenAt: new Date().toISOString() };
    }))();
}

export function readTranscript(db: AppDatabase, id: string): TranscriptSegment[] {
    return (db.prepare('SELECT seq,speaker,text,source,spoken_at FROM transcript_segments WHERE consultation_id=? ORDER BY seq').all(id) as Array<{ seq: number; speaker: string; text: string; source: string; spoken_at: string | null }>).map(row => ({ seq: row.seq, speaker: row.speaker, text: row.text, source: row.source, spokenAt: row.spoken_at }));
}

export function completeConsultation(db: AppDatabase, id: string, report: unknown, endedAt = new Date().toISOString()): boolean {
    return db.prepare("UPDATE consultations SET status='completed',report_json=?,report_status='generated',ended_at=? WHERE id=? AND status='finalizing'").run(JSON.stringify(report), endedAt, id).changes === 1;
}

export function recoverConsultations(db: AppDatabase): number {
    return db.prepare("UPDATE consultations SET status='interrupted' WHERE status IN ('active','finalizing')").run().changes;
}
