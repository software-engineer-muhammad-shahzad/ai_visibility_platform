# One-shot setup for Windows PowerShell:  .\setup.ps1
# Creates the backend venv, installs dependencies, prepares .env, applies migrations and installs frontend packages.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Backend ==" -ForegroundColor Cyan
Set-Location backend
if (-not (Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -q -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "Created backend\.env - set GEMINI_API_KEY in it." -ForegroundColor Yellow }
$env:FLASK_APP = "run.py"
.\.venv\Scripts\flask.exe db upgrade
Set-Location ..

Write-Host "== Frontend ==" -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..

Write-Host "`nDone. Start the app in two terminals:" -ForegroundColor Green
Write-Host "  1) cd backend; .venv\Scripts\Activate.ps1; python run.py"
Write-Host "  2) cd frontend; npm start      -> http://localhost:4200"
