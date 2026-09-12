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
