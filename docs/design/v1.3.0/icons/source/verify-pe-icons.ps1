param([Parameter(Mandatory=$true)][string]$Ico,[Parameter(Mandatory=$true)][string[]]$Executables)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class IconResources {
  delegate bool Callback(IntPtr h, IntPtr t, IntPtr n, IntPtr p);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr LoadLibraryEx(string f,IntPtr r,uint flags);
  [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr h);
  [DllImport("kernel32.dll")] static extern bool EnumResourceNames(IntPtr h,IntPtr t,Callback c,IntPtr p);
  [DllImport("kernel32.dll")] static extern IntPtr FindResource(IntPtr h,IntPtr n,IntPtr t);
  [DllImport("kernel32.dll")] static extern uint SizeofResource(IntPtr h,IntPtr r);
  [DllImport("kernel32.dll")] static extern IntPtr LoadResource(IntPtr h,IntPtr r);
  [DllImport("kernel32.dll")] static extern IntPtr LockResource(IntPtr r);
  public static byte[][] Read(string file) {
    var h=LoadLibraryEx(file,IntPtr.Zero,2); if(h==IntPtr.Zero) throw new Exception("Cannot read PE resources");
    var all=new List<byte[]>();
    try { EnumResourceNames(h,(IntPtr)3,(m,t,n,p)=>{var r=FindResource(m,n,t); var b=new byte[SizeofResource(m,r)]; Marshal.Copy(LockResource(LoadResource(m,r)),b,0,b.Length); all.Add(b); return true;},IntPtr.Zero); }
    finally { FreeLibrary(h); }
    return all.ToArray();
  }
}
'@
function Hash-Bytes([byte[]]$Bytes) { $sha=[Security.Cryptography.SHA256]::Create(); try { [Convert]::ToBase64String($sha.ComputeHash($Bytes)) } finally { $sha.Dispose() } }
$bytes=[IO.File]::ReadAllBytes($Ico)
$frames=@()
for($i=0;$i -lt [BitConverter]::ToUInt16($bytes,4);$i++) {
  $o=6+16*$i; $len=[BitConverter]::ToUInt32($bytes,$o+8); $start=[BitConverter]::ToUInt32($bytes,$o+12)
  $data=New-Object byte[] $len; [Array]::Copy($bytes,$start,$data,0,$len)
  $frames+=@{size=$(if($bytes[$o]){$bytes[$o]}else{256});hash=(Hash-Bytes $data)}
}
foreach($exe in $Executables) {
  $resources=@([IconResources]::Read($exe) | ForEach-Object { Hash-Bytes $_ })
  foreach($f in $frames){if($f.hash -notin $resources){throw "Icon $($f.size)px differs in $exe"}}
  if((Hash-Bytes ([byte[]](1,2,3))) -in $resources){throw 'Mutation negative control unexpectedly matched'}
  Write-Output "PASS $exe : all $($frames.Count) canonical ICO frames embedded; wrong-frame negative control rejected"
}
