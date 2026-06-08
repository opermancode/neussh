!macro customInit
  ; Check if NeuSSH is already running
  FindWindow $0 "NeuSSH" ""
  StrCmp $0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "NeuSSH is currently running. Please close it before continuing."
    Abort
!macroend

!macro customInstall
  ; Create NeuSSH config directory
  CreateDirectory "$APPDATA\neussh"
  
  ; Write uninstall information
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NeuSSH" "DisplayName" "NeuSSH"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NeuSSH" "Publisher" "NeuSSH Team"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NeuSSH" "URLInfoAbout" "https://github.com/neussh/neussh"
!macroend
