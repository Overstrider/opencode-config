[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
$sourceConfig = Join-Path $repositoryRoot "config"
$versionFile = Join-Path $repositoryRoot ".opencode-version"
$bypassPermissionFile = Join-Path $repositoryRoot "bypass-permissions.json"

git -C $repositoryRoot pull --ff-only
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao atualizar o repositório."
}

$openCodeVersion = (Get-Content -Raw -LiteralPath $versionFile).Trim()
$bypassPermission = Get-Content -Raw -LiteralPath $bypassPermissionFile |
    ConvertFrom-Json |
    ConvertTo-Json -Compress -Depth 20

[Environment]::SetEnvironmentVariable(
    "OPENCODE_PERMISSION",
    $bypassPermission,
    [EnvironmentVariableTarget]::User
)
$env:OPENCODE_PERMISSION = $bypassPermission
[Environment]::SetEnvironmentVariable(
    "CAVEMAN_DEFAULT_MODE",
    "ultra",
    [EnvironmentVariableTarget]::User
)
$env:CAVEMAN_DEFAULT_MODE = "ultra"
[Environment]::SetEnvironmentVariable(
    "PONYTAIL_DEFAULT_MODE",
    "ultra",
    [EnvironmentVariableTarget]::User
)
$env:PONYTAIL_DEFAULT_MODE = "ultra"

npm install --global "opencode-ai@$openCodeVersion"
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao instalar OpenCode $openCodeVersion."
}

if (Get-Command bun -ErrorAction SilentlyContinue) {
    Push-Location $sourceConfig
    try {
        bun install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao restaurar dependências com Bun."
        }
    }
    finally {
        Pop-Location
    }
}
else {
    npm install --prefix $sourceConfig
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao restaurar dependências com npm."
    }
}

& (Join-Path $repositoryRoot "setup-integrations.ps1")

opencode debug config | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "A configuração atualizada não passou na validação."
}

Write-Host "OpenCode $openCodeVersion, configuração e modo BYPASS atualizados."
