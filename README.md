# Transformers Screensaver

![Transformers Screensaver](docs/transformers-screen.png)

A standalone Windows screensaver in a Cybertron / Transformers style. The Transformers serve exclusively as a holographic theme; the main content consists of real Windows and hardware telemetry data.

## Features

- Real telemetry for CPU, CPU Cores, GPU, Temperatures, VRAM, RAM, Network, Disks, and active processes
- Hostname (Custom Name), Windows Version, Date, Time, and System Uptime
- Nine data-driven profiles with individual, readable HUD palettes and correct faction logos:
  - Grimlock, Hound, Optimus Prime, Bumblebee, Ironhide, Jazz, Megatron, Shockwave, and Soundwave
- A global Comic / Film selector loads one dedicated robot or Alt-Mode PNG per Transformer and style
- The selected Comic / Film style is persisted in the Windows settings and can also be switched directly in the HUD
- Transformer Movie and Optimus fonts are bundled for display headings and decorative labels; telemetry values keep readable system fonts
- Exactly two random alert types: Energon Alert and Decepticons Angriff
- Grimlock displays the Dinobot emblem, Autobots display the Autobot emblem, and Decepticons display the Decepticon emblem
- Smooth automatic transitions between Robot and Alt-Mode
- Choose a fixed Transformer or loop through individually enabled profiles
- Select cycle profiles individually; at least one profile always stays active
- Faster startup through a persistent WebView2 profile, deferred hardware-sensor initialization, and no hidden HUD startup on blank monitors
- Target monitor selection: Display on Monitor 1, 2, or 3, or all monitors; unselected displays remain black
- Supports Windows Screensaver modes `/s`, `/c`, and `/p`
- Primary and multi-monitor support
- Independent settings storage located at `%LOCALAPPDATA%\TransformersScreen`
- Standalone installer, payload folder, and `.scr` launcher

## Project Structure

- `src/F4rbfieberTransformersScreen` — WPF host, telemetry, and WebView2 HUD
- `src/F4rbfieberTransformersScreen.Launcher` — Lightweight `.scr` launcher
- `src/F4rbfieberTransformersScreen/Web/js/profiles.js` — Central profiles and color schemes
- `build-release.ps1` — Reproducible release / installer build

New Transformers can be added as another profile in `profiles.js`, as a selection in the configuration window, and with four transparent PNG assets: Comic Robot, Comic Alt-Mode, Film Robot, and Film Alt-Mode.

## Running and Building

```powershell
dotnet run --project .\src\F4rbfieberTransformersScreen\F4rbfieberTransformersScreen.csproj
```

```powershell
.\build-release.ps1
```

The release build generates `release\Transformers_SCR`, `Install-Screensaver.bat`, and `Uninstall-Screensaver.bat`. Windows displays the screensaver as `Transformers.scr`.

## Image Sources

The Transformer profile sheets and fonts are supplied project assets. The UI, values, and control elements are code-native and not a static screenshot interface.
