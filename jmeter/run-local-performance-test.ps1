# PSR Performance Test - Local Execution Script
# This script runs JMeter performance tests locally with environment variable support

param(
    [string]$ClientSecret,
    [string]$ClientId,
    [string]$Environment = "PSR",
    [string]$TestName = "PSRWorkflowTest",
    [string]$RealmKey = "popspsr-psr",
    [string]$GraviteeDomainSuffix = "psr.na.blueyonder.dev",
    [int]$ThreadCount = 10,
    [int]$Iterations = 25,
    [string]$JMeterPath = "",
    [switch]$Help
)

# Display help
if ($Help) {
    Write-Host @"
PSR Performance Test - Local Execution

USAGE:
    .\run-local-performance-test.ps1 [OPTIONS]

OPTIONS:
    -ClientSecret    OAuth client secret (required)
    -ClientId        OAuth client id (required for Gravitee plans only)
    -Environment     Test environment (default: PSR)
    -TestName        JMeter test file name (default: PSRWorkflowTest)
                     The gateway follows the plan: *Gravitee* plans use Gravitee, all others use Azure
    -RealmKey        Gravitee realm key (default: popspsr-psr)
    -GraviteeDomainSuffix  Gravitee domain suffix (default: psr.na.blueyonder.dev)
    -ThreadCount     Number of concurrent threads (default: 10)
    -Iterations      Number of test iterations (default: 25)
    -JMeterPath      Custom JMeter installation path (optional)
    -Help            Show this help message

EXAMPLES:
    # Basic execution with client secret
    .\run-local-performance-test.ps1 -ClientSecret "your-secret-here"
    
    # Run different test with custom configuration
    .\run-local-performance-test.ps1 -ClientSecret "your-secret" -TestName "PSRLinksTest" -ThreadCount 20 -Iterations 50
    
    # Run INTEROP test
    .\run-local-performance-test.ps1 -ClientSecret "your-secret" -TestName "PerfTestInterop" -Environment "INTEROP"

    # Run the PSR test against the Gravitee gateway
    .\run-local-performance-test.ps1 -TestName "PSRGraviteeTest"
    
    # Using .env file (recommended for security)
    # Create a .env file with CLIENT_SECRET=your-secret-here
    # For Gravitee set PSR_GRAVITEE_CLIENT_ID and PSR_GRAVITEE_CLIENT_SECRET instead
    .\run-local-performance-test.ps1

ENVIRONMENT VARIABLES:
    The script will also read from environment variables:
    - CLIENT_SECRET      (alternative to -ClientSecret parameter)
    - PSR_GRAVITEE_CLIENT_ID     (Gravitee client id)
    - PSR_GRAVITEE_CLIENT_SECRET (Gravitee client secret)
    - TEST_NAME          (alternative to -TestName parameter)
    - THREAD_COUNT       (alternative to -ThreadCount parameter)  
    - ITERATIONS         (alternative to -Iterations parameter)
    - ENVIRONMENT        (alternative to -Environment parameter)
    - REALM_KEY          (alternative to -RealmKey parameter)
    - GRAVITEE_DOMAIN_SUFFIX (alternative to -GraviteeDomainSuffix parameter)

AVAILABLE TEST FILES:
    - PSRWorkflowTest    (default - Full workflow test)
    - PSRLinksTest       (Links-specific test)
    - PSRTest            (Core PSR functionality - Azure gateway)
    - PSRGraviteeTest    (Core PSR functionality - Gravitee gateway)
    - PerfTestInterop    (INTEROP environment test)
"@
    exit 0
}

