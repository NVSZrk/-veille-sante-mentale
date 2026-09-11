@echo off
cd /d "%~dp0"
echo ============================================
echo   Veille - Sante mentale au travail
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js n'est pas installe sur cet ordinateur.
    echo Ouverture de la page de telechargement...
    start "" https://nodejs.org/fr/download
    echo Une fois Node.js installe, relancez ce fichier.
    pause
    exit /b
)

if not exist node_modules\dotenv (
    echo Installation des composants necessaires, patientez...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Une erreur est survenue pendant l'installation.
        pause
        exit /b
    )
)

if not exist .env (
    copy .env.example .env >nul
)

if not exist data (
    mkdir data
)

if not exist data\veille.db (
    echo Premier lancement : ajout d'articles de demonstration...
    call node seed-demo.js
)

echo.
echo Demarrage du site...
start "" http://localhost:3000
call npm start

pause
