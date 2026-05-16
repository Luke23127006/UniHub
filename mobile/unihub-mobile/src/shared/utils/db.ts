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

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS tickets (
      tid TEXT PRIMARY KEY,
      wid TEXT,
      uid TEXT,
      student_code TEXT,
      student_name TEXT,
      status INTEGER DEFAULT 0, -- 0: pending, 1: checked_in
      checkin_time TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tid TEXT UNIQUE,
      client_timestamp TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  return db;
};

export const getDb = async () => {
  return await SQLite.openDatabaseAsync(DB_NAME);
};
