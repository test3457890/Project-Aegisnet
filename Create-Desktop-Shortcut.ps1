$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$targetPath = Join-Path $scriptDir "Start-AegisNet.bat"

if (-not (Test-Path $targetPath)) {
    Write-Host "Error: Could not find Start-AegisNet.bat at $targetPath" -ForegroundColor Red
    exit 1
}

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Start AegisNet Prototype.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $scriptDir
$Shortcut.Description = "Start the AegisNet Frontend Prototype"
$Shortcut.Save()

Write-Host "Success! Desktop shortcut created at:" -ForegroundColor Green
Write-Host $shortcutPath -ForegroundColor Cyan
Write-Host "You can now double-click 'Start AegisNet Prototype' on your desktop."
