# Lay images out in a labelled grid (a "contact sheet") so a whole surface set can be judged at a glance.
#
#   contact-sheet.ps1 -Out sheet.png -Items "label=path;label=path" [-Cols 4] [-CellW 260]
#   contact-sheet.ps1 -Out sheet.png -Dir shots -Pattern "widget-small-*.png"      (label = file name)
#
# Windows only (System.Drawing). Images are scaled down to -CellW (never up). ASCII only (PowerShell 5.1).
param(
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$Items = '',
  [string]$Dir = '',
  [string]$Pattern = '*.png',
  [int]$Cols = 4,
  [int]$CellW = 260,
  [string]$Bg = '20,20,18',
  [int]$Pad = 12
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$entries = @()
if ($Items) {
  foreach ($piece in ($Items -split ';' | Where-Object { $_ })) {
    $cut = $piece.IndexOf('=')
    $entries += [pscustomobject]@{ Label = $piece.Substring(0, $cut); Path = $piece.Substring($cut + 1) }
  }
} elseif ($Dir) {
  foreach ($f in (Get-ChildItem -Path $Dir -Filter $Pattern | Sort-Object Name)) {
    $entries += [pscustomobject]@{ Label = $f.BaseName; Path = $f.FullName }
  }
}
if ($entries.Count -eq 0) { throw 'no images: pass -Items or -Dir' }

$rgb = $Bg -split ','
$background = [System.Drawing.Color]::FromArgb([int]$rgb[0], [int]$rgb[1], [int]$rgb[2])
$font = New-Object System.Drawing.Font('Segoe UI', 9)
$ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190, 190, 180))

$cells = @()
foreach ($e in $entries) {
  $img = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $e.Path).Path)
  $scale = [Math]::Min(1.0, $CellW / $img.Width)
  $cells += [pscustomobject]@{ Label = $e.Label; Img = $img; W = [int]($img.Width * $scale); H = [int]($img.Height * $scale) }
}
$rows = [Math]::Ceiling($cells.Count / $Cols)
$rowHeights = @()
for ($r = 0; $r -lt $rows; $r++) {
  $slice = $cells[($r * $Cols)..([Math]::Min($cells.Count - 1, $r * $Cols + $Cols - 1))]
  $rowHeights += ($slice | Measure-Object -Property H -Maximum).Maximum
}
$totalW = $Cols * ($CellW + $Pad) + $Pad
$totalH = $Pad + ($rowHeights | Measure-Object -Sum).Sum + $rows * (22 + $Pad)
$bmp = New-Object System.Drawing.Bitmap $totalW, $totalH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear($background)
$g.InterpolationMode = 'HighQualityBicubic'
$g.SmoothingMode = 'HighQuality'
$g.TextRenderingHint = 'ClearTypeGridFit'
$y = $Pad
for ($r = 0; $r -lt $rows; $r++) {
  for ($c = 0; $c -lt $Cols; $c++) {
    $i = $r * $Cols + $c
    if ($i -ge $cells.Count) { break }
    $cell = $cells[$i]
    $x = $Pad + $c * ($CellW + $Pad) + [int](($CellW - $cell.W) / 2)
    $g.DrawImage($cell.Img, $x, $y, $cell.W, $cell.H)
    $g.DrawString($cell.Label, $font, $ink, ($Pad + $c * ($CellW + $Pad)), ($y + $rowHeights[$r] + 4))
  }
  $y += $rowHeights[$r] + 22 + $Pad
}
$g.Dispose()
New-Item -ItemType Directory -Force -Path (Split-Path -Parent ([System.IO.Path]::GetFullPath($Out))) | Out-Null
$bmp.Save([System.IO.Path]::GetFullPath($Out), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
foreach ($cell in $cells) { $cell.Img.Dispose() }
"saved $Out ($totalW x $totalH, $($cells.Count) images)"
