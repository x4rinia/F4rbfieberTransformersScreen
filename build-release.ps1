[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$solution = Join-Path $projectRoot 'F4rbfieberTransformersScreen.sln'
$project = Join-Path $projectRoot 'src\F4rbfieberTransformersScreen\F4rbfieberTransformersScreen.csproj'
$launcherProject = Join-Path $projectRoot 'src\F4rbfieberTransformersScreen.Launcher\F4rbfieberTransformersScreen.Launcher.csproj'
$releaseDirectory = Join-Path $projectRoot 'release'
$launcherStaging = Join-Path $projectRoot '.launcher-publish'

$absoluteRelease = [IO.Path]::GetFullPath($releaseDirectory)
if ([IO.Path]::GetDirectoryName($absoluteRelease) -ne [IO.Path]::GetFullPath($projectRoot) -or
    [IO.Path]::GetFileName($absoluteRelease) -ne 'release') {
    throw "Unsafe release directory: $absoluteRelease"
}
if (Test-Path -LiteralPath $absoluteRelease) {
    Remove-Item -LiteralPath $absoluteRelease -Recurse -Force
}

$absoluteStaging = [IO.Path]::GetFullPath($launcherStaging)
if ([IO.Path]::GetDirectoryName($absoluteStaging) -ne [IO.Path]::GetFullPath($projectRoot) -or
    [IO.Path]::GetFileName($absoluteStaging) -ne '.launcher-publish') {
    throw "Unsafe launcher staging directory: $absoluteStaging"
}
if (Test-Path -LiteralPath $absoluteStaging) {
    Remove-Item -LiteralPath $absoluteStaging -Recurse -Force
}

$screensaverPayload = Join-Path $releaseDirectory 'Transformers_SCR'

dotnet restore $solution
dotnet build $solution -c Release --no-restore
dotnet publish $project -c Release -r win-x64 --self-contained true --no-restore -o $screensaverPayload
dotnet publish $launcherProject -c Release -r win-x64 --self-contained true --no-restore -o $launcherStaging

$executable = Join-Path $screensaverPayload 'TransformersScreen.exe'
$screensaver = Join-Path $screensaverPayload 'Transformers.scr'
$launcher = Join-Path $launcherStaging 'Transformers.exe'
if (-not (Test-Path -LiteralPath $executable)) {
    throw "Publish output missing: $executable"
}
if (-not (Test-Path -LiteralPath $launcher)) {
    throw "Launcher publish output missing: $launcher"
}

Copy-Item -LiteralPath $launcher -Destination $screensaver -Force
$installScript = @'
@echo off
setlocal EnableExtensions

rem --- 1. Admin-Rechte pruefen ---
"%SystemRoot%\System32\fltmc.exe" >nul 2>&1
if errorlevel 1 (
  echo Administratorrechte werden angefordert...
  set "ARGS=%*"
  if "%*"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  ) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
  )
  exit /b
)

echo Beende laufende Bildschirmschoner-Prozesse...
powershell -Command "Get-Process -Name 'Transformers','TransformersScreen','F4rbfieberTransformersScreen' -ErrorAction SilentlyContinue | Stop-Process -Force"
sc stop F4rbfieberTransformersScreen >nul 2>&1
rem Veraltete Dienste frueherer Builds entfernen, damit das Ziel sauber aktualisiert werden kann.
sc stop R0F4rbfieberTransformersScreen >nul 2>&1
sc delete R0F4rbfieberTransformersScreen >nul 2>&1
timeout /t 2 /nobreak >nul

rem --- 2. Quelle definieren ---
set "SOURCE_DIR=%~dp0Transformers_SCR"
set "TARGET_DIR=%SystemRoot%\Transformers_SCR"
set "TARGET_SCR=%SystemRoot%\System32\Transformers.scr"
set "LEGACY_DIR=%SystemRoot%\F4rbfieberTransformers_SCR"
set "LEGACY_SCR=%SystemRoot%\System32\F4rbfieberTransformersScreen.scr"

