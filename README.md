# Transformers Screensaver

Ein eigenständiger Windows-Bildschirmschoner im Cybertron-/Transformers-Stil. Die Transformer dienen ausschließlich als holografisches Theme; die Hauptinhalte sind echte Windows- und Hardwaredaten.

## Funktionen

- Echte Telemetrie für CPU, CPU-Kerne, GPU, Temperaturen, VRAM, RAM, Netzwerk, Datenträger und aktive Prozesse
- Hostname, Windows-Version, Datum, Uhrzeit und System-Uptime
- Vier datengetriebene Profile mit bot-naher Farbwelt und Fraktionslogo:
  - Optimus Prime — Autobot — Roboter / Truck
  - Bumblebee — Autobot — Roboter / Sportwagen
  - Grimlock — Autobot — Roboter / T-Rex
  - Megatron — Decepticon — Roboter / Cybertron-Panzer
- Sanfter automatischer Wechsel zwischen Roboter- und Alt-Mode
- Wahlweise ein fester Transformer oder automatischer Durchlauf aller Profile
- Optionales Rainbow-Farbprofil für HUD-Linien und Hologrammlicht
- Monitorziel: nur Monitor 1, 2 oder 3 sowie alle Monitore; nicht ausgewählte Anzeigen bleiben schwarz
- Windows-Screensaver-Modi `/s`, `/c` und `/p`
- Primär- und Multi-Monitor-Betrieb
- Selbstständiger Settings-Speicher unter `%LOCALAPPDATA%\TransformersScreen`
- Eigenständiger Installer, Payload-Ordner und `.scr`-Launcher

## Projektstruktur

- `src/F4rbfieberTransformersScreen` — WPF-Host, Telemetrie und WebView2-HUD
- `src/F4rbfieberTransformersScreen.Launcher` — schlanker `.scr`-Launcher
- `src/F4rbfieberTransformersScreen/Web/js/profiles.js` — zentrale Profile und Farbschemata
- `build-release.ps1` — reproduzierbarer Release-/Installer-Build

Neue Transformer werden ausschließlich als weiteres Profil in `profiles.js`, als Auswahl in der Konfiguration und mit zwei Bildassets ergänzt.

## Starten und bauen

```powershell
dotnet run --project .\src\F4rbfieberTransformersScreen\F4rbfieberTransformersScreen.csproj
```

```powershell
.\build-release.ps1
```

Der Release-Build erzeugt `release\Transformers_SCR`, `Install-Screensaver.bat` und `Uninstall-Screensaver.bat`. Windows zeigt den Bildschirmschoner als `Transformers.scr` an.

## Bildquellen

Die Cybertron-Umgebung, Hologramme und Embleme wurden speziell für dieses eigenständige Projekt generiert. Die UI, Werte und Bedienelemente sind code-native und keine statische Screenshot-Oberfläche.
