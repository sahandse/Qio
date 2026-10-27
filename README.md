# Qio

A living notch for the top edge of your Windows screen. Qio shows what's playing with
synced lyrics, a Pomodoro timer, a water reminder, a file shelf and a to-do list — then
quietly gets out of the way when you are not looking.

Windows 10 (1809+) and Windows 11, 64-bit. Electron + Vite + React + TypeScript, no
native modules.

## Features

- **Notch window** — frameless, transparent, always on top, pinned to the top centre of
  the screen. It sits collapsed until you hover it, expands to the active panel, and
  collapses again when you move away. `Minimal notch` turns the collapsed state into a
  thin line for laptops with a thick top bezel.
- **Now playing** — anything that appears in the Windows media overlay (Spotify, Apple
  Music, browsers, Windows Media Player): artwork, title/artist, play/pause, next,
  previous and seek, driven by SMTC.
- **Synced lyrics** — fetched from [LRCLIB](https://lrclib.net); each line lights up as
  it is sung and clicking a line jumps to that point in the song.
- **Focus timer** — Pomodoro work/short/long rounds with a soft chime when a round ends;
  the countdown stays visible in the collapsed notch.
- **Water reminder** — bottle size, daily goal and reminder hours, a per-day chart, and a
  nudge when a reminder is due.
- **File shelf** — drag files onto the notch to keep them close, drag them back out into
  a chat or folder. Qio stores the paths, never copies the files.
- **To-do** — tasks with an optional due time; the notch nudges you when one is due.
- **Overlays** — volume, brightness, Caps Lock and keyboard-layout changes show a small
  pill under the notch; battery, charging and headphone events raise a nudge.
- **Mascot** — when the PC has been quiet, the clock fades and a pair of eyes appears,
  dozes off, and waves hello when you come back.
- **Tray + settings** — start with Windows, mascot, minimal notch, lyrics and the
  reminder/focus timings, all reachable from the tray icon.

Everything is stored locally (a JSON file in the app data folder). No accounts, no
analytics; the only network calls are to LRCLIB for lyrics.

## Development

```bash
npm install
npm run dev        # electron-vite dev with hot reload
npm run typecheck  # tsc over the node and web projects
```

`QIO_SELFCHECK=1 npm run dev` prints one line of runtime state (media, volume, battery)
to the console — a quick smoke test that the Windows bridge is connected.

## Build

```bash
npm run icons      # regenerate resources/*.png from the script in scripts/
npm run dist       # electron-vite build + electron-builder --win (NSIS installer)
```

The installer lands in `release/`. Building a Windows installer must run on Windows.

## How it is put together

```
src/main/       Electron main: notch/overlay windows, tray, store, nudges, IPC
src/main/bridge.ts
                Spawns resources/bridge/qio-bridge.ps1 (one long-lived PowerShell
                process) and talks to it over a local TCP socket with newline-delimited
                JSON. The bridge is what knows Windows: SMTC media transport and
                metadata, core audio volume, brightness, Caps Lock, keyboard layout,
                battery and charging.
src/preload/    contextBridge API exposed to the renderer
src/renderer/   React UI: the notch bar and its panels, plus the overlay pill window
src/shared/     Types shared by all three processes
```

The bridge script is shipped as a resource (`resources/bridge` → `bridge/` next to the
app), so it is read from disk at runtime rather than bundled into `out/`.

## License

MIT
