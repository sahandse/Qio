; Uninstall hooks for the NSIS installer.
;
; The app stages qio-hook.exe into %LOCALAPPDATA%\Qio\bin at launch, so the
; installer never recorded it and the default uninstaller leaves it behind. The
; inbox and the log live in the same place and are ours too.

!macro NSIS_HOOK_PREUNINSTALL
  RMDir /r "$LOCALAPPDATA\Qio\bin"
  RMDir /r "$LOCALAPPDATA\Qio\inbox"
  Delete "$LOCALAPPDATA\Qio\qio.log"
!macroend
