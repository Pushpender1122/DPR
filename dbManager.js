const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

class DatabaseManager {
    constructor() {
        // SQLite setup
        this.sqliteDb = new sqlite3.Database(path.join(__dirname, 'reports.db'));

        // PostgreSQL setup
        this.pgPool = new Pool({
            connectionString: process.env.CONNECTION_STRING,
            ssl: { rejectUnauthorized: false }
        });


    }

    async initializeDatabases() {
        try {
            console.log('🔄 Initializing databases...');

            // Create SQLite table
            await this.createSQLiteTables();

            // Create PostgreSQL table
            await this.createPostgreSQLTables();

            // Sync data from PostgreSQL to SQLite
            await this.syncFromPostgresToSQLite();

            // Migrate ISO dates to IST format
            await this.migrateDatesToIST();

            console.log('✅ Database initialization completed successfully!');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    // Create SQLite tables
    createSQLiteTables() {
        return new Promise((resolve, reject) => {
            this.sqliteDb.serialize(() => {
                this.sqliteDb.run(`CREATE TABLE IF NOT EXISTS reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid TEXT NOT NULL,
                    name TEXT NOT NULL,
                    team TEXT NOT NULL,
                    activities TEXT NOT NULL,
                    report_date TEXT NOT NULL,
                    submitted_at TEXT NOT NULL,
                    UNIQUE(uid, report_date)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating SQLite table:', err);
                        reject(err);
                    } else {
                        console.log('✅ SQLite table ready');
                        resolve();
                    }
                });
            });
        });
    }

    // Create PostgreSQL tables
    async createPostgreSQLTables() {
        try {
            const client = await this.pgPool.connect();

            await client.query(`
                CREATE TABLE IF NOT EXISTS reports (
                    id SERIAL PRIMARY KEY,
                    uid TEXT NOT NULL,
                    name TEXT NOT NULL,
                    team TEXT NOT NULL,
                    activities TEXT NOT NULL,
                    report_date TEXT NOT NULL,
                    submitted_at TEXT NOT NULL,
                    UNIQUE(uid, report_date)
                )
            `);

            client.release();
            console.log('✅ PostgreSQL table ready');
        } catch (error) {
            console.error('Error creating PostgreSQL table:', error);
            throw error;
        }
    }

    // Sync data from PostgreSQL to SQLite (on startup)
    async syncFromPostgresToSQLite() {
        try {
            console.log('🔄 Syncing data from PostgreSQL to SQLite...');

            // Get all data from PostgreSQL
            const client = await this.pgPool.connect();
            const result = await client.query('SELECT * FROM reports ORDER BY id');
            client.release();

            if (result.rows.length === 0) {
                console.log('📝 No data found in PostgreSQL');
                return;
            }

            // Clear SQLite and insert PostgreSQL data
            // await this.clearSQLite();

            for (const row of result.rows) {
                await this.insertToSQLiteOnly(row);
            }

            console.log(`✅ Synced ${result.rows.length} records from PostgreSQL to SQLite`);
        } catch (error) {
            console.error('Error syncing from PostgreSQL to SQLite:', error);
            // Don't throw error here - continue with local SQLite if PostgreSQL is unavailable
            console.log('⚠️  Continuing with local SQLite database only');
        }
    }

    // Clear SQLite data
    clearSQLite() {
        return new Promise((resolve, reject) => {
            this.sqliteDb.run('DELETE FROM reports', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Insert to SQLite only (used during sync)
    insertToSQLiteOnly(data) {
        return new Promise((resolve, reject) => {
            const stmt = this.sqliteDb.prepare(`
                INSERT OR REPLACE INTO reports (uid, name, team, activities, report_date, submitted_at) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                data.uid,
                data.name,
                data.team,
                data.activities,
                data.report_date,
                data.submitted_at,
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID });
                    }
                }
            );
            stmt.finalize();
        });
    }

