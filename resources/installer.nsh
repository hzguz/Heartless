; Custom NSIS hooks.
;
; Purpose: register Heartless as an *available* handler for .md/.markdown/.txt
; without seizing the default. electron-builder's built-in fileAssociations
; macro (APP_ASSOCIATE) writes the default verb directly:
;
;   WriteRegStr SHELL_CONTEXT "Software\Classes\.md" "" "<ProgId>"
;
; which silently steals the extension — a .txt would stop opening in Notepad
; with no prompt. Windows' supported way to offer an app without taking over is
; OpenWithProgids, which is what populates the "Open with" menu and lets the
; user promote it to default themselves.
;
; Registered under HKCU (SHELL_CONTEXT is HKCU for a per-user install), so no
; elevation is required and uninstalling only affects this user.

!macro registerProgId EXT PROGID DESCRIPTION
  ; The ProgId describes how to launch us for this file type.
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}" "" "${DESCRIPTION}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\DefaultIcon" "" "$appExe,0"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\shell\open" "" "Open with ${PRODUCT_NAME}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${PROGID}\shell\open\command" "" '"$appExe" "%1"'

  ; Advertise it for the extension WITHOUT touching the default value.
  WriteRegStr SHELL_CONTEXT "Software\Classes\${EXT}\OpenWithProgids" "${PROGID}" ""
!macroend

!macro unregisterProgId EXT PROGID
  DeleteRegValue SHELL_CONTEXT "Software\Classes\${EXT}\OpenWithProgids" "${PROGID}"
  DeleteRegKey SHELL_CONTEXT "Software\Classes\${PROGID}"
!macroend

!macro customInstall
  !insertmacro registerProgId ".md"       "Heartless.md"       "Markdown Document"
  !insertmacro registerProgId ".markdown" "Heartless.markdown" "Markdown Document"
  !insertmacro registerProgId ".txt"      "Heartless.txt"      "Text Document"

  ; Tell the shell the associations changed so "Open with" updates without a
  ; sign-out (SHCNE_ASSOCCHANGED).
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  !insertmacro unregisterProgId ".md"       "Heartless.md"
  !insertmacro unregisterProgId ".markdown" "Heartless.markdown"
  !insertmacro unregisterProgId ".txt"      "Heartless.txt"

  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
