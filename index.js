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

    // Initialize the sheet with headers if it's empty
    if (sheet.rowCount === 0) {
        sheet.addRow(['UID', 'Name', 'Team', 'Report Date', 'Activity', 'Count/Hours', 'Submitted At']);

        // Format header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }

    // Add each activity as a separate row for better analysis
    for (const activity of row.activities) {
        sheet.addRow([
            row.uid,
            row.name,
            row.team,
            row.report_date,
            activity.name,
            activity.count,
            row.submitted_at
        ]);
    }

    // Auto-filter for all columns to make analysis easier
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 7 }
    };

    // Make all columns wider for better visibility
    sheet.columns.forEach(column => {
        column.width = 20;
    });

    // Add conditional formatting for better readability
    for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        // Alternate row colors for readability
        if (i % 2 === 0) {
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFAFAFA' }
                };
            });
        }
    }

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

        // First check if a report with this UID and date already exists
        db.get(`SELECT id FROM reports WHERE uid = ? AND report_date = ?`, [uid, report_date], async (checkErr, row) => {
            if (checkErr) {
                console.error('DB check error', checkErr);
                return res.render('index', { error: 'Database error' });
            }

            // If a row exists, it's a duplicate
            if (row) {
                return res.render('index', {
                    error: `You (${uid}) have already submitted a report for ${report_date}. Each user can only submit one report per day.`
                });
            }

            // Format activities with counts
            const formattedActivities = Array.isArray(activities)
                ? activities.map(activity => ({
                    name: activity,
                    count: counts[activity] || ''
                }))
                : [{ name: activities, count: counts[activities] || '' }];

            const submitted_at = new Date().toISOString();

            // Insert the new record
            const stmt = db.prepare(`INSERT INTO reports (uid, name, team, activities, report_date, submitted_at) VALUES (?, ?, ?, ?, ?, ?)`);
            stmt.run(uid, name, team, JSON.stringify(formattedActivities), report_date, submitted_at, async function (err) {
                if (err) {
                    console.error('DB error', err);
                    return res.render('index', { error: 'Database error: ' + err.message });
                }

                // append to excel
                try {
                    await appendToExcel({ uid, name, team, activities: formattedActivities, report_date, submitted_at });
                } catch (e) {
                    console.warn('Excel append failed', e.message);
                }

                return res.render('index', { success: 'Report submitted successfully' });
            });
        });
    } catch (e) {
        console.error(e);
        res.render('index', { error: 'Server error: ' + e.message });
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

// Generate Excel file from database
async function generateExcelFromDatabase() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM reports ORDER BY report_date DESC, submitted_at DESC`, async (err, rows) => {
            if (err) {
                return reject(err);
            }

            try {
                const workbook = new ExcelJS.Workbook();
                const sheet = workbook.addWorksheet('Reports');

                // Add header row
                sheet.addRow(['UID', 'Name', 'Team', 'Report Date', 'Activity', 'Count/Hours', 'Submitted At']);

                // Format header row
                const headerRow = sheet.getRow(1);
                headerRow.font = { bold: true };
                headerRow.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE0E0E0' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });

                // Add data rows
                for (const row of rows) {
                    const activities = JSON.parse(row.activities);
                    for (const activity of activities) {
                        sheet.addRow([
                            row.uid,
                            row.name,
                            row.team,
                            row.report_date,
                            activity.name,
                            activity.count,
                            row.submitted_at
                        ]);
                    }
                }

                // Auto-filter for all columns to make analysis easier
                sheet.autoFilter = {
                    from: { row: 1, column: 1 },
                    to: { row: 1, column: 7 }
                };

                // Make all columns wider for better visibility
                sheet.columns.forEach(column => {
                    column.width = 20;
                });

                // Add conditional formatting for better readability
                for (let i = 2; i <= sheet.rowCount; i++) {
                    const row = sheet.getRow(i);
                    // Alternate row colors for readability
                    if (i % 2 === 0) {
                        row.eachCell(cell => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFAFAFA' }
                            };
                        });
                    }
                }

                await workbook.xlsx.writeFile(EXCEL_FILE);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Download excel file
app.get('/export', async (req, res) => {
    try {
        if (!fs.existsSync(EXCEL_FILE)) {
            // If the Excel file doesn't exist, generate it from the database
            await generateExcelFromDatabase();
        }

        // Now the file should exist, download it
        if (fs.existsSync(EXCEL_FILE)) {
            res.download(EXCEL_FILE);
        } else {
            res.status(404).render('index', { error: 'Could not generate Excel file' });
        }
    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).render('index', { error: 'Error generating Excel file' });
    }
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
