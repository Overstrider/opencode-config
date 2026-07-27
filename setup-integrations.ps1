[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repositoryRoot = $PSScriptRoot
$graphifyVersion = (Get-Content -Raw (
    Join-Path $repositoryRoot ".graphify-version"
)).Trim()
$codebaseMemoryVersion = (Get-Content -Raw (
    Join-Path $repositoryRoot ".codebase-memory-mcp-version"
)).Trim()

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is required."
}
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    python -m pip install --user "uv==0.11.6"
}

uv tool install --upgrade "graphifyy==$graphifyVersion"
npm install --global "codebase-memory-mcp@$codebaseMemoryVersion"
codebase-memory-mcp config set auto_index true
codebase-memory-mcp config set auto_watch true

Write-Host "Graphify $graphifyVersion installed."
Write-Host "codebase-memory-mcp $codebaseMemoryVersion enabled."
