@echo off
echo ================================
echo   Faculty Daily Reporter
echo   Simple Launcher
echo ================================
echo.

:: Show current directory
echo Running from: %CD%
echo.

:: Check basic files
echo Checking files...
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Make sure you're in the project folder.
    echo.
    goto :error_exit
)
echo Found package.json ✓
echo.

:: Check Node.js
echo Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    echo.
    goto :error_exit
)
echo Node.js found ✓
echo.

:: Check npm
echo Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found!
    echo Please reinstall Node.js from https://nodejs.org/
    echo.
    goto :error_exit
)
echo npm found ✓
echo.

:: Install dependencies if needed
echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        echo.
        goto :error_exit
    )
)
echo Dependencies ready ✓
echo.

:: Start the server
echo ================================
echo Starting Faculty Daily Reporter...
echo ================================
echo.
echo Server will be available at:
echo http://localhost:5000
echo.
echo Admin panel:
echo http://localhost:5000/admin/login
echo Username: admin
echo Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo ================================
echo.

:: Start the server in background and open browser
echo Starting server and opening browser...
start /b npm start

:: Wait a moment for server to start
timeout /t 3 /nobreak >nul

:: Open the default browser
start http://localhost:5000

:: Keep the terminal open to show server logs
echo.
echo Browser opened! Server is running...
echo Press Ctrl+C to stop the server
echo.

:: Wait for user to stop the server
pause

goto :normal_exit

:error_exit
echo.
echo ================================
echo An error occurred!
echo Press any key to close...
echo ================================
pause >nul
exit /b 1

:normal_exit
echo.
echo ================================
echo Server stopped.
echo Press any key to close...
echo ================================
pause >nul
exit /b 0
