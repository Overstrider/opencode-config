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
$bypassPermissionFile = Join-Path $repositoryRoot "bypass-permissions.json"
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

& (Join-Path $repositoryRoot "setup-9router.ps1")
& (Join-Path $repositoryRoot "setup-integrations.ps1")

$openCodeCommand = (Get-Command opencode.cmd -ErrorAction Stop).Source
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "OpenCode Administrador.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $env:ComSpec
$shortcut.Arguments = "/k `"`"$openCodeCommand`" --auto`""
$shortcut.WorkingDirectory = $userProfilePath
$shortcut.Description = "OpenCode em modo BYPASS com privilégios de administrador"
$shortcut.Save()
[Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null

$shortcutBytes = [IO.File]::ReadAllBytes($shortcutPath)
$shortcutBytes[0x15] = $shortcutBytes[0x15] -bor 0x20
[IO.File]::WriteAllBytes($shortcutPath, $shortcutBytes)

opencode debug config | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "OpenCode foi instalado, mas a configuração não passou na validação."
}

Write-Host "OpenCode $openCodeVersion configurado com sucesso."
Write-Host "Modo BYPASS persistente ativado com OPENCODE_PERMISSION e --auto."
Write-Host "Caveman Ultra global e permanente ativado."
Write-Host "Ponytail Ultra global e permanente ativado."
Write-Host "Credenciais continuam fora do Git. Execute: opencode auth login"
