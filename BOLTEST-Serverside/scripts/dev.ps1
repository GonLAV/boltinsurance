[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSScriptAnalyzer', '')]
param(
  [int]$Port = 5000
)

$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 5) {
  Write-Warning "PowerShell 5.0 or later required"
  exit 1
}

Write-Host "[dev] Ensuring port $Port is free..."

$selectedPort = $Port
$portInfoPath = Join-Path (Split-Path -Parent $PSScriptRoot) ".dev-port.json"

function Get-ListeningProcessIds {
  param([int]$ListeningPort)
  
  $connections = Get-NetTCPConnection -LocalPort $ListeningPort -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) { 
    return @() 
  }
  $procIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  return $procIds
}

function Find-FreePort {
  param([int]$PreferredPort, [int]$MaxOffset = 10)
  
  $offset = 0
  while ($offset -lt ($MaxOffset + 1)) {
    $candidate = $PreferredPort + $offset
    $procIds = Get-ListeningProcessIds -ListeningPort $candidate
    if ($procIds.Count -eq 0) { 
      return $candidate 
    }
    $offset = $offset + 1
  }
  return 0
}

function Wait-ForPortToBeFree {
  param([int]$ListeningPort, [int]$TimeoutMs = 8000)
  
  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
  while ((Get-Date) -lt $deadline) {
    $listeningProcessIds = Get-ListeningProcessIds -ListeningPort $ListeningPort
    if ($listeningProcessIds.Count -eq 0) { return $true }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

try {
  $processIds = Get-ListeningProcessIds -ListeningPort $Port
  if ($processIds -and $processIds.Count -gt 0) {
    foreach ($processId in $processIds) {
      if (-not $processId) { continue }
      try {
        $p = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($p) {
          Write-Host "[dev] Stopping PID $processId ($($p.ProcessName)) holding port $Port"
        } else {
          Write-Host "[dev] Stopping PID $processId holding port $Port"
        }

        # Stop the entire process tree to avoid orphaned listeners (Windows).
        & taskkill.exe /PID $processId /T /F | Out-Null

        # Best-effort fallback in case taskkill fails.
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      } catch {
        Write-Host "[dev] Could not stop PID $processId : $($_.Exception.Message)"
      }
    }
  }

  # Enforce fixed port: do not fallback. Wait longer and fail if still busy.
  if (Wait-ForPortToBeFree -ListeningPort $Port -TimeoutMs 15000) {
    $selectedPort = $Port
  } else {
    $stillPids = Get-ListeningProcessIds -ListeningPort $Port
    Write-Host "[dev] ERROR: Port $Port is still in use by PID(s): $($stillPids -join ', ')"
    Write-Host "[dev] Please close any other backend instances using port $Port and retry."
    exit 1
  }
} catch {
  Write-Host "[dev] Port check failed: $($_.Exception.Message)"
  if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
    Write-Host $_.InvocationInfo.PositionMessage
  }
  throw
}

try {
  $portInfo = @{ port = $selectedPort; updatedAt = (Get-Date).ToString('o') } | ConvertTo-Json -Compress
  Set-Content -Path $portInfoPath -Value $portInfo -Encoding UTF8
  Write-Host "[dev] Wrote $portInfoPath"
} catch {
  Write-Host "[dev] WARNING: Could not write $portInfoPath ($($_.Exception.Message))"
}

$env:PORT = $selectedPort
Write-Host "[dev] Backend will listen on port $selectedPort"

Write-Host "[dev] Starting nodemon..."

# Use the local nodemon installed in node_modules with repo config.
# This prevents restart loops caused by .dev-port.json and uploads changes.
& "${PSScriptRoot}\..\node_modules\.bin\nodemon.cmd" "--config" "nodemon.json"
exit $LASTEXITCODE
