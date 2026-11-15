@echo off
REM PSR Performance Test - Local Execution (Batch Script)
REM This script should be run from the jmeter directory

setlocal

REM Check if CLIENT_SECRET is set
if "%CLIENT_SECRET%"=="" (
    echo ERROR: CLIENT_SECRET environment variable is not set!
    echo.
    echo Please set it using one of these methods:
    echo 1. set CLIENT_SECRET=your-secret-value
    echo 2. Create a .env file in the jmeter directory and run with PowerShell script
    echo.
    pause
    exit /b 1
)

REM Default parameters (can be overridden)
if "%TEST_THREADS%"=="" set TEST_THREADS=5
if "%TEST_DURATION%"=="" set TEST_DURATION=60
if "%TEST_ENVIRONMENT%"=="" set TEST_ENVIRONMENT=QA

echo PSR Performance Test - Local Execution
echo =====================================
echo Environment: %TEST_ENVIRONMENT%
echo Threads: %TEST_THREADS%
echo Duration: %TEST_DURATION% seconds
echo.

REM Check if JMeter is available
jmeter -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: JMeter not found in PATH!
    echo Please install JMeter and add it to your PATH environment variable.
    echo Download from: https://jmeter.apache.org/download_jmeter.cgi
    pause
    exit /b 1
)

REM Verify we're in the correct directory
if not exist "Tests\PSRWorkflowTest.jmx" (
    echo ERROR: PSRWorkflowTest.jmx not found in Tests directory
    echo Please run this script from the jmeter directory
    pause
    exit /b 1
)

REM Create results directory
if not exist results mkdir results

REM Generate timestamp for unique files
for /f "tokens=1-4 delims=/ " %%i in ("%date%") do (
    for /f "tokens=1-3 delims=:." %%m in ("%time%") do (
        set timestamp=%%l%%j%%k-%%m%%n%%o
    )
)
set timestamp=%timestamp: =0%

set RESULT_FILE=results\PSRWorkflowTest-local-%timestamp%.jtl
set REPORT_DIR=results\PSRWorkflowTest-local-report-%timestamp%

echo Starting JMeter test...
echo Results will be saved to: %RESULT_FILE%
echo.

REM Run JMeter test
jmeter -n -t "Tests\PSRWorkflowTest.jmx" ^
    -l "%RESULT_FILE%" ^
    -e -o "%REPORT_DIR%" ^
    -JCLIENT_SECRET="%CLIENT_SECRET%" ^
    -Jthreads="%TEST_THREADS%" ^
    -Jduration="%TEST_DURATION%" ^
    -Jenvironment="%TEST_ENVIRONMENT%"

if %errorlevel% equ 0 (
    echo.
    echo Test completed successfully!
    echo Results: %RESULT_FILE%
    echo Report: %REPORT_DIR%
    echo.
    echo Opening HTML report...
    start "" "%REPORT_DIR%\index.html"
) else (
    echo.
    echo Test failed with exit code: %errorlevel%
)

pause