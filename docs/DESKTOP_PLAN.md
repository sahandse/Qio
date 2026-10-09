# Qio — Windows & macOS development plan

## Scope
Qio is a Persian RTL desktop AI coding companion for **Windows 10/11 and macOS only**. Android is explicitly postponed. The goal is the compact, interactive notch/desktop UX inspired by Coucou plus evidence-based agent monitoring inspired by dotpals. Qio's branding and mascot are original.

## Platform support
- Windows: frameless always-on-top top-edge companion, small/expanded modes, tray controls and multi-monitor settings; installer targets MSI and NSIS EXE.
- macOS: top-edge/notch-aware placement, expanded details, tray/menu bar, permissions as required; installer targets DMG.
- Both: reduced-motion support, Persian UI, dark/light themes, optional sounds, user-consent-based agent approvals.

## Milestones
1. **Baseline:** Make existing Tauri 2 shell compile; build CI on both Windows and macOS; icon and bundler configurations.
2. **Native island:** Compact frameless always-on-top companion with draggable position, click-through only on noninteractive regions, and expand/collapse.
3. **Mascot:** Original Qio face with blink, gaze tracking, idle breathing, think, work, alert, success and error states; pause/reduce motion setting.
4. **Real agent integrations:** Codex and Claude Code first, then Gemini CLI and OpenCode; event capability detection, no fake status.
5. **Evidence dashboard:** Track diffs, commands, test exit codes and output summaries, and identify untested edits. Mark "verified", "failed", "unclear" and "not tested" accurately.
6. **Permissions:** Show native actionable approvals only when provider supports a secure, authenticated integration. No arbitrary command execution via UI.
7. **Release:** Test on target OS, build signed Windows and macOS packages where signing identity is available, and publish GitHub Releases.

## Upstream acknowledgements
- Coucou: https://github.com/Louis-CFM/coucou — source MIT; original name, Mochi mascot and sounds are not reused.
- dotpals: https://github.com/Rikinshah787/dotpals — MIT; maintain applicable copyright notices if code is ported.
