import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { appConfig } from '../config';
import { applyMigrations } from './migrations';

export type AppDatabase = Database.Database;

export function defaultDatabasePath(): string {
    return path.resolve(__dirname, '../../storage/aurevia.db');
}

export function openDb(databasePath = appConfig.dbPath || defaultDatabasePath()): AppDatabase {
    if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
    const db = new Database(databasePath);
    try {
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');
        applyMigrations(db);
        return db;
    } catch (error) {
        db.close();
        throw error;
    }
}