rem --- 3. Quelldatei pruefen ---
if not exist "%SOURCE_DIR%\TransformersScreen.exe" (
  echo.
  echo FEHLER: Quelldatei nicht gefunden!
  echo Erwarteter Pfad: "%SOURCE_DIR%\TransformersScreen.exe"
  echo Bitte starte das Skript direkt aus dem Release-Ordner.
  pause
  exit /b 3
)

if not exist "%SOURCE_DIR%\Transformers.scr" (
  echo FEHLER: Transformers.scr fehlt im Quellordner.
  pause
  exit /b 3
)

rem --- 4. Zielordner erstellen ---
echo.
echo Installiere Transformers nach "%TARGET_DIR%"...
if exist "%LEGACY_SCR%" del /f /q "%LEGACY_SCR%"
if exist "%LEGACY_DIR%" rmdir /s /q "%LEGACY_DIR%"
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"
if exist "%TARGET_DIR%" (
  echo FEHLER: Der bestehende Zielordner "%TARGET_DIR%" konnte nicht vollstaendig bereinigt werden.
  echo Bitte laufende Transformers-Prozesse beenden und die Installation erneut starten.
  pause
  exit /b 4
)
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
if errorlevel 1 (
  echo FEHLER: Der Zielordner "%TARGET_DIR%" konnte nicht erstellt werden.
  pause
  exit /b 4
)

rem --- 5. Dateien kopieren ---
"%SystemRoot%\System32\robocopy.exe" "%SOURCE_DIR%" "%TARGET_DIR%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP /XF "*.sys" >nul
if errorlevel 8 (
  echo FEHLER: Dateien konnten nicht kopiert werden. Robocopy Code: %ERRORLEVEL%
  pause
  exit /b 5
)

rem --- 6. Ueberpruefen EXE ---
if not exist "%TARGET_DIR%\TransformersScreen.exe" (
  echo FEHLER: Installation fehlgeschlagen. "%TARGET_DIR%\TransformersScreen.exe" fehlt.
  pause
  exit /b 7
)

rem --- 7. SCR kopieren und ueberpruefen ---
copy /Y "%SOURCE_DIR%\Transformers.scr" "%TARGET_SCR%" >nul
if errorlevel 1 (
  echo FEHLER: Transformers.scr konnte nicht nach System32 kopiert werden.
  pause
  exit /b 6
)

if not exist "%TARGET_SCR%" (
  echo FEHLER: "%TARGET_SCR%" wurde nach dem Kopieren nicht gefunden.
  pause
  exit /b 7
)

rem --- Erfolgreich ---
echo.
echo Transformers wurde erfolgreich installiert!
echo - Payload: %TARGET_DIR%
echo - Screensaver: %TARGET_SCR%
echo.

if /I "%~1"=="/NOOPEN" goto :done
choice /M "Windows-Bildschirmschonereinstellungen jetzt oeffnen"
if errorlevel 2 goto :done
control.exe desk.cpl,,@screensaver

:done
exit /b 0
'@
Set-Content -Path (Join-Path $releaseDirectory 'Install-Screensaver.bat') -Value $installScript -Encoding Ascii

$uninstallScript = @'
@echo off
setlocal EnableExtensions

rem --- 1. Admin-Rechte pruefen ---
"%SystemRoot%\System32\fltmc.exe" >nul 2>&1
if errorlevel 1 (
  echo Administratorrechte werden angefordert...
  set "ARGS=%*"
  if "%*"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  ) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
  )
  exit /b
)

echo Beende laufende Bildschirmschoner-Prozesse...
powershell -Command "Get-Process -Name 'Transformers','TransformersScreen','F4rbfieberTransformersScreen' -ErrorAction SilentlyContinue | Stop-Process -Force"
sc stop F4rbfieberTransformersScreen >nul 2>&1
sc stop R0F4rbfieberTransformersScreen >nul 2>&1
sc delete R0F4rbfieberTransformersScreen >nul 2>&1
timeout /t 2 /nobreak >nul

