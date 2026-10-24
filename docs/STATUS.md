# Qio — implementation status

## Implemented in source
- Tauri 2 floating desktop companion with original voxel character, expressive states, reduced-motion control, themes, and character scaling.
- Persian/English direction switching, plus search and agent filters for local activity history.
- Persian (فارسی) as a full interface language: `src/i18n/fa.json` carries every string of the Mac's catalog and of `extra.json`, in the webview, the hub pages and the Rust tray, notifications and errors.
- Local metadata-only hooks and setup scripts for Cursor, Claude Code, and Qoder. The UI distinguishes hook configuration from actual activity.
- Direct API chat with OpenAI-compatible providers and a native Anthropic Messages API path for Claude.
- Optional notifications and a persistent local setting to pause new hook-event logging. Existing history remains until explicitly cleared.
- Windows release workflow creates EXE/MSI installers and SHA256 checksums.
- macOS workflow builds DMGs for Intel and Apple Silicon and can attach them to a release after the Windows release workflow succeeds.

## Release and verification
- Latest published release: v0.5.2 (Windows NSIS + MSI, checksums, GitHub Release assets).
- The source version moves with each release; treat a version as published only when its GitHub Release carries the installers.
- macOS builds are currently unsigned and not notarized unless a release explicitly states otherwise.
- CI must pass tests, frontend build, Rust compilation, and packaging before the new release is considered ready.

## Not yet complete or independently verified
- A manual pass of the Persian interface on a physical Windows device, at the island's several sizes.
- Tested adapters for every listed coding agent and compatibility across their versions.
- macOS code signing and notarization.
- Resource-use/performance checks and manual installation validation on physical Windows and macOS devices.

## Security / accuracy rules
- Never equate a discovered session file or configured hook with a running agent.
- Never label tests as passed without actual test-run output or verified exit status for the correct repository revision.
- No auto-approval or remote arbitrary command execution.
- API keys are read from environment variables; never commit them or include them in screenshots.
- Hook logging stores limited metadata only; the local settings control can pause new event logging.

## Manual validation
1. Check the **Qio Windows Release**, **Qio desktop build**, and **Qio macOS Build** workflows in GitHub Actions.
2. On Windows, install the EXE/MSI and verify open, drag, resize, notifications, settings, and quit.
3. On macOS, install the correct architecture DMG and follow the macOS security prompts; the current build is not notarized.
4. Verify RTL/LTR, reduced motion, event search/filter, and local logging opt-out.
5. Test Cursor, Claude Code, and Qoder hooks with a low-risk task; verify only event metadata is recorded.
6. Confirm a new release has EXE, MSI, DMG files for both architectures, and checksum files before sharing the release link.