    // Insert new report to both databases
    async insertReport(data) {
        try {
            console.log('💾 Saving report to both databases...');

            // Insert to PostgreSQL first
            let pgResult = null;
            try {
                const client = await this.pgPool.connect();
                pgResult = await client.query(`
                    INSERT INTO reports (uid, name, team, activities, report_date, submitted_at) 
                    VALUES ($1, $2, $3, $4, $5, $6) 
                    RETURNING id
                `, [data.uid, data.name, data.team, data.activities, data.report_date, data.submitted_at]);
                client.release();
                console.log('✅ Saved to PostgreSQL');
            } catch (pgError) {
                console.error('⚠️  PostgreSQL save failed:', pgError.message);
                // Continue with SQLite even if PostgreSQL fails
            }

            // Insert to SQLite
            const sqliteResult = await new Promise((resolve, reject) => {
                const stmt = this.sqliteDb.prepare(`
                    INSERT INTO reports (uid, name, team, activities, report_date, submitted_at) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                stmt.run(
                    data.uid,
                    data.name,
                    data.team,
                    data.activities,
                    data.report_date,
                    data.submitted_at,
                    function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ id: this.lastID });
                        }
                    }
                );
                stmt.finalize();
            });

            console.log('✅ Saved to SQLite');
            return sqliteResult;

        } catch (error) {
            console.error('❌ Error saving report:', error);
            throw error;
        }
    }

    // Update report in both databases
    async updateReport(id, data) {
        try {
            console.log('🔄 Updating report in both databases...');

            // First, get the original report data to find the PostgreSQL record
            const originalReport = await new Promise((resolve, reject) => {
                this.sqliteDb.get('SELECT * FROM reports WHERE id = ?', [id], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (!originalReport) {
                throw new Error('Original report not found in SQLite');
            }

            // Update PostgreSQL using uid and original report_date to find the record
            try {
                const client = await this.pgPool.connect();

                // First try to update by original uid and report_date
                let result = await client.query(`
                    UPDATE reports 
                    SET uid=$1, name=$2, team=$3, activities=$4, report_date=$5 
                    WHERE uid=$6 AND report_date=$7
                `, [data.uid, data.name, data.team, data.activities, data.report_date,
                originalReport.uid, originalReport.report_date]);

                console.log('PostgreSQL update result rows affected:', result.rowCount);

                // If no rows were affected, try to find by uid only (in case date changed)
                if (result.rowCount === 0) {
                    console.log('⚠️  Trying to update by UID only...');
                    result = await client.query(`
                        UPDATE reports 
                        SET uid=$1, name=$2, team=$3, activities=$4, report_date=$5 
                        WHERE uid=$6
                    `, [data.uid, data.name, data.team, data.activities, data.report_date,
                    originalReport.uid]);

                    console.log('PostgreSQL update by UID result rows affected:', result.rowCount);
                }

                // If still no rows were affected, insert as new record
                if (result.rowCount === 0) {
                    console.log('⚠️  No record found in PostgreSQL, inserting new record...');
                    await client.query(`
                        INSERT INTO reports (uid, name, team, activities, report_date, submitted_at) 
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (uid, report_date) 
                        DO UPDATE SET name=$2, team=$3, activities=$4
                    `, [data.uid, data.name, data.team, data.activities, data.report_date,
                    originalReport.submitted_at]);
                    console.log('✅ Inserted/Updated record in PostgreSQL');
                } else {
                    console.log('✅ Updated in PostgreSQL');
                }

                client.release();
            } catch (pgError) {
                console.error('⚠️  PostgreSQL update failed:', pgError.message);
                console.error('⚠️  PostgreSQL error details:', pgError);
                // Continue with SQLite even if PostgreSQL fails
            }

            // Update SQLite
            await new Promise((resolve, reject) => {
                const stmt = this.sqliteDb.prepare(`
                    UPDATE reports 
                    SET uid=?, name=?, team=?, activities=?, report_date=? 
                    WHERE id=?
                `);

                stmt.run(
                    data.uid,
                    data.name,
                    data.team,
                    data.activities,
                    data.report_date,
                    id,
                    function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
                stmt.finalize();
            });

            console.log('✅ Updated in SQLite');

        } catch (error) {
            console.error('❌ Error updating report:', error);
            throw error;
        }
    }

    // Get all reports from SQLite (fast retrieval)
    getAllReports(query = '', params = []) {
        return new Promise((resolve, reject) => {
            const finalQuery = query || 'SELECT * FROM reports ORDER BY report_date DESC, submitted_at DESC';

            this.sqliteDb.all(finalQuery, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get single report from SQLite
    getReportById(id) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.get('SELECT * FROM reports WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Check for duplicate reports in SQLite
    checkDuplicate(uid, reportDate) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.get(
                'SELECT id FROM reports WHERE uid = ? AND report_date = ?',
                [uid, reportDate],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // Close database connections
    async closeConnections() {
        try {
            await this.pgPool.end();
            this.sqliteDb.close();
            console.log('✅ Database connections closed');
        } catch (error) {
            console.error('Error closing database connections:', error);
        }
    }

    // Test PostgreSQL connection
    async testPostgreSQLConnection() {
        try {
            const client = await this.pgPool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ PostgreSQL connection successful');
            return true;
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error.message);
            return false;
        }
    }

    // Helper function to get IST formatted date
    getISTDateTime(date = new Date()) {
        return date.toLocaleString("en-IN", {
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

    // Helper function to convert ISO date to IST format
    convertISOToIST(isoString) {
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) {
                // If it's not a valid ISO date, assume it's already in IST format
                return isoString;
            }
            return this.getISTDateTime(date);
        } catch (error) {
            // If conversion fails, return original string
            return isoString;
        }
    }

    // Migrate existing ISO dates to IST format
    async migrateDatesToIST() {
        try {
            console.log('🔄 Checking for ISO date format migration...');

            // Get all records from SQLite
            const rows = await this.getAllReports();
            let migratedCount = 0;

            for (const row of rows) {
                // Check if submitted_at looks like ISO format (contains 'T' and 'Z')
                if (row.submitted_at && (row.submitted_at.includes('T') || row.submitted_at.includes('Z'))) {
                    const istDate = this.convertISOToIST(row.submitted_at);
                    console.log(`Converting date for ID ${row.id}: ${row.submitted_at} → ${istDate}`);

                    // Update SQLite
                    await new Promise((resolve, reject) => {
                        const stmt = this.sqliteDb.prepare(`
                            UPDATE reports SET submitted_at = ? WHERE id = ?
                        `);
                        stmt.run(istDate, row.id, function (err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                        stmt.finalize();
                    });

                    // Update PostgreSQL
                    try {
                        const client = await this.pgPool.connect();
                        await client.query(`
                            UPDATE reports SET submitted_at = $1 
                            WHERE uid = $2 AND report_date = $3
                        `, [istDate, row.uid, row.report_date]);
                        client.release();
                    } catch (pgError) {
                        console.warn('PostgreSQL migration failed for record:', row.id, pgError.message);
                    }

                    migratedCount++;
                }
            }

            if (migratedCount > 0) {
                console.log(`✅ Migrated ${migratedCount} records from ISO to IST format`);
            } else {
                console.log('📝 No ISO format dates found, migration not needed');
            }

        } catch (error) {
            console.error('❌ Date migration failed:', error);
            // Don't throw error, just warn - this shouldn't stop the application
        }
    }
}

module.exports = DatabaseManager;
