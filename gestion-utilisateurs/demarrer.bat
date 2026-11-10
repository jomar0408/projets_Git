@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM ===== Configuration MySQL (a adapter si besoin) =====
set DB_USER=root
set DB_PASSWORD=
set PORT=3001

echo.
echo === 1/3 Installation des dependances ===
if not exist node_modules (
  call npm install
  if errorlevel 1 goto erreur
) else (
  echo Deja installees.
)

echo.
echo === 2/3 Creation de la base MySQL ===
node init-db.js
if errorlevel 1 goto erreur

echo.
echo === 3/3 Demarrage de l'application ===
start "" http://localhost:%PORT%
node server.js
goto fin

:erreur
echo.
echo Une erreur s'est produite. Lis le message ci-dessus.

:fin
pause
