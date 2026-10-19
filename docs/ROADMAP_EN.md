# Qio Roadmap

This roadmap distinguishes implementation from verified tests. A service shown in the UI is not necessarily connected.

## Phase 1 — Character experience
- [x] Original voxel character with expressive states
- [x] Reduced-motion control and keyboard access
- [x] Small, normal, and large character sizes
- [x] Dark, light, emerald, and violet themes

## Phase 2 — Agent integrations
- [x] Cursor hooks with settings preservation and backup
- [x] Claude Code and Qoder setup scripts
- [x] Cursor and Qoder hook-configuration detection without claiming a live connection
- [x] Direct Claude/Anthropic chat using the native Messages API format
- [ ] Tested adapters for additional agents
- [ ] Compatibility checks across tool versions

## Phase 3 — Persian and English
- [x] RTL/LTR direction and language switcher
- [x] Main controls, dashboard filters, and Claude API guide translations
- [ ] Complete translation of every guide and status message
- [ ] UI tests for both languages and window sizes

## Phase 4 — Activity dashboard
- [x] Local hook events and session-history display
- [x] Clear local hook history independently
- [x] Test evidence with freshness limitations shown
- [x] Search and filter history by agent
- [ ] Live status only when backed by verifiable signals

## Phase 5 — Documentation and releases
- [x] Updated README and English setup guide
- [x] Bug report and feature request templates
- [x] DMG build workflow for Intel and Apple Silicon
- [x] Windows installer checksums and separate macOS checksum files
- [ ] Real screenshots and GIF captured from a running build
- [ ] macOS code signing and notarization

## Phase 6 — Privacy and future improvements
- [x] Notifications can be enabled/disabled and the preference is persisted
- [x] Local metadata logging can be disabled; old history is cleared separately
- [ ] More character customization
- [ ] Resource-use and performance checks on Windows and macOS
