
#define MyAppName "CFDI Local Agent"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "CFDI Local"

[Setup]
AppId={{A82D65B1-7F39-4E13-9D22-5C8A7F6E104B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\CFDI Local Agent
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\runtime\node.exe
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
OutputDir=..\..\release
OutputBaseFilename=CFDI-Local-Agent-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Tasks]
Name: "autostart"; Description: "Iniciar CFDI Local Agent automáticamente al iniciar sesión en Windows"; Flags: checkedonce

[Files]
; Node.js portable
Source: "..\..\release\cfdi-local-agent\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs

; Aplicación y dependencias
Source: "..\..\release\cfdi-local-agent\app\*"; DestDir: "{app}\app"; Excludes: ".env"; Flags: ignoreversion recursesubdirs createallsubdirs

; Configuración inicial: no sobrescribir si ya existe
Source: "..\..\release\cfdi-local-agent\app\.env"; DestDir: "{app}\app"; Flags: onlyifdoesntexist

; Supervisor y scripts de administración
Source: "supervisor.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "register-task.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "unregister-task.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\register-task.ps1"""; Flags: runhidden waituntilterminated; Tasks: autostart

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\unregister-task.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "StopCFDILocalAgent"
