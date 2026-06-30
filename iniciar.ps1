# Pedro Baranda - Script de inicializacao
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=== Pedro Baranda ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica se Docker Desktop esta rodando
$dockerRunning = $false
try {
    docker info --format "{{.ServerVersion}}" 2>$null | Out-Null
    $dockerRunning = $LASTEXITCODE -eq 0
} catch {}

if (-not $dockerRunning) {
    Write-Host "Iniciando Docker Desktop..." -ForegroundColor Yellow

    $dockerDesktopPath = "$env:PROGRAMFILES\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerDesktopPath)) {
        $dockerDesktopPath = "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    }

    if (Test-Path $dockerDesktopPath) {
        Start-Process $dockerDesktopPath
    } else {
        Write-Host "Docker Desktop nao encontrado. Abra manualmente e rode o script novamente." -ForegroundColor Red
        exit 1
    }

    # Aguarda o Docker ficar pronto (ate 120 segundos)
    Write-Host "Aguardando Docker ficar pronto..." -ForegroundColor Yellow
    $timeout = 120
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        try {
            $result = docker info --format "{{.ServerVersion}}" 2>$null
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                break
            }
        } catch {}
        Write-Host "  Ainda aguardando... ($elapsed s)" -ForegroundColor DarkGray
    }

    if (-not $dockerRunning) {
        Write-Host "Docker nao respondeu em $timeout segundos. Tente novamente." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Docker pronto!" -ForegroundColor Green
Write-Host ""

# 2. Sobe os containers
Write-Host "Subindo os containers (backend, frontend, nginx)..." -ForegroundColor Cyan
Set-Location $projectPath
docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Erro ao subir os containers. Veja os logs com: docker compose logs" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Tudo no ar! ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost" -ForegroundColor White
Write-Host "  Backend:   http://localhost/api" -ForegroundColor White
Write-Host ""
Write-Host "Para ver os logs: docker compose logs -f" -ForegroundColor DarkGray
Write-Host "Para parar:       docker compose down" -ForegroundColor DarkGray
Write-Host ""
