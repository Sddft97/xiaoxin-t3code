!macro customHeader
  BrandingText "${APP_DESCRIPTION}"
!macroend

!macro customInstall
  WriteRegStr HKCU "Software\Classes\t3code" "" "URL:t3code"
  WriteRegStr HKCU "Software\Classes\t3code" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\t3code\shell\open\command" "" '$\"$appExe$\" $\"%1$\"'

  ; An upgrade keeps existing shortcuts, so recreate the Start Menu link if it went missing.
  !ifndef DO_NOT_CREATE_START_MENU_SHORTCUT
    ${IfNot} ${FileExists} "$newStartMenuLink"
      !insertmacro createMenuDirectory
      CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
    ${EndIf}
  !endif
!macroend

!macro customUnInstall
  ${IfNot} ${isUpdated}
    ReadRegStr $0 HKCU "Software\Classes\t3code\shell\open\command" ""
    ${If} $0 == '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" $\"%1$\"'
      DeleteRegKey HKCU "Software\Classes\t3code"
    ${EndIf}
  ${EndIf}
!macroend
