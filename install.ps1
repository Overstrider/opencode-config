[CmdletBinding()]
param(
    [switch]$SkipOpenCodeInstall
)

$ErrorActionPreference = "Stop"

$repositoryRoot = $PSScriptRoot
$sourceConfig = Join-Path $repositoryRoot "config"
$userProfilePath = [Environment]::GetFolderPath("UserProfile")
$configParent = Join-Path $userProfilePath ".config"
$targetConfig = Join-Path $configParent "opencode"
$versionFile = Join-Path $repositoryRoot ".opencode-version"
$openCodeVersion = (Get-Content -Raw -LiteralPath $versionFile).Trim()

if (-not $SkipOpenCodeInstall) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm não foi encontrado. Instale Node.js ou use mise antes de continuar."
    }

    npm install --global "opencode-ai@$openCodeVersion"
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar OpenCode $openCodeVersion."
    }
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

New-Item -ItemType Directory -Force -Path $configParent | Out-Null

$alreadyLinked = $false
if (Test-Path -LiteralPath $targetConfig) {
    $targetItem = Get-Item -Force -LiteralPath $targetConfig
    if ($targetItem.LinkType) {
        $linkTarget = [string]$targetItem.Target[0]
        if ([IO.Path]::IsPathRooted($linkTarget)) {
            $resolvedTarget = [IO.Path]::GetFullPath($linkTarget)
        }
        else {
            $resolvedTarget = [IO.Path]::GetFullPath(
                (Join-Path $targetItem.Parent.FullName $linkTarget)
            )
        }
        $alreadyLinked = $resolvedTarget -eq [IO.Path]::GetFullPath($sourceConfig)
    }

    if (-not $alreadyLinked) {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupPath = "$targetConfig.backup-$timestamp"
        Move-Item -LiteralPath $targetConfig -Destination $backupPath
        Write-Host "Configuração anterior preservada em $backupPath"
    }
}

if (-not $alreadyLinked) {
    try {
        New-Item -ItemType SymbolicLink -Path $targetConfig -Target $sourceConfig |
            Out-Null
        Write-Host "Link simbólico criado: $targetConfig -> $sourceConfig"
    }
    catch {
        New-Item -ItemType Junction -Path $targetConfig -Target $sourceConfig |
            Out-Null
        Write-Host "Junction criada: $targetConfig -> $sourceConfig"
    }
}

opencode debug config | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "OpenCode foi instalado, mas a configuração não passou na validação."
}

Write-Host "OpenCode $openCodeVersion configurado com sucesso."
Write-Host "Credenciais continuam fora do Git. Execute: opencode auth login"
