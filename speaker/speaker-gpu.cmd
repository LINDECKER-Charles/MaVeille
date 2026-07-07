@echo off
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Docker introuvable. Installe Docker Desktop + NVIDIA Container Toolkit.
    exit /b 1
)

set "WHEEL=vendor\torch-2.8.0+cu128-cp310-cp310-manylinux_2_28_x86_64.whl"

REM Le wheel torch cu128 (kernels sm_120 / Blackwell) est gitignore car volumineux (~900 Mo).
REM On le telecharge depuis download.pytorch.org s'il manque (le CDN R2 de PyTorch est bloque
REM par certains reseaux, mais download.pytorch.org sert le wheel en direct).
if not exist "%WHEEL%" (
    echo [INFO] Wheel torch cu128 absent : telechargement ^(~900 Mo^)...
    if not exist vendor mkdir vendor
    curl -L --fail -o "%WHEEL%" "https://download.pytorch.org/whl/cu128/torch-2.8.0%%2Bcu128-cp310-cp310-manylinux_2_28_x86_64.whl"
    if errorlevel 1 (
        echo [ERREUR] Echec du telechargement du wheel torch cu128.
        exit /b 1
    )
)

echo [INFO] Demarrage GPU ^(NVIDIA^) - image Kokoro custom torch cu128 ^(Blackwell / sm_120^).
echo [INFO] Premier build : install des libs CUDA 12.8 ^(~5 Go^) + torch cu128, patiente.
echo [INFO] Si le GPU echoue, bascule sur speaker.cmd ^(CPU^).
echo [INFO] UI : http://localhost:8830

start "" http://localhost:8830

docker compose -f docker-compose.gpu.yml up --build
if errorlevel 1 (
    echo [ERREUR] Echec du demarrage GPU. Bascule sur speaker.cmd ^(CPU^).
    exit /b 1
)

endlocal
