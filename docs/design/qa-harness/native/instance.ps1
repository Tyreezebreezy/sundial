# Launch, stop and inspect the app instance the harness drives, and protect real user data.
#
#   start-dev      isolated dev instance (temporary identifier => separate app data and WebView2
#                  profile, so the real app's data is never touched) with remote debugging on
#   stop-dev       stop it (its whole process tree)
#   start-release  launch the built release binary with the REAL identifier (needs -AllowRealData)
#   stop-release   stop that binary
#   inspect        which instance answers on the debugging port, which identifier it uses, and
#                  whether it is isolated
#   backup-state / restore-state
#                  copy the app's state file aside / put it back if it changed (real-data runs)
#
# Every action prints one JSON document on stdout. ASCII only (Windows PowerShell 5.1).
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start-dev', 'stop-dev', 'start-release', 'stop-release', 'inspect', 'backup-state', 'restore-state')]
  [string]$Action,
  [Parameter(Mandatory = $true)][string]$Config,
  [int]$Port = 0,
  [int]$ExpectWindows = 0,
  [int]$TimeoutSec = 240,
  [string]$Target = 'dev',
  [switch]$AllowRealData
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$cfg = Get-HarnessConfig $Config
if ($Port -le 0) { $Port = [int]$cfg.cdp.port }
$work = Get-WorkDir $cfg
$pidFile = Join-Path $work 'dev.pid'

function Get-ExpectedWindowCount {
  if ($ExpectWindows -gt 0) { return $ExpectWindows }
  $n = 0
  foreach ($w in $cfg.windows.PSObject.Properties) { if (-not $w.Value.optional) { $n++ } }
  return [Math]::Max(1, $n)
}

function Wait-ForWindows {
  param([int]$Count)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $seen = 0
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/list" -UseBasicParsing -TimeoutSec 3
      $pages = @(($r.Content | ConvertFrom-Json) | Where-Object { $_.type -eq 'page' })
      $seen = $pages.Count
      if ($seen -ge $Count) { return $seen }
    } catch { }
    Start-Sleep -Seconds 2
  }
  return $seen
}

# taskkill reports "process not found" on stderr, and under $ErrorActionPreference = 'Stop' Windows
# PowerShell 5.1 turns any native stderr into a terminating error. Route it through cmd so a process
# that has already exited is simply not an error.
function Stop-Tree {
  param([int]$ProcessId, [switch]$Tree)
  $flags = '/F'
  if ($Tree) { $flags = '/T /F' }
  cmd /c "taskkill /PID $ProcessId $flags >nul 2>&1"
}

function Stop-Instance {
  # 1. the recorded `tauri dev` process tree (this also takes the dev server with it)
  if (Test-Path $pidFile) {
    $recorded = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($recorded) { Stop-Tree -ProcessId ([int]$recorded) -Tree }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
  }
  # 2. whatever still answers on the debugging port (the app and its WebView2 processes)
  $info = Get-InstanceInfo $cfg $Port
  foreach ($p in $info.appPids) { Stop-Tree -ProcessId $p -Tree }
  foreach ($p in $info.webviewPids) { Stop-Tree -ProcessId $p }
  Start-Sleep -Milliseconds 800
}

function Get-StatePaths {
  param([string]$Which)
  if (-not $cfg.app.stateFile) { return $null }
  if ($Which -eq 'release') { $id = $cfg.app.identifier } else { $id = $cfg.app.isolatedIdentifier }
  $file = Expand-Tokens $cfg.app.stateFile @{ identifier = $id }
  return [pscustomobject]@{ state = $file; backup = (Join-Path $work ("state-backup-$Which.json")) }
}