Write-Host "🚀 PSR Performance Test - Local Execution" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Load .env file if it exists
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "📄 Loading configuration from .env file..." -ForegroundColor Yellow
    Get-Content $envFile | Where-Object { $_ -match "^\s*[^#].*=" } | ForEach-Object {
        $parts = $_ -split "=", 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Override parameters with environment variables if they exist
$envTestName = [Environment]::GetEnvironmentVariable("TEST_NAME")
if ($envTestName) { $TestName = $envTestName }

$envThreadCount = [Environment]::GetEnvironmentVariable("THREAD_COUNT")
if ($envThreadCount) { $ThreadCount = [int]$envThreadCount }

$envIterations = [Environment]::GetEnvironmentVariable("ITERATIONS")
if ($envIterations) { $Iterations = [int]$envIterations }

$envEnvironment = [Environment]::GetEnvironmentVariable("ENVIRONMENT")
if ($envEnvironment) { $Environment = $envEnvironment }

$envRealmKey = [Environment]::GetEnvironmentVariable("REALM_KEY")
if ($envRealmKey) { $RealmKey = $envRealmKey }

$envDomainSuffix = [Environment]::GetEnvironmentVariable("GRAVITEE_DOMAIN_SUFFIX")
if ($envDomainSuffix) { $GraviteeDomainSuffix = $envDomainSuffix }

# Gateway follows the selected plan; only *Gravitee* plans target the Gravitee gateway.
$GatewayType = if ($TestName -like "*Gravitee*") { "GRAVITEE" } else { "AZURE" }

# Get credentials from parameter, environment variable, or prompt
if ($GatewayType -eq "GRAVITEE") {
    if (-not $ClientId) { $ClientId = [Environment]::GetEnvironmentVariable("PSR_GRAVITEE_CLIENT_ID") }
    if (-not $ClientSecret) { $ClientSecret = [Environment]::GetEnvironmentVariable("PSR_GRAVITEE_CLIENT_SECRET") }

    if (-not $ClientId) {
        Write-Error "❌ Gravitee client id is required. Use -ClientId, set PSR_GRAVITEE_CLIENT_ID, or add it to .env"
        exit 1
    }
    if (-not $ClientSecret) {
        Write-Error "❌ Gravitee client secret is required. Use -ClientSecret, set PSR_GRAVITEE_CLIENT_SECRET, or add it to .env"
        exit 1
    }
} else {
    if (-not $ClientSecret) {
        $ClientSecret = [Environment]::GetEnvironmentVariable("CLIENT_SECRET")
        if (-not $ClientSecret) {
            $ClientSecret = Read-Host "Enter Azure B2C Client Secret" -AsSecureString
            $ClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ClientSecret))
        }
    }

    if (-not $ClientSecret) {
        Write-Error "❌ Client secret is required. Use -ClientSecret parameter, set CLIENT_SECRET environment variable, or create .env file"
        exit 1
    }
}

# Set environment variables for JMeter to read
[Environment]::SetEnvironmentVariable("CLIENT_SECRET", $ClientSecret, "Process")
[Environment]::SetEnvironmentVariable("TEST_NAME", $TestName, "Process")
[Environment]::SetEnvironmentVariable("THREAD_COUNT", $ThreadCount.ToString(), "Process")
[Environment]::SetEnvironmentVariable("ITERATIONS", $Iterations.ToString(), "Process")
[Environment]::SetEnvironmentVariable("ENVIRONMENT", $Environment, "Process")

Write-Host "⚙️ Test Configuration:" -ForegroundColor Cyan
Write-Host "  Test Name: $TestName" -ForegroundColor White
Write-Host "  Environment: $Environment" -ForegroundColor White
Write-Host "  Gateway Type: $GatewayType" -ForegroundColor White
if ($GatewayType -eq "GRAVITEE") {
    Write-Host "  Realm Key: $RealmKey" -ForegroundColor White
    Write-Host "  API Host: $RealmKey.api.$GraviteeDomainSuffix" -ForegroundColor White
    Write-Host "  Auth Host: $RealmKey.auth.$GraviteeDomainSuffix" -ForegroundColor White
}
Write-Host "  Thread Count: $ThreadCount" -ForegroundColor White
Write-Host "  Iterations: $Iterations" -ForegroundColor White
Write-Host "  Client Secret: $('*' * $ClientSecret.Length)" -ForegroundColor White

# Find JMeter installation
$jmeterExecutable = $null

