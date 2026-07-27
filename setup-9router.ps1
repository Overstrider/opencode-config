[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
$routerVersion = (Get-Content -Raw -LiteralPath (
    Join-Path $repositoryRoot ".9router-version"
)).Trim()

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or
    -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js 20+ and npm are required to install 9Router."
}

$nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 20) {
    throw "9Router requires Node.js 20 or newer."
}

npm install --global "9router@$routerVersion"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to install 9Router $routerVersion."
}

function Test-9RouterHealth {
    try {
        $response = Invoke-WebRequest `
            -Uri "http://127.0.0.1:20128/v1/models" `
            -TimeoutSec 2 `
            -UseBasicParsing
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

if (-not (Test-9RouterHealth)) {
    $routerCommand = Get-Command 9router.cmd -ErrorAction SilentlyContinue
    if (-not $routerCommand) {
        $routerCommand = Get-Command 9router -ErrorAction Stop
    }

    Start-Process `
        -FilePath $routerCommand.Source `
        -ArgumentList @(
            "--port", "20128",
            "--host", "127.0.0.1",
            "--no-browser",
            "--skip-update",
            "--log"
        ) `
        -WindowStyle Hidden

    $ready = $false
    foreach ($attempt in 1..30) {
        if (Test-9RouterHealth) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        throw "9Router did not become ready on 127.0.0.1:20128."
    }
}

Write-Host "9Router $routerVersion is ready at http://127.0.0.1:20128."
Write-Host "Open http://127.0.0.1:20128/dashboard to configure providers."