switch ($Action) {
  'start-dev' {
    Stop-Instance
    $conf = Join-Path $work 'isolated.conf.json'
    ('{ "identifier": "' + $cfg.app.isolatedIdentifier + '" }') | Set-Content -Path $conf -Encoding ascii
    $log = Join-Path $work 'dev.log'
    if (Test-Path $log) { Remove-Item $log -Force }
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port"
    $devCommand = @($cfg.app.devCommand) -join ' '
    $cmd = "$devCommand -- --config `"$conf`" > `"$log`" 2>&1"
    $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory $cfg.repoRoot -WindowStyle Hidden -PassThru
    $proc.Id | Set-Content $pidFile
    $want = Get-ExpectedWindowCount
    $seen = Wait-ForWindows $want
    if ($seen -lt $want) {
      Write-Log "only $seen of $want window(s) appeared within ${TimeoutSec}s; tail of ${log}:"
      if (Test-Path $log) { Get-Content $log -Tail 15 | ForEach-Object { Write-Log $_ } }
      Write-Json @{ action = $Action; started = $false; windows = $seen; expected = $want; log = $log }
      exit 1
    }
    Start-Sleep -Seconds 3
    Write-Json @{ action = $Action; started = $true; pid = $proc.Id; windows = $seen; port = $Port; identifier = $cfg.app.isolatedIdentifier; log = $log }
  }
  'stop-dev' {
    Stop-Instance
    Write-Json @{ action = $Action; stopped = $true }
  }
  'start-release' {
    if (-not $AllowRealData) {
      Write-Log 'Refusing: the release binary uses the real app identifier and therefore the real user data. Pass -AllowRealData and back up the state file first (backup-state).'
      Write-Json @{ action = $Action; started = $false; refused = $true }
      exit 2
    }
    $exe = Resolve-RepoPath $cfg $cfg.app.releaseExe
    if (-not (Test-Path $exe)) { throw "release binary not found: $exe" }
    if ((Get-InstanceInfo $cfg $Port).running) { throw 'an instance is already running; stop it first' }
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port"
    $proc = Start-Process -FilePath $exe -PassThru
    $want = Get-ExpectedWindowCount
    $seen = Wait-ForWindows $want
    Start-Sleep -Seconds 3
    Write-Json @{ action = $Action; started = ($seen -ge $want); pid = $proc.Id; windows = $seen; version = (Get-Item $exe).VersionInfo.ProductVersion }
  }
  'stop-release' {
    $exe = Resolve-RepoPath $cfg $cfg.app.releaseExe
    Get-CimInstance Win32_Process -Filter ("Name='" + $cfg.app.processName + "'") | Where-Object { $_.ExecutablePath -eq $exe } | ForEach-Object { Stop-Tree -ProcessId ([int]$_.ProcessId) -Tree }
    Start-Sleep -Milliseconds 800
    Write-Json @{ action = $Action; stopped = $true }
  }
  'inspect' {
    $info = Get-InstanceInfo $cfg $Port
    # WebView2 processes of the identifier this target uses, even after the app has exited
    if ($Target -eq 'release') { $id = $cfg.app.identifier } else { $id = $cfg.app.isolatedIdentifier }
    $needle = '\' + $id + '\EBWebView'
    $left = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($needle, [StringComparison]::OrdinalIgnoreCase) -ge 0 })
    $info | Add-Member -NotePropertyName targetWebviewProcesses -NotePropertyValue $left.Count -Force
    Write-Json $info
  }
  'backup-state' {
    $p = Get-StatePaths $Target
    if (-not $p) { Write-Json @{ action = $Action; backedUp = $false; reason = 'config has no app.stateFile' }; exit 0 }
    if (-not (Test-Path $p.state)) { Write-Json @{ action = $Action; backedUp = $false; existed = $false; state = $p.state }; exit 0 }
    Copy-Item $p.state $p.backup -Force
    Write-Json @{ action = $Action; backedUp = $true; existed = $true; backup = $p.backup; sha256 = (Get-FileHash $p.backup -Algorithm SHA256).Hash }
  }
  'restore-state' {
    $p = Get-StatePaths $Target
    if (-not $p -or -not (Test-Path $p.backup)) { Write-Json @{ action = $Action; restored = $false; reason = 'no backup to restore' }; exit 0 }
    $now = ''
    if (Test-Path $p.state) { $now = (Get-FileHash $p.state -Algorithm SHA256).Hash }
    $orig = (Get-FileHash $p.backup -Algorithm SHA256).Hash
    if ($now -eq $orig) { Write-Json @{ action = $Action; restored = $false; unchanged = $true; sha256 = $orig }; exit 0 }
    Copy-Item $p.backup $p.state -Force
    Write-Json @{ action = $Action; restored = $true; unchanged = $false; sha256Before = $now; sha256After = (Get-FileHash $p.state -Algorithm SHA256).Hash }
  }
}