if ($JMeterPath) {
    $jmeterExecutable = Join-Path $JMeterPath "bin\jmeter.bat"
    if (-not (Test-Path $jmeterExecutable)) {
        Write-Error "❌ JMeter not found at specified path: $JMeterPath"
        exit 1
    }
} else {
    # Common JMeter installation locations
    $commonPaths = @(
        "C:\apache-jmeter-*\bin\jmeter.bat",
        "C:\Program Files\apache-jmeter-*\bin\jmeter.bat",
        "C:\Tools\apache-jmeter-*\bin\jmeter.bat",
        "$env:USERPROFILE\Downloads\apache-jmeter-*\bin\jmeter.bat"
    )
    
    foreach ($path in $commonPaths) {
        $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $jmeterExecutable = $found.FullName
            break
        }
    }
    
    # Try PATH
    if (-not $jmeterExecutable) {
        try {
            $jmeterInPath = Get-Command jmeter -ErrorAction Stop
            $jmeterExecutable = $jmeterInPath.Source
        } catch {
            # JMeter not in PATH
        }
    }
}

if (-not $jmeterExecutable) {
    Write-Error @"
❌ JMeter installation not found!

Please either:
1. Install JMeter and ensure it's in your PATH
2. Use -JMeterPath parameter to specify installation location
3. Follow the setup guide: LOCAL_JMETER_SETUP_GUIDE.md

For automatic installation, you can also download JMeter 5.6.3:
https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.3.zip
"@
    exit 1
}

Write-Host "✅ Found JMeter: $jmeterExecutable" -ForegroundColor Green

# Navigate to jmeter directory
$jmeterDir = Join-Path $PSScriptRoot "jmeter"
if (-not (Test-Path $jmeterDir)) {
    Write-Error "❌ JMeter test directory not found: $jmeterDir"
    exit 1
}

Set-Location $jmeterDir

# Create results directory
$resultsDir = "results"
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir | Out-Null
}

$reportsDir = "reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

# Run JMeter test
Write-Host "🧪 Starting performance test: $TestName..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultFile = "results\$TestName-$timestamp-results.jtl"
$reportDir = "reports\$TestName-$timestamp-report"

try {
    # JMeter does not expand variables nested inside other variables, so build the hosts here.
    $apiHost = "$RealmKey.api.$GraviteeDomainSuffix"
    $authHost = "$RealmKey.auth.$GraviteeDomainSuffix"

    $jmeterArgs = @(
        "-n",
        "-t", "Tests\$TestName.jmx",
        "-l", $resultFile,
        "-e", "-o", $reportDir,
        "-JCLIENT_ID=$ClientId",
        "-JCLIENT_SECRET=$ClientSecret",
        "-JAPI_HOST=$apiHost",
        "-JAUTH_HOST=$authHost",
        "-Jenvironment=$Environment",
        "-JTHREAD_COUNT=$ThreadCount",
        "-JITERATIONS=$Iterations"
    )
    
    $displayArgs = $jmeterArgs -replace '^(-JCLIENT_SECRET=).*$', '$1********'
    Write-Host "🔄 Running command: $jmeterExecutable $($displayArgs -join ' ')" -ForegroundColor Gray
    
    & $jmeterExecutable $jmeterArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Test completed successfully!" -ForegroundColor Green
        Write-Host "📊 Results saved to: $resultFile" -ForegroundColor Cyan
        Write-Host "📈 HTML report: $reportDir\index.html" -ForegroundColor Cyan
        
        # Try to open the report
        $reportIndex = Join-Path (Get-Location) "$reportDir\index.html"
        if (Test-Path $reportIndex) {
            Write-Host "🌐 Opening HTML report..." -ForegroundColor Yellow
            Start-Process $reportIndex
        }
    } else {
        Write-Error "❌ Test execution failed with exit code: $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "❌ Error executing JMeter: $_"
    exit 1
}

Write-Host "🎉 Performance test completed!" -ForegroundColor Green