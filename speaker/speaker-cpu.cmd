@echo off
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Docker introuvable. Installe Docker Desktop.
    exit /b 1
)

echo [INFO] Demarrage Kokoro en mode CPU ^(voix identique, sans GPU^)...
echo [INFO] Utile si ton GPU n'est pas supporte par l'image GPU ^(ex. RTX 50xx / Blackwell^).
echo [INFO] UI : http://localhost:8830

start "" http://localhost:8830

docker compose -f docker-compose.cpu.yml up --build
if errorlevel 1 (
    echo [ERREUR] Echec du demarrage CPU.
    exit /b 1
)

endlocal
