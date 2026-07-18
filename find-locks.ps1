$targets = @('轻账.exe', 'app.asar', 'icudtl.dat', 'v8_context_snapshot.bin')
Get-Process | ForEach-Object {
  try {
    $path = $_.MainModule.FileName
    if ($path) {
      foreach ($t in $targets) {
        if ($path -like "*$t") {
          [PSCustomObject]@{ Id = $_.Id; Name = $_.ProcessName; Path = $path }
        }
      }
    }
  } catch { }
} | Format-Table -AutoSize

Write-Host '---all processes touching win-unpacked---'
Get-Process | Where-Object { $_.MainModule.FileName -like '*win-unpacked*' } | Select-Object Id, ProcessName, @{N='Path';E={$_.MainModule.FileName}} | Format-Table -AutoSize