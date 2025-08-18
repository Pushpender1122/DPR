## Faculty Reporter - Server

Requirements:

- Node.js (14+)
- npm

Setup:
cd server
npm install
npm run init-db # creates SQLite DB file
npm start

API:
POST /submit
Body JSON: {
uid: string,
name: string,
team: string,
report_date: 'YYYY-MM-DD',
activities: [{ name: 'Activity name', count: '20 papers' }, ...]
}

GET /export
Download the aggregated Excel (reports.xlsx)

Notes:

- The server enforces one submission per (uid, report_date).
- Activities are stored as JSON in DB and Excel.
