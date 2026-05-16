import * as SQLite from 'expo-sqlite';

/**
 * Local database for Offline-First check-in.
 * 
 * Tables:
 * - tickets: stores valid tickets pre-fetched from server.
 * - sync_queue: stores check-in events to be synced back to server.
 */

const DB_NAME = 'unihub_checkin.db';

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // 1. Initial Tables
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workshops (
        id TEXT PRIMARY KEY,
        title TEXT,
        room TEXT,
        start_date TEXT,
        end_date TEXT,
        registration_count INTEGER,
        capacity INTEGER,
        is_paid INTEGER
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tickets (
        tid TEXT PRIMARY KEY,
        wid TEXT,
        uid TEXT,
        student_code TEXT,
        student_name TEXT,
        workshop_title TEXT,
        status INTEGER DEFAULT 0, -- 0: pending, 1: checked_in
        checkin_time TEXT
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tid TEXT UNIQUE,
        client_timestamp TEXT,
        synced INTEGER DEFAULT 0
      );
    `);
    
    console.log('[DB] Database tables initialized successfully.');
  } catch (err) {
    console.error('[DB] Failed to initialize tables:', err);
  }

  // 2. Migration: add workshop_title if not exists (for existing installs that already had the table)
  try {
    const tableInfo: any = await db.getAllAsync("PRAGMA table_info(tickets)");
    const hasTitleColumn = tableInfo.some((col: any) => col.name === 'workshop_title');
    if (!hasTitleColumn) {
      await db.execAsync("ALTER TABLE tickets ADD COLUMN workshop_title TEXT");
    }
  } catch (err) {
    console.error('[DB] Migration failed:', err);
  }

  return db;
};

export const getDb = async () => {
  return await SQLite.openDatabaseAsync(DB_NAME);
};
