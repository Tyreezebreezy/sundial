# Native Win32 checks on the instance that answers on the debugging port.
#
#   windows     visible top-level windows (size, title) - proves what the OS shows, not what the DOM says
#   close-main  post WM_CLOSE to the largest visible window, exactly like the title-bar close button
#   processes   how many app and WebView2 processes belong to the instance
#
# Prints one JSON document on stdout. ASCII only (Windows PowerShell 5.1).
param(
  [Parameter(Mandatory = $true)][ValidateSet('windows', 'close-main', 'processes')][string]$Action,
  [Parameter(Mandatory = $true)][string]$Config,
  [int]$Port = 0
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$cfg = Get-HarnessConfig $Config
if ($Port -le 0) { $Port = [int]$cfg.cdp.port }
$info = Get-InstanceInfo $cfg $Port

switch ($Action) {
  'processes' {
    Write-Json @{ action = $Action; running = $info.running; app = $info.appPids.Count; webview = $info.webviewProcesses; identifier = $info.identifier }
  }
  'windows' {
    $wins = @()
    if ($info.running) { $wins = @(Get-VisibleWindows $info.appPids) }
    Write-Json @{ action = $Action; running = $info.running; windows = $wins }
  }
  'close-main' {
    if (-not $info.running) { Write-Json @{ action = $Action; closed = $false; reason = 'not running' }; exit 1 }
    $wins = @(Get-VisibleWindows $info.appPids | Sort-Object { $_.width * $_.height } -Descending)
    if ($wins.Count -eq 0) { Write-Json @{ action = $Action; closed = $false; reason = 'no visible window' }; exit 1 }
    $main = $wins[0]
    [void][QaWin32]::PostMessage([IntPtr]$main.hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    Write-Json @{ action = $Action; closed = $true; width = $main.width; height = $main.height; title = $main.title }
  }
}
