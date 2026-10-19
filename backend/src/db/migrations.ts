import Database from 'better-sqlite3';

export const CURRENT_SCHEMA_VERSION = 1;

const migrations: Record<number, (db: Database.Database) => void> = {
    1: db => {
        db.exec(`
            CREATE TABLE patients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER,
                gender TEXT,
                blood_group TEXT,
                conditions_json TEXT NOT NULL DEFAULT '[]',
                medications_json TEXT NOT NULL DEFAULT '[]',
                allergies_json TEXT NOT NULL DEFAULT '[]',
                last_abnormal_lab TEXT,
                visit_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE consultations (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
                status TEXT NOT NULL CHECK (status IN ('active','finalizing','completed','interrupted','failed')),
                started_at TEXT NOT NULL,
                ended_at TEXT,
                patient_snapshot_json TEXT NOT NULL,
                report_json TEXT,
                report_status TEXT CHECK (report_status IN ('generated','legacy')),
                created_via TEXT NOT NULL DEFAULT 'app'
            );
            CREATE INDEX consultations_patient_started ON consultations(patient_id, started_at DESC);
            CREATE INDEX consultations_status ON consultations(status);
            CREATE TABLE transcript_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
                seq INTEGER NOT NULL,
                speaker TEXT NOT NULL,
                text TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'speech',
                spoken_at TEXT,
                UNIQUE (consultation_id, seq)
            );
        `);
        db.pragma('user_version = 1');
    }
};

export function applyMigrations(db: Database.Database): void {
    const version = Number(db.pragma('user_version', { simple: true }));
    if (version > CURRENT_SCHEMA_VERSION) {
        throw new Error(`Database schema version ${version} is newer than supported version ${CURRENT_SCHEMA_VERSION}.`);
    }
    for (let next = version + 1; next <= CURRENT_SCHEMA_VERSION; next += 1) {
        const migration = migrations[next];
        if (!migration) throw new Error(`Missing database migration ${next}.`);
        db.transaction(() => migration(db))();
    }
}
