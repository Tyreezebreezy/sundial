# Before/after boards: the same surface from two builds side by side, so a redesign is judged on
# evidence rather than memory. Both directories must use the same file names (the capture driver
# guarantees that when the same surface ids are used for the baseline and the new build).
#
#   before-after.ps1 -Before docs/design/v1.0.1-baseline -After docs/design/v1.1.0 `
#       -Names 01-study-setup,02-timer-setup -Out board.png [-Cols 4] [-CellW 440]
#
# Each name becomes two cells: "before <name>" then "after <name>". Windows only. ASCII only (PS 5.1).
param(
  [Parameter(Mandatory = $true)][string]$Before,
  [Parameter(Mandatory = $true)][string]$After,
  [Parameter(Mandatory = $true)][string]$Names,
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$BeforeLabel = 'before',
  [string]$AfterLabel = 'after',
  [int]$Cols = 4,
  [int]$CellW = 440,
  [string]$Bg = '20,20,18'
)
$ErrorActionPreference = 'Stop'
$items = ''
foreach ($name in ($Names -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
  foreach ($side in @(@($BeforeLabel, $Before), @($AfterLabel, $After))) {
    $file = Join-Path $side[1] ($name + '.png')
    if (-not (Test-Path -LiteralPath $file)) { throw "missing image: $file" }
    $items += ($side[0] + ' ' + $name + '=' + (Resolve-Path -LiteralPath $file).Path + ';')
  }
}
& (Join-Path $PSScriptRoot 'contact-sheet.ps1') -Out $Out -Items $items -Cols $Cols -CellW $CellW -Bg $Bg
