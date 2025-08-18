const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, 'reports.db');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    activities TEXT NOT NULL,
    report_date TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    UNIQUE(uid, report_date)
  )`);
});

db.close(() => console.log('DB initialized at ' + dbFile));
