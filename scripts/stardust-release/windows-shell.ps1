# Runs only on the disposable Windows release runner.
param(
  [Parameter(Mandatory)][ValidateSet('installer', 'theme', 'desktop', 'start', 'install', 'verify', 'uninstall')][string] $Action,
  [string] $Setup,
  [string] $Output,
  [ValidateSet('light', 'dark')][string] $Theme = 'light',
  [string] $Version
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Use a disposable Windows CI desktop.' }
$AppName = '星尘'
$AppId = 'com.opensourcexiaoxin.stardust'
$Programs = [Environment]::GetFolderPath('Programs')
$Shortcut = Join-Path $Programs "$AppName.lnk"
$UninstallRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'

function Find-Installation {
  @(Get-ChildItem $UninstallRoot -ErrorAction SilentlyContinue |
    Get-ItemProperty |
    Where-Object { $_.DisplayName -eq $AppName })
}

function Assert-StardustBrand([string[]] $Fields) {
  if (($Fields -join "`n") -match '(?i)T3|星尘 Agent|Stardust Agent') {
    throw "Legacy product branding: $($Fields -join '; ')"
  }
}

function Wait-Setup($Process) {
  if (-not $Process.WaitForExit(180000)) { $Process.Kill(); throw 'Installer timed out.' }
  if ($Process.ExitCode -ne 0) { throw "Installer exit $($Process.ExitCode)." }
}

function Save-Desktop([string] $Path) {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $Bounds = [Windows.Forms.Screen]::PrimaryScreen.Bounds
  if ($Bounds.Width -lt 800 -or $Bounds.Height -lt 600) { throw 'Windows runner desktop is unavailable.' }
  $Image = [Drawing.Bitmap]::new($Bounds.Width, $Bounds.Height)
  $Graphics = [Drawing.Graphics]::FromImage($Image)
  try {
    $Graphics.CopyFromScreen($Bounds.Location, [Drawing.Point]::Empty, $Bounds.Size)
    $Image.Save([IO.Path]::GetFullPath($Path), [Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $Graphics.Dispose()
    $Image.Dispose()
  }
}

switch ($Action) {
  'theme' {
    $key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
    $light = [int]($Theme -eq 'light')
    New-Item $key -Force | Out-Null
    Set-ItemProperty $key -Name AppsUseLightTheme -Value $light -Type DWord
    Set-ItemProperty $key -Name SystemUsesLightTheme -Value $light -Type DWord
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class ThemeBroadcast {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint message, UIntPtr wParam, string lParam, uint flags, uint timeout, out UIntPtr result);
}
'@
    $result = [UIntPtr]::Zero
    [void][ThemeBroadcast]::SendMessageTimeout([IntPtr]0xffff, 0x1a, [UIntPtr]::Zero, 'ImmersiveColorSet', 2, 1000, [ref]$result)
  }
  'desktop' { Save-Desktop $Output }
  'installer' {
    $process = Start-Process -FilePath $Setup -PassThru
    $owned = $false
    try {
      for ($attempt = 0; $attempt -lt 120; $attempt++) {
        $process.Refresh()
        if ($process.HasExited) { break }
        if ($process.MainWindowHandle -ne 0) {
          if ($process.MainWindowTitle -notmatch $AppName) { throw "Installer title: $($process.MainWindowTitle)" }
          Assert-StardustBrand @($process.MainWindowTitle)
          Save-Desktop $Output
          $owned = $true
          break
        }
        Start-Sleep -Milliseconds 100
      }
      Wait-Setup $process
      if (-not $owned) { throw 'No visible Stardust installer window.' }
    } finally {
      if (-not $process.HasExited) { $process.Kill() }
    }
  }
  'start' {
    $app = @(Get-StartApps | Where-Object { $_.Name -eq $AppName -and $_.AppID -eq $AppId })
    if ($app.Count -ne 1) { throw 'Stardust shortcut is missing from Start.' }
    $shell = New-Object -ComObject WScript.Shell
    try {
      $shell.SendKeys('^{ESC}')
      Start-Sleep -Milliseconds 500
      Set-Clipboard -Value $AppName
      $shell.SendKeys('^v')
      Start-Sleep -Milliseconds 3500
      Save-Desktop $Output
    } finally {
      $shell.SendKeys('{ESC}')
      Set-Clipboard -Value ''
    }
  }
  'install' {
    Wait-Setup (Start-Process -FilePath $Setup -ArgumentList '/S', '/currentuser' -PassThru)
    $entries = Find-Installation
    if ($entries.Count -ne 1) { throw 'Expected one per-user Stardust uninstall entry.' }
    $entry = $entries[0]
    if ($entry.UninstallString -notmatch '^"([^"]+)"') { throw 'Invalid uninstall entry.' }
    $exe = Join-Path (Split-Path -Parent $Matches[1]) "$AppName.exe"
    $file = Get-Item -LiteralPath $exe
    if ($file.Name -ne "$AppName.exe") { throw 'Installed executable filename does not match Stardust.' }
    $file.FullName | Set-Content -LiteralPath $Output -Encoding utf8NoBOM
  }
  'verify' {
    $entry = Find-Installation | Select-Object -First 1
    if (-not $entry) { throw 'Stardust uninstall entry is missing.' }
    $exe = (Get-Content -LiteralPath $Output -Raw).Trim()
    $file = Get-Item -LiteralPath $exe
    $shortcutItem = (New-Object -ComObject Shell.Application).Namespace($Programs).ParseName("$AppName.lnk")
    if (-not $shortcutItem) { throw "Stardust Start shortcut is missing at $Shortcut." }
    $shortcutTarget = $shortcutItem.GetLink.Path
    if (-not $shortcutTarget -or -not (Test-Path -LiteralPath $shortcutTarget -PathType Leaf)) {
      throw "Stardust Start shortcut has an invalid target: '$shortcutTarget'."
    }
    # Shell links can report a long spelling for a path stored with an 8.3 alias by NSIS.
    if ((Get-FileHash -LiteralPath $shortcutTarget).Hash -ne (Get-FileHash -LiteralPath $exe).Hash) {
      throw "Stardust Start shortcut targets '$shortcutTarget', expected '$exe'."
    }
    $shortcutAppId = $shortcutItem.ExtendedProperty('System.AppUserModel.ID')
    if (-not $shortcutAppId) {
      $shortcutAppId = (Get-StartApps | Where-Object { $_.Name -eq $AppName }).AppID
    }
    if ($shortcutAppId -ne $AppId) { throw "Stardust Start shortcut AUMID is '$shortcutAppId'." }
    $info = $file.VersionInfo
    if ($entry.Publisher -ne '开源小新 OpenSource Xiaoxin' -or $entry.DisplayVersion -ne $Version -or
        $info.ProductName -ne $AppName -or $info.ProductVersion -notin @($Version, "$Version.0") -or
        $info.FileVersion -notin @($Version, "$Version.0") -or $info.FileDescription -ne $AppName) {
      throw 'Publisher, version or product metadata does not match.'
    }
    $monitor = Join-Path $file.DirectoryName 'resources\resource-monitor\stardust-resource-monitor.exe'
    if (-not (Test-Path -LiteralPath $monitor -PathType Leaf)) { throw 'Missing resource monitor.' }
    $setupInfo = (Get-Item -LiteralPath $Setup).VersionInfo
    if ($setupInfo.FileDescription -notmatch 'Stardust' -or $setupInfo.ProductVersion -ne $Version) {
      throw 'Setup does not identify Stardust or its release version.'
    }
    Assert-StardustBrand @(
      $entry.DisplayName, $entry.Publisher, $entry.PSChildName, $entry.DisplayIcon, $entry.UninstallString,
      $entry.Comments, $shortcutTarget, $shortcutItem.GetLink.Description, $info.CompanyName, $info.ProductName,
      $info.FileDescription, $info.OriginalFilename, $setupInfo.CompanyName, $setupInfo.ProductName,
      $setupInfo.FileDescription, (Get-ChildItem $file.DirectoryName -File | ForEach-Object Name)
    )
    Write-Output "Stardust $Version installer, executable, Start shortcut and AUMID validated."
  }
  'uninstall' {
    $entries = Find-Installation
    if ($entries.Count -eq 0) { exit 0 }
    if ($entries.Count -ne 1) { throw 'Unexpected Stardust uninstall entries.' }
    $command = $entries[0].QuietUninstallString
    if ($command -notmatch '^"([^"]+)"\s*(.*)$') { throw "Unexpected uninstaller command: $command" }
    $executable = $Matches[1]
    $arguments = $Matches[2]
    Wait-Setup (Start-Process -FilePath $executable -ArgumentList $arguments -PassThru)
    $app = Join-Path (Split-Path -Parent $executable) "$AppName.exe"
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      $remaining = @(
        if ((Find-Installation).Count -ne 0) { 'uninstall registry entry' }
        if (Test-Path -LiteralPath $Shortcut) { 'Start shortcut' }
        if (Test-Path -LiteralPath $app) { 'application executable' }
        if (Test-Path -LiteralPath $executable) { 'uninstaller executable' }
      )
      if ($remaining.Count -eq 0) { return }
      Start-Sleep -Milliseconds 250
    }
    throw "Uninstall left these entries: $($remaining -join ', ')."
  }
}
