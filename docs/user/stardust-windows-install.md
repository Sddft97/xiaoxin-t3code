# Windows 上安装星尘 / Install Stardust on Windows

## 简体中文

从同一个正式版本下载 `Stardust-v{版本}-Windows-x64-Setup.exe` 和 `SHA256SUMS.txt`。在下载目录打开 PowerShell，将下面的 `<版本>` 替换为下载页上的版本号。

```powershell
$file = 'Stardust-v<版本>-Windows-x64-Setup.exe'
$line = @(Get-Content -LiteralPath '.\SHA256SUMS.txt' | Where-Object {
  $_ -match ('^[a-fA-F0-9]{64}\s+\*?' + [regex]::Escape($file) + '$')
})
if ($line.Count -ne 1) { throw '找不到该安装包唯一的校验值。' }
$expected = $line[0].Substring(0, 64)
$actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
if ($actual -ine $expected) { throw 'SHA-256 校验失败。请停止安装并从正式版本重新下载。' }
'SHA-256 校验通过'
```

首次 Windows 版未签名，Windows 可能将发布者显示为「未知」。确认文件来自官方发布页且校验通过后，打开安装包。如果 Microsoft Defender SmartScreen 显示「Windows 已保护你的电脑」，选择「更多信息」→「仍要运行」。如果组织策略或智能应用控制阻止运行，请保留安全设置并停止安装。安装只对当前用户生效，从开始菜单打开「星尘」。

- [星尘正式版本](https://github.com/zds-xiaoxin/stardust/releases)
- [Microsoft 的 SmartScreen 说明](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)
- [Microsoft 的智能应用控制说明](https://support.microsoft.com/en-gb/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions)

## English

Download `Stardust-v{version}-Windows-x64-Setup.exe` and `SHA256SUMS.txt` from the same official release. Open PowerShell in the download folder and replace `<version>` with the release version.

```powershell
$file = 'Stardust-v<version>-Windows-x64-Setup.exe'
$line = @(Get-Content -LiteralPath '.\SHA256SUMS.txt' | Where-Object {
  $_ -match ('^[a-fA-F0-9]{64}\s+\*?' + [regex]::Escape($file) + '$')
})
if ($line.Count -ne 1) { throw 'Expected one checksum for this installer.' }
$expected = $line[0].Substring(0, 64)
$actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
if ($actual -ine $expected) { throw 'SHA-256 mismatch. Stop and download again from the official release.' }
'SHA-256 verified'
```

The first Windows release is unsigned, so Windows may show an unknown publisher. After verifying the download source and checksum, open the installer. If Microsoft Defender SmartScreen displays **Windows protected your PC**, select **More info** → **Run anyway**. If organizational policy or Smart App Control blocks the installer, leave your security settings in place and stop the installation. Setup installs for your Windows user account. Open **星尘** from the Start menu.

- [Official Stardust releases](https://github.com/zds-xiaoxin/stardust/releases)
- [Microsoft SmartScreen guidance](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)
- [Microsoft Smart App Control FAQ](https://support.microsoft.com/en-gb/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions)
