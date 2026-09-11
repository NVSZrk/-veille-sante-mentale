@echo off
cd /d "%~dp0"
echo ============================================
echo   Partager le site publiquement
echo ============================================
echo.

if not exist cloudflared.exe (
    echo ERREUR : cloudflared.exe est introuvable dans ce dossier.
    echo.
    echo Telechargez-le d'abord depuis :
    echo https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo.
    echo Renommez le fichier telecharge en "cloudflared.exe" et placez-le
    echo dans ce meme dossier, puis relancez ce script.
    start "" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    pause
    exit /b
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js n'est pas installe. Installez-le d'abord depuis nodejs.org
    pause
    exit /b
)

if not exist node_modules\dotenv (
    echo Installation des composants necessaires, patientez...
    call npm install
)

if not exist .env (
    copy .env.example .env >nul
)

if not exist data (
    mkdir data
)

if not exist data\articles.json (
    call node seed-demo.js
)

echo.
echo Demarrage du site en arriere-plan...
start "Site - ne pas fermer" cmd /k npm start

echo Attente du demarrage du site...
timeout /t 4 /nobreak >nul

echo.
echo ============================================
echo   Creation du lien public, patientez...
echo   Le lien apparaitra ci-dessous (ligne
echo   commencant par https://... .trycloudflare.com)
echo   NE FERMEZ PAS cette fenetre : le lien
echo   cesse de fonctionner si vous la fermez.
echo ============================================
echo.

cloudflared.exe tunnel --url http://localhost:3000

pause
