const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000;

// Admin credentials - hardcoded for now
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: process.env.SECRET || 'faculty-reporter-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // set to true if using HTTPS
        maxAge: 3600000 // 1 hour
    }
}));

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
    uid INTEGER NOT NULL,
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

        // Convert UID to integer
        const uidInt = parseInt(uid, 10);
        if (isNaN(uidInt)) {
            return res.render('index', { error: 'Faculty ID must be a number' });
        }

        // First check if a report with this UID and date already exists
        db.get(`SELECT id FROM reports WHERE uid = ? AND report_date = ?`, [uidInt, report_date], async (checkErr, row) => {
            if (checkErr) {
                console.error('DB check error', checkErr);
                return res.render('index', { error: 'Database error' });
            }

            // If a row exists, it's a duplicate
            if (row) {
                return res.render('index', {
                    error: `You (${uidInt}) have already submitted a report for ${report_date}. Each user can only submit one report per day.`
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
            stmt.run(uidInt, name, team, JSON.stringify(formattedActivities), report_date, submitted_at, async function (err) {
                if (err) {
                    console.error('DB error', err);
                    return res.render('index', { error: 'Database error: ' + err.message });
                }

                // append to excel
                try {
                    await appendToExcel({ uid: uidInt, name, team, activities: formattedActivities, report_date, submitted_at });
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

// Admin login page
app.get('/admin/login', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin');
    }
    res.render('login');
});

// Admin login submission
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.redirect('/admin');
    } else {
        return res.render('login', { error: 'Invalid username or password' });
    }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}

// Admin dashboard - protected by authentication
app.get('/admin', requireAdmin, (req, res) => {
    // Get filter parameters
    const { date, name, uid, error, success } = req.query;

    // Base query
    let query = `SELECT * FROM reports`;
    const params = [];
    const conditions = [];

    // Add filter conditions if provided
    if (date) {
        conditions.push(`report_date = ?`);
        params.push(date);
    }

    if (name) {
        conditions.push(`name LIKE ?`);
        params.push(`%${name}%`);
    }

    if (uid) {
        // Try to parse as integer first for exact matching
        const uidInt = parseInt(uid, 10);
        if (!isNaN(uidInt)) {
            conditions.push(`uid = ?`);
            params.push(uidInt);
        } else {
            // Fallback to string matching for partial search
            conditions.push(`uid LIKE ?`);
            params.push(`%${uid}%`);
        }
    }

    // Combine conditions if any
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    query += ` ORDER BY report_date DESC, submitted_at DESC`;

    // Execute the query
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.render('admin', { error: 'Database error', reports: [] });
        }

        const reports = rows.map(row => ({
            ...row,
            activities: JSON.parse(row.activities)
        }));

        // Pass filters back to the template for displaying current filters
        const filters = { date, name, uid };
        // Pass any error or success messages from query params
        res.render('admin', {
            reports,
            filters,
            error: error || null,
            success: success || null
        });
    });
});

// Export to Google Sheets - protected by authentication
app.get('/export-to-sheets', requireAdmin, (req, res) => {
    // This would normally integrate with Google Sheets API
    // For now, redirect to a Google Sheet template with instructions
    res.redirect('https://docs.google.com/spreadsheets/create');
});

// Admin edit report form - protected by authentication
app.get('/admin/edit/:id', requireAdmin, (req, res) => {
    const reportId = req.params.id;

    db.get(`SELECT * FROM reports WHERE id = ?`, [reportId], (err, row) => {
        if (err) {
            console.error('Database error when fetching report:', err);
            return res.redirect('/admin?error=' + encodeURIComponent('Database error: ' + err.message));
        }

        if (!row) {
            console.error('Report not found with ID:', reportId);
            return res.redirect('/admin?error=Report+not+found');
        }

        // Parse activities
        let reportActivities = [];
        try {
            reportActivities = JSON.parse(row.activities);
            console.log('Parsed activities:', reportActivities);
        } catch (e) {
            console.error('Error parsing activities JSON:', e);
            reportActivities = [];
        }

        const report = {
            ...row,
            activities: reportActivities
        };

        // Get the list of all activities for each team
        const secrecyActivities = [
            "Handling Queries from DSR and Front Office",
            "Resolving of student Queries",
            "Scrutiny",
            "Calling and Follow up",
            "Re-evaluation",
            "Rectification/Proration of Marks",
            "Academic Benefit",
            "Confidential Result Declaration",
            "Question Bank",
            "Data Entry of marks",
            "Duty leave",
            "Staff Indisciplinary",
            "Coordination in External Re-evaluation",
            "Coordination in External Question Paper",
            "Reports/Record maintenance/Data Analysis",
            "Email Handling",
            "Digitalization of Record",
            "Co-ordination"
        ];

        const generationActivities = [
            "Generation of Question Paper",
            "Email handling",
            "Resolving of faculty Queries/ Calling(telephonic and visitors)",
            "RMS Handling",
            "Vetting-faculty dealing",
            "Vetting - Calling",
            "Envelope preparation(For vetting )",
            "Sorting and pending status updation",
            "Reports / Record maintenance",
            "Closer report",
            "Final Question paper verification",
            "Final Question paper uploading for Evalution/DE"
        ];

        const translationActivities = [
            "Translation",
            "Printing / downloading",
            "answer key sorting /set making/ stapling / pasting of stickers / seating plan etc",
            "Stamping of brown envelopes",
            "Packing",
            "Verification & sorting of pakets / answer key",
            "Answer key -(Manual)",
            "Answer key - (Online )",
            "Reports/Record maintenance",
            "Shredding of confidential documents",
            "Dispatch QP/OMR"
        ];

        const editingActivities = [
            "Editing",
            "Question bank entry on MyClass",
            "Proof reading",
            "Final question paper uploading for Evaulation/DE",
            "Reports/Record maintenance",
            "Segregation of QP"
        ];

        res.render('edit-report', {
            report,
            secrecyActivities,
            generationActivities,
            translationActivities,
            editingActivities
        });
    });
});// Admin update report - protected by authentication
app.post('/admin/edit/:id', requireAdmin, (req, res) => {
    const reportId = req.params.id;
    const { uid, name, team, report_date, activities } = req.body;

    // Convert UID to integer
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) {
        return res.redirect(`/admin/edit/${reportId}?error=${encodeURIComponent('Faculty ID must be a number')}`);
    }

    // Format activities similar to the submit route
    let formattedActivities = [];

    // Check if activities is an array (multiple activities selected)
    if (Array.isArray(activities)) {
        const counts = req.body.counts || {};
        formattedActivities = activities.map(activity => ({
            name: activity,
            count: counts[activity] || ''
        }));
    } else if (activities) {
        // Single activity
        formattedActivities = [{
            name: activities,
            count: req.body.counts ? req.body.counts[activities] || '' : ''
        }];
    }

    // Update the record
    const stmt = db.prepare(`UPDATE reports SET uid=?, name=?, team=?, activities=?, report_date=? WHERE id=?`);
    stmt.run(uidInt, name, team, JSON.stringify(formattedActivities), report_date, reportId, function (err) {
        if (err) {
            console.error('DB update error', err);
            return res.redirect(`/admin/edit/${reportId}?error=${encodeURIComponent('Database error: ' + err.message)}`);
        }

        // Regenerate the Excel file to reflect the changes
        generateExcelFromDatabase().catch(e => console.warn('Excel regeneration failed', e.message));

        return res.redirect('/admin?success=Report+updated+successfully');
    });
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

// Download excel file - protected by authentication
app.get('/export', requireAdmin, async (req, res) => {
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
