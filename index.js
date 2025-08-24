const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');
const DatabaseManager = require('./dbManager');

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database Manager
let dbManager;

// Helper function to get IST formatted date
function getISTDateTime() {
    return new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Load teams configuration
const teamsConfigPath = path.join(__dirname, 'config', 'teams.json');
let teamsConfig = {};
try {
    const configData = fs.readFileSync(teamsConfigPath, 'utf8');
    teamsConfig = JSON.parse(configData);
} catch (error) {
    console.error('Error loading teams configuration:', error);
    process.exit(1);
}

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

const EXCEL_FILE = path.join(__dirname, 'reports.xlsx');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize databases
async function initializeApp() {
    try {
        console.log('🚀 Starting Faculty Daily Reporter...');

        // Initialize database manager
        dbManager = new DatabaseManager();
        const isPostgreSQLConnected = await dbManager.testPostgreSQLConnection();
        if (isPostgreSQLConnected) {
            console.log('✅ PostgreSQL connection successful');
            await dbManager.initializeDatabases();
        } else {
            console.log('⚠️  PostgreSQL unavailable, continuing with SQLite only');
            await dbManager.createSQLiteTables();
        }

        console.log('✅ Application initialized successfully!');

        // Start server
        app.listen(PORT, () => {
            console.log(`🌐 Server running on http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin panel: http://localhost:${PORT}/admin/login`);
        });

    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (dbManager) {
        await dbManager.closeConnections();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (dbManager) {
        await dbManager.closeConnections();
    }
    process.exit(0);
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
    res.render('index', { teamsConfig });
});

// Submit endpoint
app.post('/submit', async (req, res) => {
    try {
        const { uid, name, team, report_date, activities, counts } = req.body;

        if (!uid || !name || !team || !report_date || !activities) {
            return res.render('index', { error: 'Missing required fields', teamsConfig });
        }

        // Validate UID is not empty
        if (!uid.trim()) {
            return res.render('index', { error: 'Faculty ID cannot be empty', teamsConfig });
        }

        // Check for duplicate using our database manager
        const existingReport = await dbManager.checkDuplicate(uid, report_date);
        if (existingReport) {
            return res.render('index', {
                error: `You (${uid}) have already submitted a report for ${report_date}. Each user can only submit one report per day.`,
                teamsConfig
            });
        }

        // Format activities with counts
        const formattedActivities = Array.isArray(activities)
            ? activities.map(activity => ({
                name: activity,
                count: counts[activity] || ''
            }))
            : [{ name: activities, count: counts[activities] || '' }];

        // Store in IST format for database consistency
        const submitted_at = getISTDateTime();

        // Insert into both databases using our database manager
        const reportData = {
            uid,
            name,
            team,
            activities: JSON.stringify(formattedActivities),
            report_date,
            submitted_at
        };

        await dbManager.insertReport(reportData);

        // Update Excel file
        try {
            await appendToExcel({ uid, name, team, activities: formattedActivities, report_date, submitted_at });
        } catch (e) {
            console.warn('Excel append failed', e.message);
        }

        return res.render('index', { success: 'Report submitted successfully', teamsConfig });

    } catch (error) {
        console.error('Submit error:', error);
        res.render('index', { error: 'Server error: ' + error.message, teamsConfig });
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
    if (username.toLowerCase() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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
// Admin dashboard - protected by authentication
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        // Get filter parameters
        const { date, name, uid, error, success } = req.query;

        // Build query and parameters for filtering
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
            conditions.push(`uid LIKE ?`);
            params.push(`%${uid}%`);
        }

        // Combine conditions if any
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Add sorting
        query += ` ORDER BY report_date DESC, submitted_at DESC`;

        // Get reports from SQLite (fast retrieval)
        const rows = await dbManager.getAllReports(query, params);

        const reports = rows.map(row => ({
            ...row,
            activities: JSON.parse(row.activities)
        }));

        // Pass filters back to the template for displaying current filters
        const filters = { date, name, uid };

        res.render('admin', {
            reports,
            filters,
            error: error || null,
            success: success || null
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.render('admin', {
            error: 'Database error: ' + error.message,
            reports: [],
            filters: {},
            success: null
        });
    }
});

// Export to Google Sheets - protected by authentication
app.get('/export-to-sheets', requireAdmin, (req, res) => {
    // This would normally integrate with Google Sheets API
    // For now, redirect to a Google Sheet template with instructions
    res.redirect('https://docs.google.com/spreadsheets/create');
});

// Admin edit report form - protected by authentication
// Admin edit report form - protected by authentication
app.get('/admin/edit/:id', requireAdmin, async (req, res) => {
    try {
        const reportId = req.params.id;

        // Get report from SQLite using our database manager
        const row = await dbManager.getReportById(reportId);

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

        // Create team mapping for frontend
        const teamMapping = {};
        Object.keys(teamsConfig.teams).forEach(teamKey => {
            // Create consistent team ID by removing spaces and special characters
            const teamId = teamKey.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
            teamMapping[teamKey] = teamId;
        });

        console.log('Team mapping generated:', teamMapping);

        res.render('edit-report', {
            report,
            teamsConfig,
            teamMapping
        });

    } catch (error) {
        console.error('Database error when fetching report:', error);
        return res.redirect('/admin?error=' + encodeURIComponent('Database error: ' + error.message));
    }
});// Admin update report - protected by authentication
app.post('/admin/edit/:id', requireAdmin, async (req, res) => {
    try {
        const reportId = req.params.id;
        const { uid, name, team, report_date, activities } = req.body;

        // Validate UID is not empty
        if (!uid || !uid.trim()) {
            return res.redirect(`/admin/edit/${reportId}?error=${encodeURIComponent('Faculty ID cannot be empty')}`);
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

        // Update in both databases using our database manager
        const updateData = {
            uid,
            name,
            team,
            activities: JSON.stringify(formattedActivities),
            report_date
        };

        await dbManager.updateReport(reportId, updateData);

        // Regenerate the Excel file to reflect the changes
        generateExcelFromDatabase().catch(e => console.warn('Excel regeneration failed', e.message));

        return res.redirect('/admin?success=Report+updated+successfully');

    } catch (error) {
        console.error('DB update error', error);
        return res.redirect(`/admin/edit/${reportId}?error=${encodeURIComponent('Database error: ' + error.message)}`);
    }
});

// Generate Excel file from database
async function generateExcelFromDatabase() {
    try {
        // Get all reports from SQLite using our database manager
        const rows = await dbManager.getAllReports();

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
    } catch (error) {
        console.error('Error generating Excel from database:', error);
        throw error;
    }
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

// Initialize and start the application
initializeApp();
