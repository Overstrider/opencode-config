[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
$sourceConfig = Join-Path $repositoryRoot "config"
$userProfilePath = [Environment]::GetFolderPath("UserProfile")
$graphifyVersion = (Get-Content -Raw -LiteralPath (
    Join-Path $repositoryRoot ".graphify-version"
)).Trim()
$claudeMemVersion = (Get-Content -Raw -LiteralPath (
    Join-Path $repositoryRoot ".claude-mem-version"
)).Trim()
$codebaseMemoryVersion = (Get-Content -Raw -LiteralPath (
    Join-Path $repositoryRoot ".codebase-memory-mcp-version"
)).Trim()
$bunVersion = "1.3.13"
$uvVersion = "0.11.6"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm não foi encontrado; integrações globais não podem ser instaladas."
}

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    npm install --global "bun@$bunVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar Bun $bunVersion."
    }
}

$uvCommand = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uvCommand) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw "Python não foi encontrado; Graphify requer Python 3.10+."
    }

    & $pythonCommand.Source -m pip install --user "uv==$uvVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar uv $uvVersion."
    }

    $uvCandidates = @(
        (Join-Path $userProfilePath ".local\bin\uv.exe"),
        (Join-Path $env:APPDATA "Python\Python313\Scripts\uv.exe"),
        (Join-Path $env:APPDATA "Python\Python312\Scripts\uv.exe"),
        (Join-Path $env:APPDATA "Python\Python311\Scripts\uv.exe")
    )
    $uvPath = $uvCandidates |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
    if (-not $uvPath) {
        throw "uv foi instalado, mas o executável não foi localizado."
    }
}
else {
    $uvPath = $uvCommand.Source
}

$uvBin = Split-Path -Parent $uvPath
$userPath = [Environment]::GetEnvironmentVariable(
    "Path",
    [EnvironmentVariableTarget]::User
)
$userPathParts = @(
    $userPath -split ";" |
        Where-Object { $_ -and $_ -ne $uvBin }
)
[Environment]::SetEnvironmentVariable(
    "Path",
    (($uvBin + ";" + ($userPathParts -join ";")).TrimEnd(";")),
    [EnvironmentVariableTarget]::User
)
$env:Path = $uvBin + ";" + (($env:Path -split ";" |
    Where-Object { $_ -and $_ -ne $uvBin }) -join ";")

& $uvPath tool install --upgrade "graphifyy==$graphifyVersion"
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar Graphify $graphifyVersion."
}

npm install --global "codebase-memory-mcp@$codebaseMemoryVersion"
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar codebase-memory-mcp $codebaseMemoryVersion."
}
codebase-memory-mcp config set auto_index true
codebase-memory-mcp config set auto_watch true
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao configurar indexação automática do codebase-memory-mcp."
}

$claudeMemPluginRoot = Join-Path (
    Join-Path $sourceConfig "node_modules\claude-mem"
) "plugin"
Push-Location $claudeMemPluginRoot
try {
    bun install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao restaurar runtime do claude-mem $claudeMemVersion."
    }
}
finally {
    Pop-Location
}

$claudeMemDataDir = Join-Path $userProfilePath ".claude-mem"
$claudeMemSettingsPath = Join-Path $claudeMemDataDir "settings.json"
$claudeMemEnvPath = Join-Path $claudeMemDataDir ".env"
New-Item -ItemType Directory -Force -Path $claudeMemDataDir | Out-Null

if (Test-Path -LiteralPath $claudeMemSettingsPath) {
    $claudeMemSettings = Get-Content -Raw -LiteralPath $claudeMemSettingsPath |
        ConvertFrom-Json
}
else {
    $claudeMemSettings = [pscustomobject]@{}
}

$claudeMemProfile = "openrouter-gpt-oss-20b"
$claudeMemModel = "openai/gpt-oss-20b"

$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_PROVIDER" "openrouter"
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_OPENROUTER_MODEL" $claudeMemModel
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_MODEL_PROFILE" $claudeMemProfile
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_MODEL" $claudeMemModel
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_MAX_CONCURRENT_AGENTS" "1"
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_TIER_ROUTING_ENABLED" "false"
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_TIER_SIMPLE_MODEL" $claudeMemModel
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_TIER_SUMMARY_MODEL" $claudeMemModel
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_TIER_FAST_MODEL" $claudeMemModel
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_TIER_SMART_MODEL" $claudeMemModel
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_WORKER_HOST" "127.0.0.1"
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_WORKER_PORT" "37778"
$claudeMemSettings | Add-Member -Force NoteProperty `
    "CLAUDE_MEM_DATA_DIR" $claudeMemDataDir

$settingsJson = $claudeMemSettings |
    ConvertTo-Json -Depth 50
[IO.File]::WriteAllText(
    $claudeMemSettingsPath,
    $settingsJson + [Environment]::NewLine,
    [Text.UTF8Encoding]::new($false)
)

$openRouterApiKey = $env:OPENROUTER_API_KEY
if ([string]::IsNullOrWhiteSpace($openRouterApiKey)) {
    $openRouterApiKey = [Environment]::GetEnvironmentVariable(
        "OPENROUTER_API_KEY",
        [EnvironmentVariableTarget]::User
    )
}
if ([string]::IsNullOrWhiteSpace($openRouterApiKey)) {
    throw "OPENROUTER_API_KEY não foi encontrada; claude-mem não pode usar OpenRouter."
}
$env:OPENROUTER_API_KEY = $openRouterApiKey
node (
    Join-Path $repositoryRoot "scripts\configure-claude-mem-env.mjs"
) $claudeMemDataDir
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao configurar credencial OpenRouter do claude-mem."
}

$workerScript = Join-Path $claudeMemPluginRoot "scripts\worker-service.cjs"
bun $workerScript restart | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao reiniciar worker do claude-mem $claudeMemVersion."
}

Write-Host "Graphify $graphifyVersion instalado."
Write-Host "claude-mem $claudeMemVersion configurado e iniciado."
Write-Host "codebase-memory-mcp $codebaseMemoryVersion sempre ativo."
