' Take Screenshot GUI for Windows
' Usage: cscript.exe take-screenshot.vbs "C:\path\to\video.mp4"
' Auto-installs context menu on first run

Option Explicit
Dim objShell, objFSO, strVideoPath, strTime, strScriptFolder, strCommand, intResult, strScriptPath, strLastInputFile, strLastInput

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the script folder and full path
strScriptFolder = objFSO.GetParentFolderName(WScript.ScriptFullName)
strScriptPath = WScript.ScriptFullName

' Read last input from file
strLastInputFile = objFSO.BuildPath(strScriptFolder, "take-screenshot-last-input.txt")
strLastInput = "60" ' Default value
If objFSO.FileExists(strLastInputFile) Then
  On Error Resume Next
  strLastInput = objFSO.OpenTextFile(strLastInputFile, 1).ReadAll()
  On Error GoTo 0
End If

' Check for --install flag
If WScript.Arguments.Count > 0 And WScript.Arguments(0) = "--install" Then
  Call InstallContextMenu()
  WScript.Quit 0
End If

' Get the video path from command line argument
If WScript.Arguments.Count = 0 Then
  MsgBox "No video file specified. Usage: cscript.exe take-screenshot.vbs ""C:\path\to\video.mp4""", vbExclamation, "Take Screenshot - Missing Argument"
  WScript.Quit 1
End If

strVideoPath = WScript.Arguments(0)

' Verify the video file exists
If Not objFSO.FileExists(strVideoPath) Then
  MsgBox "Video file not found: " & strVideoPath, vbExclamation, "Take Screenshot - File Not Found"
  WScript.Quit 1
End If

' Show input dialog for timing
strTime = InputBox("Please type the time in mmss or ss :" & vbNewLine & vbNewLine & "Examples:" & vbNewLine & "- '60' for 60 seconds" & vbNewLine & "- '0130' for 1 minute 30 seconds", "Take Screenshot", strLastInput)

' Check if user cancelled
If strTime = "" Then
  WScript.Quit 0
End If

' Build and execute the bun command
strCommand = "bun """ & strScriptFolder & "\take-screenshot.cli.js"" """ & strVideoPath & """ """ & strTime & """"

On Error Resume Next
intResult = objShell.Run(strCommand, 1, True)
On Error GoTo 0

' Check for errors
If intResult = 0 Then
  ' Screenshot taken successfully, exit silently
Else
  MsgBox "Error taking screenshot. Check the log file for details.", vbExclamation, "Take Screenshot - Error"
  WScript.Quit 1
End If

WScript.Quit 0

' Install context menu entries
Sub InstallContextMenu()
  Dim regCmd, videoExtensions, i, commandValue

  videoExtensions = Array(".!qb", ".avi", ".mkv", ".mp4", ".webm", ".wmv", "video")

  On Error Resume Next

  ' Disable Windows 11 fancy context menu (use legacy context menu instead)
  regCmd = "reg.exe add ""HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32"" /f /ve"
  objShell.Run regCmd, 0, True

  For i = 0 To UBound(videoExtensions)
    ' Escape the script path for command line
    commandValue = "cscript.exe """ & strScriptPath & """ ""%1"""

    ' Create shell entry
    regCmd = "reg add ""HKEY_LOCAL_MACHINE\SOFTWARE\Classes\SystemFileAssociations\" & videoExtensions(i) & "\shell\Take screenshot"" /d ""Take screenshot"" /f"
    objShell.Run regCmd, 0, True

    ' Set icon
    regCmd = "reg add ""HKEY_LOCAL_MACHINE\SOFTWARE\Classes\SystemFileAssociations\" & videoExtensions(i) & "\shell\Take screenshot"" /v icon /d ""%SystemRoot%\System32\shell32.dll,324"" /f"
    objShell.Run regCmd, 0, True

    ' Create command entry
    regCmd = "reg add ""HKEY_LOCAL_MACHINE\SOFTWARE\Classes\SystemFileAssociations\" & videoExtensions(i) & "\shell\Take screenshot\command"" /d """ & commandValue & """ /f"
    objShell.Run regCmd, 0, True
  Next

  On Error GoTo 0

  MsgBox "Context menu 'Take screenshot' has been installed successfully!" & vbNewLine & vbNewLine & "Windows has been configured to use the classic context menu." & vbNewLine & "Right-click any video file to use it.", vbInformation, "Installation Complete"
End Sub
