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
