[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
$sourceConfig = Join-Path $repositoryRoot "config"
$versionFile = Join-Path $repositoryRoot ".opencode-version"

git -C $repositoryRoot pull --ff-only
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao atualizar o repositório."
}

$openCodeVersion = (Get-Content -Raw -LiteralPath $versionFile).Trim()
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

opencode debug config | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "A configuração atualizada não passou na validação."
}

Write-Host "OpenCode $openCodeVersion e configuração atualizados."
