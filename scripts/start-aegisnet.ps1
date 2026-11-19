$ErrorActionPreference = "Stop"

# Detect project root (parent of scripts folder)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# Setup logging
$logDir = Join-Path $projectRoot "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
$logPath = Join-Path $logDir "aegisnet-launch.log"

function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMsg = "[$timestamp] $message"
    Write-Host $logMsg
    Add-Content -Path $logPath -Value $logMsg
}

Write-Log "========================================"
Write-Log "Starting AegisNet Frontend and Backend PowerShell Launcher"
Write-Log "Current project folder: $projectRoot"

# Check Node.js
try {
    $nodeVersion = (node --version 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Node missing" }
    Write-Log "Node.js version: $($nodeVersion.Trim())"
} catch {
    Write-Log "ERROR: Node.js is missing."
    Write-Host "Node.js is required to run the AegisNet prototype. Please install the LTS version from nodejs.org, then run this launcher again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = (npm --version 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "npm missing" }
    Write-Log "npm version: $($npmVersion.Trim())"
} catch {
    Write-Log "ERROR: npm is missing."
    Write-Host "Node.js is required to run the AegisNet prototype. Please install the LTS version from nodejs.org, then run this launcher again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check dependencies
$needsInstall = $false
if (-not (Test-Path "node_modules")) {
    Write-Log "node_modules not found."
    $needsInstall = $true
} elseif (Test-Path "package-lock.json") {
    $nodeModulesTime = (Get-Item "node_modules").LastWriteTime
    $packageLockTime = (Get-Item "package-lock.json").LastWriteTime
    if ($packageLockTime -gt $nodeModulesTime) {
        Write-Log "package-lock.json is newer than node_modules."
        $needsInstall = $true
    }
}

if ($needsInstall) {
    Write-Log "Running npm ci..."
    try {
        $installProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm ci" -Wait -NoNewWindow -PassThru
        if ($installProc.ExitCode -ne 0) {
            throw "npm ci returned $($installProc.ExitCode)"
        }
        Write-Log "npm ci completed successfully."
        (Get-Item "node_modules").LastWriteTime = Get-Date
    } catch {
        Write-Log "ERROR: npm ci failed. Details: $_"
        Write-Host "Failed to install dependencies." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Log "Frontend dependencies are up to date. Skipping npm ci."
}

# Check backend dependencies
$backendDir = Join-Path $projectRoot "services\api"
$backendNeedsInstall = $false

if (-not (Test-Path $backendDir)) {
    Write-Log "WARNING: Backend directory not found at $backendDir"
} else {
    Set-Location $backendDir
    if (-not (Test-Path "node_modules")) {
        Write-Log "Backend node_modules not found."
        $backendNeedsInstall = $true
    } elseif (Test-Path "package-lock.json") {
        $nodeModulesTime = (Get-Item "node_modules").LastWriteTime
        $packageLockTime = (Get-Item "package-lock.json").LastWriteTime
        if ($packageLockTime -gt $nodeModulesTime) {
            Write-Log "Backend package-lock.json is newer than node_modules."
            $backendNeedsInstall = $true
        }
    }

    if ($backendNeedsInstall) {
        Write-Log "Running backend npm ci..."
        try {
            $installProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm ci" -Wait -NoNewWindow -PassThru
            if ($installProc.ExitCode -ne 0) {
                throw "backend npm ci returned $($installProc.ExitCode)"
            }
            Write-Log "Backend npm ci completed successfully."
            (Get-Item "node_modules").LastWriteTime = Get-Date
        } catch {
            Write-Log "ERROR: Backend npm ci failed. Details: $_"
            Write-Host "Failed to install backend dependencies." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    } else {
        Write-Log "Backend dependencies are up to date."
    }

    $backendPort = 8000
    $backendConnection = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
    if ($backendConnection) {
        Write-Log "Port $backendPort is already in use. Reusing the existing local API process."
    } else {
        Write-Log "Starting backend dev server on port $backendPort..."
        Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm run dev" -WorkingDirectory $backendDir -WindowStyle Normal
    }
    Set-Location $projectRoot

    $backendReady = $false
    for ($attempt = 1; $attempt -le 20; $attempt++) {
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -UseBasicParsing -TimeoutSec 1
            if ($health.StatusCode -eq 200) {
                $backendReady = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if ($backendReady) {
        Write-Log "Backend health check is ready at http://localhost:$backendPort/health"
    } else {
        Write-Log "WARNING: Backend health check did not become ready. Review the visible backend window for errors."
    }
}

# Check Port
$port = 5173
$portInUse = $false
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connection) {
    $portInUse = $true
    Write-Log "Port $port is already in use."
    Write-Host "Port $port is in use. Vite will choose another port. Please check the terminal output for the correct URL." -ForegroundColor Yellow
}

Write-Log "Starting dev server..."

if (-not $portInUse) {
    Write-Log "Attempting to open browser automatically..."
    Start-Process cmd.exe -ArgumentList "/c timeout /t 3 >nul && start http://localhost:$port" -WindowStyle Hidden
}

Write-Log "Running npm run dev..."
try {
    & cmd.exe /c npm run dev
} catch {
    Write-Log "ERROR: dev server crashed or was terminated. $_"
}

Write-Log "AegisNet dev server stopped."
Read-Host "Press Enter to close"
