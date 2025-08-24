# Faculty Daily Reporter

A comprehensive web application for faculty members to submit daily activity reports with administrative management capabilities.

## 🚀 Features

### **Core Functionality**

- **Daily Report Submission**: Faculty can submit activity reports with counts/hours
- **Dynamic Team Configuration**: JSON-based team and activity management
- **Excel Export**: Automatic generation of comprehensive Excel reports
- **Admin Dashboard**: Complete administrative interface for report management
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

### **Team Management**

- **4 Pre-configured Teams**:
  - **Secrecy Cell** (🔒): 18 activities including queries, re-evaluation, data entry
  - **Generation & Vetting** (📄): 12 activities including question paper generation, vetting
  - **Translation** (🌐): 11 activities including translation, printing, dispatch
  - **Editing** (✏️): 6 activities including editing, proof reading, segregation

### **Advanced Features**

- **Dynamic Configuration**: Easy team/activity management via `config/teams.json`
- **Flexible UID Support**: String-based Faculty IDs (alphanumeric, codes, etc.)
- **Activity Tracking**: Count/hours input for each selected activity
- **Date-based Reporting**: One report per faculty per day enforcement
- **Search & Filter**: Admin panel with UID and date filtering
- **Report Editing**: Full CRUD operations for submitted reports

## 🛠️ Technical Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3 (local file-based)
- **Frontend**: EJS templates + Tailwind CSS + Font Awesome
- **Excel Generation**: ExcelJS library
- **Session Management**: Express-session
- **Environment Configuration**: dotenv

## 📋 Requirements

- **Node.js** (version 14 or higher)
- **npm** (Node Package Manager)

## ⚡ Quick Start

### **🚀 Windows Users (Easiest)**

**No technical knowledge required!**

**Double-click `setup-and-run.bat`** - Complete setup and launch

- Automatically checks for Node.js
- Downloads and installs Node.js if needed
- Installs dependencies automatically
- Starts the server
- Use the same file for all subsequent runs

### **🛠️ Manual Setup (All Platforms)**

### 1. **Installation**

```bash
# Clone or download the project
cd faculty-reporter

# Install dependencies
npm install
```

### 2. **Environment Configuration**

Create a `.env` file in the root directory:

```env
# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Session configuration
SECRET=your_session_secret_key

# Server configuration
PORT=5000
```

### 3. **Start the Server**

```bash
# Start the application (database will be created automatically)
npm start
```

### 4. **Access the Application**

- **Main Application**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/admin/login

## 📁 Project Structure

```
faculty-reporter/
├── setup-and-run.bat          # 🚀 Windows auto-setup & launcher
├── config/
│   └── teams.json              # Team and activity configuration
├── views/
│   ├── index.ejs              # Main report submission form
│   ├── admin.ejs              # Admin dashboard
│   └── edit-report.ejs        # Report editing interface
├── public/                    # Static assets (if any)
├── index.js                   # Main server file
├── package.json               # Project dependencies
├── reports.db                 # SQLite database (auto-created)
├── reports.xlsx               # Excel export file (auto-generated)
└── README.md                  # This file
```

## 🔧 Configuration

### **Team Configuration** (`config/teams.json`)

The application uses a dynamic configuration system. To add/remove teams or activities:

```json
{
  "teams": {
    "Your Team Name": {
      "displayName": "Display Name",
      "icon": "fas fa-icon-name",
      "activities": ["Activity 1", "Activity 2", "Activity 3"]
    }
  }
}
```

### **Database Schema**

```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,                    -- Faculty ID (string)
  name TEXT NOT NULL,                   -- Faculty Name
  team TEXT NOT NULL,                   -- Team Name
  activities TEXT NOT NULL,             -- JSON array of activities
  report_date TEXT NOT NULL,            -- YYYY-MM-DD format
  submitted_at TEXT NOT NULL,           -- ISO timestamp
  UNIQUE(uid, report_date)              -- One report per day per faculty
);
```

## 📊 API Endpoints

### **Public Endpoints**

- `GET /` - Main report submission form
- `POST /submit` - Submit daily report
- `GET /export` - Download Excel report (protected)

### **Admin Endpoints**

- `GET /admin/login` - Admin login page
- `POST /admin/login` - Admin authentication
- `GET /admin` - Admin dashboard with reports
- `GET /admin/edit/:id` - Edit specific report
- `POST /admin/edit/:id` - Update report
- `POST /admin/delete/:id` - Delete report
- `GET /admin/logout` - Admin logout

### **Report Submission Format**

```json
{
  "uid": "EMP001",
  "name": "John Doe",
  "team": "Secrecy Cell",
  "report_date": "2025-08-21",
  "activities": ["Activity 1", "Activity 2"],
  "counts": {
    "Activity 1": "10",
    "Activity 2": "5"
  }
}
```

## 🎨 UI Features

### **Modern Design**

- Clean, professional interface
- Responsive design for all devices
- Tailwind CSS for styling
- Font Awesome icons
- Smooth animations and transitions

### **User Experience**

- Dynamic team selection with visual feedback
- Real-time form validation
- Activity count/hours input with flexible layout
- Success/error messaging
- Mobile-optimized navigation

### **Admin Interface**

- Comprehensive report management
- Search and filter capabilities
- Inline editing functionality
- Bulk operations support
- Export capabilities

## 🔒 Security Features

- **Session-based Authentication**: Secure admin login system
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **UNIQUE Constraints**: Prevents duplicate submissions
- **Environment Variables**: Secure credential management

## 📈 Excel Export Features

The application automatically generates comprehensive Excel reports with:

- **Multiple Worksheets**: Summary and detailed data
- **Professional Formatting**: Headers, borders, colors
- **Activity Breakdown**: Individual rows for each activity
- **Date-wise Organization**: Sorted by submission date
- **Team Classification**: Grouped by team assignments

## 🔄 Recent Updates

### **v1.0.0 - Latest Features**

- ✅ **Dynamic Team Configuration**: JSON-based team management
- ✅ **String-based UIDs**: Flexible Faculty ID support (alphanumeric)
- ✅ **Improved UI Alignment**: Enhanced form layouts and responsive design
- ✅ **Advanced Admin Panel**: Full CRUD operations with search/filter
- ✅ **Team Tab Synchronization**: Fixed dropdown-tab mapping issues
- ✅ **Database Migration**: Seamless UID conversion from integer to text

## 🚀 Deployment

### **Local Development**

```bash
npm start
# Server runs on http://localhost:5000
```

### **Production Deployment**

1. Set appropriate environment variables
2. Configure reverse proxy (nginx/Apache)
3. Set up process manager (PM2)
4. Enable HTTPS
5. Configure database backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For technical support or feature requests, please contact the development team.

---

**Faculty Daily Reporter** - Streamlining daily activity reporting with modern web technologies.
