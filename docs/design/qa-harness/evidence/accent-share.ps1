# Share of pixels in the brand's accent hue, per screenshot, before vs after. A pixel statistic for
# the "is the accent colour still scarce?" question - informational, not a perceptual study.
#
#   accent-share.ps1 -Before dirA -After dirB -Names 01-study-setup,04-study-active-disk [-HueMin 28 -HueMax 55]
#
# A pixel counts when its hue is within [HueMin, HueMax] degrees, saturation >= MinSat, value >= MinVal.
# Prints a markdown table. Windows only. ASCII only (Windows PowerShell 5.1).
param(
  [Parameter(Mandatory = $true)][string]$Before,
  [Parameter(Mandatory = $true)][string]$After,
  [Parameter(Mandatory = $true)][string]$Names,
  [double]$HueMin = 28,
  [double]$HueMax = 55,
  [double]$MinSat = 0.35,
  [double]$MinVal = 0.45
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (-not ('AccentShare' -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class AccentShare {
  public static double Measure(string path, double hueMin, double hueMax, double minSat, double minVal) {
    using (var bmp = new Bitmap(path)) {
      var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
      var data = bmp.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      byte[] buf = new byte[Math.Abs(data.Stride) * bmp.Height];
      System.Runtime.InteropServices.Marshal.Copy(data.Scan0, buf, 0, buf.Length);
      long hits = 0;
      for (int y = 0; y < bmp.Height; y++) for (int x = 0; x < bmp.Width; x++) {
        int i = y * data.Stride + x * 4;
        double b = buf[i] / 255.0, g = buf[i + 1] / 255.0, r = buf[i + 2] / 255.0;
        double max = Math.Max(r, Math.Max(g, b)), min = Math.Min(r, Math.Min(g, b)), d = max - min;
        if (d <= 0 || max < minVal) continue;
        if (d / max < minSat) continue;
        double h = (max == r ? ((g - b) / d) % 6 : (max == g ? (b - r) / d + 2 : (r - g) / d + 4)) * 60;
        if (h < 0) h += 360;
        if (h >= hueMin && h <= hueMax) hits++;
      }
      bmp.UnlockBits(data);
      return 100.0 * hits / ((double)bmp.Width * bmp.Height);
    }
  }
}
"@ -ReferencedAssemblies System.Drawing
}
"| surface | before % | after % |"
"|---|---|---|"
foreach ($name in ($Names -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
  $beforeFile = (Resolve-Path -LiteralPath (Join-Path $Before ($name + '.png'))).Path
  $afterFile = (Resolve-Path -LiteralPath (Join-Path $After ($name + '.png'))).Path
  $b = [AccentShare]::Measure($beforeFile, $HueMin, $HueMax, $MinSat, $MinVal)
  $a = [AccentShare]::Measure($afterFile, $HueMin, $HueMax, $MinSat, $MinVal)
  "| {0} | {1:N2} | {2:N2} |" -f $name, $b, $a
}
