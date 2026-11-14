$taskName = "CFDI Local Agent"

$dataDir = Join-Path $env:LOCALAPPDATA "CFDI Local Agent"
$stopFile = Join-Path $dataDir "stop.flag"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

Set-Content -Path $stopFile -Value "stop"

# Dar tiempo al supervisor para detener Node.js
Start-Sleep -Seconds 6

try {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
} catch {}

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}