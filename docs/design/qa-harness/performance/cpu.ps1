# CPU used by the app instance that answers on the debugging port: the app process plus every
# WebView2 process that shares its user-data dir, summed over a window of -Seconds.
# Prints one JSON document on stdout. ASCII only (Windows PowerShell 5.1).
param(
  [Parameter(Mandatory = $true)][string]$Config,
  [int]$Port = 0,
  [int]$Seconds = 15
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\native\common.ps1')

$cfg = Get-HarnessConfig $Config
if ($Port -le 0) { $Port = [int]$cfg.cdp.port }
$info = Get-InstanceInfo $cfg $Port
$ids = @($info.appPids) + @($info.webviewPids)
if ($ids.Count -eq 0) { Write-Json @{ error = 'no instance found on the debugging port' }; exit 1 }

$t0 = @{}
foreach ($id in $ids) {
  try { $t0[$id] = (Get-Process -Id $id -ErrorAction Stop).TotalProcessorTime.TotalSeconds } catch { }
}
$start = Get-Date
Start-Sleep -Seconds $Seconds
$elapsed = ((Get-Date) - $start).TotalSeconds
$sum = 0.0
foreach ($id in @($t0.Keys)) {
  try { $sum += (Get-Process -Id $id -ErrorAction Stop).TotalProcessorTime.TotalSeconds - $t0[$id] } catch { }
}
$cores = [Environment]::ProcessorCount
Write-Json @{
  percentOfOneCore  = [Math]::Round(100 * $sum / $elapsed, 2)
  percentOfAllCores = [Math]::Round(100 * $sum / $elapsed / $cores, 2)
  logicalCores      = $cores
  processes         = $t0.Count
  seconds           = [Math]::Round($elapsed, 1)
  identifier        = $info.identifier
}
