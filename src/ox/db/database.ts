import * as SQLite from 'expo-sqlite';

// 앱과 위젯(백그라운드 작업)이 같은 SQLite 파일을 쓴다. 기기 저장소가 항상 기준이고,
// 로그인한 경우에만 dirty 표시된 행을 Firestore로 올린다.
let db: SQLite.SQLiteDatabase | null = null;

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS calendars (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     color TEXT NOT NULL,
     mark_style TEXT NOT NULL DEFAULT 'ox',
     sort_order INTEGER NOT NULL DEFAULT 0,
     reminder TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     deleted INTEGER NOT NULL DEFAULT 0,
     dirty INTEGER NOT NULL DEFAULT 1
   );
   CREATE TABLE IF NOT EXISTS records (
     calendar_id TEXT NOT NULL,
     date TEXT NOT NULL,
     value TEXT NOT NULL DEFAULT '',
     memo TEXT NOT NULL DEFAULT '',
     updated_at INTEGER NOT NULL,
     dirty INTEGER NOT NULL DEFAULT 1,
     PRIMARY KEY (calendar_id, date)
   );
   CREATE TABLE IF NOT EXISTS kv (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

export const getDb = () => {
  if (db) return db;
  db = SQLite.openDatabaseSync('haruox.db');
  db.execSync('PRAGMA journal_mode = WAL;');
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.withTransactionSync(() => {
      db!.execSync(MIGRATIONS[i]);
      db!.execSync(`PRAGMA user_version = ${i + 1}`);
    });
  }
  return db;
};