rem --- 2. Dateien entfernen ---
set "TARGET_DIR=%SystemRoot%\Transformers_SCR"
set "TARGET_SCR=%SystemRoot%\System32\Transformers.scr"
set "LEGACY_DIR=%SystemRoot%\F4rbfieberTransformers_SCR"
set "LEGACY_SCR=%SystemRoot%\System32\F4rbfieberTransformersScreen.scr"

echo.
echo Entferne Transformers...

if exist "%TARGET_SCR%" (
  del /f /q "%TARGET_SCR%"
  echo - %TARGET_SCR% geloescht.
)

if exist "%TARGET_DIR%" (
  rmdir /s /q "%TARGET_DIR%"
  if exist "%TARGET_DIR%" (
    echo FEHLER: %TARGET_DIR% konnte nicht vollstaendig entfernt werden.
    exit /b 5
  )
  echo - %TARGET_DIR% geloescht.
)

if exist "%LEGACY_SCR%" del /f /q "%LEGACY_SCR%"
if exist "%LEGACY_DIR%" rmdir /s /q "%LEGACY_DIR%"

echo.
echo Deinstallation abgeschlossen.
echo.

if /I "%~1"=="/NOOPEN" goto :done
choice /M "Windows-Bildschirmschonereinstellungen jetzt oeffnen"
if errorlevel 2 goto :done
control.exe desk.cpl,,@screensaver

:done
exit /b 0
'@
Set-Content -Path (Join-Path $releaseDirectory 'Uninstall-Screensaver.bat') -Value $uninstallScript -Encoding Ascii
Remove-Item -LiteralPath $absoluteStaging -Recurse -Force

# Clean up unnecessary files from payload
Remove-Item -Path (Join-Path $screensaverPayload "*.pdb") -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $screensaverPayload "*.xml") -Force -ErrorAction SilentlyContinue

$requiredFiles = @(
    $screensaver,
    $executable,
    (Join-Path $releaseDirectory 'Install-Screensaver.bat'),
    (Join-Path $releaseDirectory 'Uninstall-Screensaver.bat'),
    (Join-Path $screensaverPayload 'Web\index.html'),
    (Join-Path $screensaverPayload 'Web\assets\cybertron-command-deck.jpg'),
    (Join-Path $screensaverPayload 'Web\assets\dinobot-emblem.png'),
    (Join-Path $screensaverPayload 'Web\assets\autobot-emblem.png'),
    (Join-Path $screensaverPayload 'Web\assets\decepticon-emblem.png'),
    (Join-Path $screensaverPayload 'Web\assets\fonts\transformers-movie.ttf'),
    (Join-Path $screensaverPayload 'Web\assets\fonts\optimus.ttf'),
    (Join-Path $screensaverPayload 'Web\assets\fonts\optimus-bold.ttf'),
    (Join-Path $screensaverPayload 'Web\assets\fonts\ancient-autobot.ttf'),
    (Join-Path $screensaverPayload 'Web\js\profiles.js')
)
$profileIds = @('grimlock', 'hound', 'optimus', 'bumblebee', 'ironhide', 'jazz', 'megatron', 'shockwave', 'soundwave')
$profileAssetNames = @('comic-robot.png', 'comic-alt.png', 'film-robot.png', 'film-alt.png')
foreach ($profileId in $profileIds) {
    foreach ($assetName in $profileAssetNames) {
        $requiredFiles += Join-Path $screensaverPayload "Web\assets\transformers\$profileId\$assetName"
    }
}
foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $requiredFile)) {
        throw "Release file missing: $requiredFile"
    }
}
$scrFileCount = (Get-ChildItem -LiteralPath $screensaverPayload -Recurse -File).Count
Write-Host "Release ready in: $absoluteRelease ($scrFileCount payload files)" -ForegroundColor Cyan
