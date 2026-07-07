@echo off
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Docker introuvable. Installe Docker Desktop.
    exit /b 1
)

echo [INFO] Demarrage Veille Speaker ^(Kokoro CPU^) - voix francaise ff_siwis.
echo [INFO] Mode CPU par defaut : compatible tout GPU, y compris RTX 50xx / Blackwell.
echo [INFO] Pour forcer le GPU ^(cartes supportees jusqu'a sm_90^) : speaker-gpu.cmd
echo [INFO] Premier lancement : telechargement du modele ^(~330 Mo^), patiente.
echo [INFO] UI : http://localhost:8830

start "" http://localhost:8830

docker compose -f docker-compose.cpu.yml up --build
if errorlevel 1 (
    echo [ERREUR] Echec du demarrage. Verifie Docker Desktop.
    exit /b 1
)

endlocal
