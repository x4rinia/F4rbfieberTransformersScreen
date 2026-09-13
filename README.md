# Transformers Screensaver

Ein eigenständiger Windows-Bildschirmschoner im Cybertron-Stil. Transformer-Hologramme verbinden sich mit echten System- und PC-Daten zu einem animierten HUD.

![Transformers Screensaver mit Optimus Prime und Vorschau-Daten](docs/transformers-screen-demo.png)

> Der Screenshot zeigt die integrierten Vorschau-/Fake-Daten. Im installierten Bildschirmschoner werden auf Wunsch die Telemetriedaten des eigenen Windows-PCs angezeigt.

## Features

- Comic-only Darstellung mit lokalen Roboter- und Alt-Form-Assets
- Roboterform und Alt-Form für jeden Transformer
- Automatischer Wechsel zwischen Roboter- und Alt-Form
- Festes Transformer-Profil oder automatischer Profilwechsel
- Individuelle, zum Transformer passende HUD-Farben
- Eingebundene Cybertron-Schriften für Überschriften und Design-Akzente
- Energon Alert und Decepticons Angriff
- Echte Daten für CPU, GPU, Temperaturen, RAM, Netzwerk, Datenträger und Prozesse
- Uhrzeit, Datum, Windows-Version, Hostname und Systemlaufzeit
- Auswahl des Zielmonitors und Unterstützung mehrerer Monitore
- Lokale Assets und offline lauffähige Oberfläche
- Unterstützung der Windows-Bildschirmschonermodi `/s`, `/c` und `/p`

## Transformer

- Optimus Prime
- Bumblebee
- Grimlock
- Hound
- Megatron
- Shockwave
- Ironhide
- Jazz
- Soundwave

## Installation

1. Die aktuelle ZIP unter [Releases](https://github.com/x4rinia/Transformers_Screensaver/releases) herunterladen und vollständig entpacken.
2. `Install-Screensaver.bat` als Administrator ausführen.
3. Den Bildschirmschoner anschließend in den Windows-Bildschirmschonereinstellungen auswählen und konfigurieren.

Zum Entfernen dient `Uninstall-Screensaver.bat`.

## Selbst bauen

Voraussetzungen sind Windows 10 oder 11 und das .NET 8 SDK.

```powershell
dotnet build
```

```powershell
powershell -ExecutionPolicy Bypass -File .\build-release.ps1
```

Das Release-Skript erstellt den vollständigen Windows-Payload, `Transformers.scr` sowie Installations- und Deinstallationsskript im lokalen `release`-Ordner.
