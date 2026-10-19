import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { appConfig } from '../config';
import { openDb, defaultDatabasePath } from './index';
import { createSourceBackup, getMigrationPreview, migrateJson, verifyMigration } from './jsonMigration';

function dbArgument(args: string[]): string {
    const index = args.indexOf('--db');
    return index >= 0 && args[index + 1] ? path.resolve(args[index + 1]) : appConfig.dbPath || defaultDatabasePath();
}

async function run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];
    if (command === 'migrate-json') {
        const preview = getMigrationPreview();
        if (args.includes('--dry-run')) {
            console.log(JSON.stringify({ dryRun: true, ...preview, conflicts: preview.conflicts.length }, null, 2));
            return;
        }
        const backup = createSourceBackup();
        console.log(JSON.stringify({ backup: path.relative(process.cwd(), backup.directory), manifestSha256: backup.manifestHash,
            backendPatients: preview.backendPatientCount, frontendPatients: preview.frontendPatientCount,
            consultationFiles: preview.consultationCount, backupVerified: true }, null, 2));
        const db = openDb(dbArgument(args));
        try {
            const report = migrateJson(db, backup.manifestPath);
            console.log(JSON.stringify(report, null, 2));
        } finally { db.close(); }
        return;
    }
    if (command === 'verify') {
        const db = openDb(dbArgument(args));
        try {
            const backupRoot = path.join(path.dirname(defaultDatabasePath()), 'backups');
            const manifests = fs.existsSync(backupRoot) ? fs.readdirSync(backupRoot).filter(name => name.startsWith('pre-migration-')).sort().reverse() : [];
            const manifest = manifests.length ? path.join(backupRoot, manifests[0], 'manifest.json') : undefined;
            const result = verifyMigration(db, manifest);
            console.log(JSON.stringify(result, null, 2));
            if (!result.ok) process.exitCode = 1;
        } finally { db.close(); }
        return;
    }
    if (command === 'backup') {
        const db = openDb(dbArgument(args));
        try {
            const destination = path.resolve(path.dirname(defaultDatabasePath()), 'backups', `aurevia-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
            await db.backup(destination);
            const copy = new Database(destination, { readonly: true });
            try {
                for (const table of ['patients', 'consultations', 'transcript_segments']) {
                    const original = Number((db.prepare(`SELECT COUNT(*) count FROM ${table}`).get() as { count: number }).count);
                    const copied = Number((copy.prepare(`SELECT COUNT(*) count FROM ${table}`).get() as { count: number }).count);
                    if (original !== copied) throw new Error('Database backup verification failed.');
                }
                if (copy.pragma('integrity_check', { simple: true }) !== 'ok' || (copy.pragma('foreign_key_check') as unknown[]).length) throw new Error('Database backup verification failed.');
            } finally { copy.close(); }
            console.log(JSON.stringify({ backup: path.relative(process.cwd(), destination), verified: true }, null, 2));
        } finally { db.close(); }
        return;
    }
    throw new Error('Usage: db:migrate-json [--dry-run] [--db <path>] | db:verify [--db <path>] | db:backup [--db <path>].');
}

run().catch(error => {
    const message = error instanceof Error ? error.message.replace(/\r?\n/g, ' ') : 'Unknown database operation error.';
    console.error(message.slice(0, 500));
    process.exitCode = 1;
});
