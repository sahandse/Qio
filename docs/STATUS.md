# Qio — implementation status

## Implemented in source
- Persian RTL interface; original CSS mascot with seven motion states and reduced-motion option.
- Tauri 2 window with borderless always-on-top behavior, repositioning, dragging and compact/expanded dimensions.
- Windows and macOS build workflow that installs dependencies, generates app icons and attempts platform installers.
- Local Codex and Claude Code session-directory detection; recent session JSONL event **metadata** shown in Persian. No prompt, file content or shell command arguments are exposed.
- Frontend refresh every 15 seconds, with a clear distinction between detected history and live integrations.

## Not yet complete or independently verified
- Build and runtime have not been successfully verified on a Windows or macOS runner. Check GitHub Actions before distributing.
- Live agent protocol hooks, native permission approvals, per-command results, diff viewer and genuine automated test-outcome evidence.
- Tray/menu-bar integration, click-through empty regions, native notification support, custom sounds and auto-update.
- Code signing and notarization: require a valid signing identity and securely configured credentials.

## Security / accuracy rules
- Never equate a discovered session file with a running agent.
- Never label tests as passed without actual test-run output or verified exit status for the correct repository revision.
- No auto-approval or remote arbitrary command execution.
- Input files remain on the local computer.

## Manual validation
1. Check the **Qio desktop build** workflow under GitHub Actions for both Windows and macOS.
2. On each platform install the output artifact and confirm the frameless window can open, drag, resize and quit.
3. Verify CSS character moods, reduced motion and RTL text.
4. Start local Codex and Claude Code sessions and verify that only known JSONL metadata appear.
5. Test with missing or inaccessible home directories and with no agents installed.

## Acknowledgments
Inspired by https://github.com/Louis-CFM/coucou and https://github.com/Rikinshah787/dotpals. Qio uses original UI/mascot assets. Third-party source should be reused only with its applicable license notices.
