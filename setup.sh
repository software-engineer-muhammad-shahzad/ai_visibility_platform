#!/usr/bin/env bash
# One-shot setup for macOS/Linux/Git Bash:  ./setup.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "== Backend =="
cd backend
[ -d .venv ] || python3 -m venv .venv
PY=.venv/bin/python; [ -x "$PY" ] || PY=.venv/Scripts/python.exe   # Git Bash on Windows
"$PY" -m pip install -q -r requirements.txt
[ -f .env ] || { cp .env.example .env; echo "Created backend/.env - set GEMINI_API_KEY in it."; }
FLASK_APP=run.py "$PY" -m flask db upgrade
cd ..

echo "== Frontend =="
cd frontend && npm install && cd ..

echo
echo "Done. Start the app in two terminals:"
echo "  1) cd backend && source .venv/bin/activate && python run.py"
echo "  2) cd frontend && npm start    -> http://localhost:4200"
