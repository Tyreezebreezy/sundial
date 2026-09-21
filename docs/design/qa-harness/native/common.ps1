# Shared helpers for the harness's PowerShell scripts (dot-sourced).
# ASCII only on purpose: Windows PowerShell 5.1 reads BOM-less files as ANSI.

$script:HarnessDir = Split-Path -Parent $PSScriptRoot

function Expand-Tokens {
  param([string]$Text, [hashtable]$Vars = @{})
  if ([string]::IsNullOrEmpty($Text)) { return $Text }
  $evaluator = [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    $name = $m.Groups[1].Value
    if ($Vars.ContainsKey($name)) { return [string]$Vars[$name] }
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($null -ne $value) { return $value }
    return $m.Value
  }
  return [regex]::Replace($Text, '\$\{([A-Za-z_][A-Za-z0-9_]*)\}', $evaluator)
}

# Reads the same JSON config the Node runners read and resolves the repo root the
# same way: config.repoRoot (relative to the config file), else three levels up
# from the harness directory (docs/design/qa-harness -> repository root).
function Get-HarnessConfig {
  param([Parameter(Mandatory = $true)][string]$ConfigPath)
  $abs = (Resolve-Path -LiteralPath $ConfigPath).Path
  $cfg = Get-Content -LiteralPath $abs -Raw | ConvertFrom-Json
  $configDir = Split-Path -Parent $abs
  if ($cfg.repoRoot) { $root = Join-Path $configDir $cfg.repoRoot } else { $root = Join-Path $script:HarnessDir '..\..\..' }
  $cfg | Add-Member -NotePropertyName repoRoot -NotePropertyValue ([System.IO.Path]::GetFullPath($root)) -Force
  $cfg | Add-Member -NotePropertyName configFile -NotePropertyValue $abs -Force
  return $cfg
}

function Resolve-RepoPath {
  param($Cfg, [string]$Relative)
  $expanded = Expand-Tokens $Relative
  return [System.IO.Path]::GetFullPath((Join-Path $Cfg.repoRoot $expanded))
}

function Get-WorkDir {
  param($Cfg)
  $dir = Join-Path $env:TEMP ('qa-harness\' + $Cfg.app.name.ToLower())
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Write-Json {
  param($Object)
  Write-Output (ConvertTo-Json -InputObject $Object -Compress -Depth 6)
}

function Write-Log {
  param([string]$Message)
  [Console]::Error.WriteLine($Message)
}

# Finds the app instance that exposes the remote-debugging port: the WebView2 browser
# process started with --remote-debugging-port=<Port>, its user-data-dir (which carries the
# app identifier), every WebView2 process sharing that dir, and the app process that owns them.
function Get-InstanceInfo {
  param($Cfg, [int]$Port)
  $all = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'")
  $browsers = @($all | Where-Object { $_.CommandLine -and $_.CommandLine -like "*--remote-debugging-port=$Port*" })
  $udd = $null
  foreach ($b in $browsers) {
    if ($b.CommandLine -match '--user-data-dir=(?:"([^"]+)"|(\S+))') {
      if ($Matches[1]) { $udd = $Matches[1] } else { $udd = $Matches[2] }
      break
    }
  }
  $identifier = $null
  if ($udd) {
    $leaf = Split-Path -Leaf $udd
    if ($leaf -ieq 'EBWebView') { $identifier = Split-Path -Leaf (Split-Path -Parent $udd) } else { $identifier = $leaf }
  }
  $webview = @()
  if ($udd) {
    $webview = @($all | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($udd, [StringComparison]::OrdinalIgnoreCase) -ge 0 })
  }
  $owners = @($browsers | ForEach-Object { $_.ParentProcessId })
  $apps = @(Get-CimInstance Win32_Process -Filter ("Name='" + $Cfg.app.processName + "'") | Where-Object {
      ($owners -contains $_.ProcessId) -or ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($Cfg.repoRoot, [StringComparison]::OrdinalIgnoreCase))
    })
  $isolated = $null
  if ($identifier) { $isolated = ($identifier -ine $Cfg.app.identifier) }
  return [pscustomobject]@{
    running          = ($apps.Count -gt 0)
    appPids          = @($apps | ForEach-Object { [int]$_.ProcessId })
    webviewProcesses = $webview.Count
    webviewPids      = @($webview | ForEach-Object { [int]$_.ProcessId })
    userDataDir      = $udd
    identifier       = $identifier
    isolated         = $isolated
    port             = $Port
  }
}

# Visible top-level windows that belong to the given process ids.
function Get-VisibleWindows {
  param([int[]]$ProcessIds)
  if (-not ('QaWin32' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class QaWin32 {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static List<object[]> Visible(HashSet<uint> pids) {
    var res = new List<object[]>();
    EnumWindows((h, l) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pids.Contains(pid) && IsWindowVisible(h)) {
        RECT r; GetWindowRect(h, out r);
        var sb = new StringBuilder(256); GetWindowText(h, sb, 256);
        if (r.R - r.L > 50) res.Add(new object[] { h.ToInt64(), r.R - r.L, r.B - r.T, sb.ToString() });
      }
      return true;
    }, IntPtr.Zero);
    return res;
  }
}
"@
  }
  $set = New-Object 'System.Collections.Generic.HashSet[uint32]'
  foreach ($p in $ProcessIds) { [void]$set.Add([uint32]$p) }
  $out = @()
  foreach ($w in [QaWin32]::Visible($set)) {
    $out += [pscustomobject]@{ hwnd = [int64]$w[0]; width = [int]$w[1]; height = [int]$w[2]; title = [string]$w[3] }
  }
  return $out
}
