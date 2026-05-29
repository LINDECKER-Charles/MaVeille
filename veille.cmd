@echo off
setlocal

set "WEB_DIR=%~dp0web"

if not exist "%WEB_DIR%\package.json" (
    echo [ERREUR] Dossier web introuvable : "%WEB_DIR%"
    exit /b 1
)

cd /d "%WEB_DIR%"

if not exist "node_modules" (
    echo [INFO] Installation des dependances...
    call npm install || exit /b 1
)

echo [INFO] Lancement du front ^(vite dev^)...
call npm run dev -- --open

endlocal
