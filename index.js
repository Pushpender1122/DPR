const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const DB_FILE = path.join(__dirname, 'reports.db');
const EXCEL_FILE = path.join(__dirname, 'reports.xlsx');

const db = new sqlite3.Database(DB_FILE);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create table (if not exists) - store activity details as JSON so multiple activities allowed per submission
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

// Helper to append to Excel
async function appendToExcel(row) {
    const workbook = new ExcelJS.Workbook();
    try {
        if (fs.existsSync(EXCEL_FILE)) {
            await workbook.xlsx.readFile(EXCEL_FILE);
        } else {
            workbook.addWorksheet('Reports');
        }
    } catch (err) {
        workbook.addWorksheet('Reports');
    }

    const sheet = workbook.getWorksheet('Reports');
    if (sheet.rowCount === 0) {
        sheet.addRow(['UID', 'Name', 'Team', 'Activities (JSON)', 'Report Date', 'Submitted At']);
    }
    sheet.addRow([row.uid, row.name, row.team, JSON.stringify(row.activities), row.report_date, row.submitted_at]);
    await workbook.xlsx.writeFile(EXCEL_FILE);
}

// Render index page
app.get('/', (req, res) => {
    res.render('index');
});

// Submit endpoint
app.post('/submit', async (req, res) => {
    try {
        const { uid, name, team, report_date, activities, counts } = req.body;

        if (!uid || !name || !team || !report_date || !activities) {
            return res.render('index', { error: 'Missing required fields' });
        }

        // Format activities with counts
        const formattedActivities = Array.isArray(activities)
            ? activities.map(activity => ({
                name: activity,
                count: counts[activity] || ''
            }))
            : [{ name: activities, count: counts[activities] || '' }];

        const submitted_at = new Date().toISOString();

        const stmt = db.prepare(`INSERT OR IGNORE INTO reports (uid, name, team, activities, report_date, submitted_at) VALUES (?, ?, ?, ?, ?, ?)`);
        stmt.run(uid, name, team, JSON.stringify(formattedActivities), report_date, submitted_at, async function (err) {
            if (err) {
                console.error('DB error', err);
                return res.render('index', { error: 'Database error' });
            }
            if (this.changes === 0) {
                // duplicate (same uid+report_date)
                return res.render('index', { error: 'You have already submitted a report for this date.' });
            }

            // append to excel
            try {
                await appendToExcel({ uid, name, team, activities: formattedActivities, report_date, submitted_at });
            } catch (e) {
                console.warn('Excel append failed', e.message);
            }

            return res.render('index', { success: 'Report submitted successfully' });
        });
    } catch (e) {
        console.error(e);
        res.render('index', { error: 'Server error' });
    }
});

// Admin dashboard
app.get('/admin', (req, res) => {
    db.all(`SELECT * FROM reports ORDER BY report_date DESC, submitted_at DESC`, (err, rows) => {
        if (err) {
            return res.render('admin', { error: 'Database error', reports: [] });
        }

        const reports = rows.map(row => ({
            ...row,
            activities: JSON.parse(row.activities)
        }));

        res.render('admin', { reports });
    });
});

// Export to Google Sheets
app.get('/export-to-sheets', (req, res) => {
    // This would normally integrate with Google Sheets API
    // For now, redirect to a Google Sheet template with instructions
    res.redirect('https://docs.google.com/spreadsheets/create');
});

// Download excel file
app.get('/export', (req, res) => {
    const file = EXCEL_FILE;
    if (fs.existsSync(file)) {
        res.download(file);
    } else {
        res.status(404).render('index', { error: 'Excel file not found yet' });
    }
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
