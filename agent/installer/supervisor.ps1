
$ErrorActionPreference = "Stop"

# Directorios de instalación
$installDir = $PSScriptRoot
$appDir = Join-Path $installDir "app"
$nodeExe = Join-Path $installDir "runtime\node.exe"
$serverJs = Join-Path $appDir "dist\server.js"

# Archivo que permite detener el supervisor
$dataDir = Join-Path $env:LOCALAPPDATA "CFDI Local Agent"
$stopFile = Join-Path $dataDir "stop.flag"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# Validar archivos necesarios
if (!(Test-Path $nodeExe)) {
    exit 1
}

if (!(Test-Path $serverJs)) {
    exit 1
}

# Limpiar una señal de detención anterior al iniciar
if (Test-Path $stopFile) {
    Remove-Item $stopFile -Force
}

# Mantener el agente activo y reiniciarlo si falla
while ($true) {

    if (Test-Path $stopFile) {
        break
    }

    try {
        $process = Start-Process `
            -FilePath $nodeExe `
            -ArgumentList "`"$serverJs`"" `
            -WorkingDirectory $appDir `
            -WindowStyle Hidden `
            -PassThru

        while (!$process.HasExited) {

            if (Test-Path $stopFile) {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                break
            }

            Start-Sleep -Seconds 2
            $process.Refresh()
        }

        if (Test-Path $stopFile) {
            break
        }

    } catch {
        # Si el agente falla al arrancar, intentar nuevamente
    }

    Start-Sleep -Seconds 5
}
