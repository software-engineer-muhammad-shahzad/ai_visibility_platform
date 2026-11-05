# Backend (Flask)

Full setup for both backend and frontend lives in the [root README](../README.md).

Quick start:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
$env:FLASK_APP = "run.py"
flask db upgrade
python run.py
```

API: http://localhost:5000/api/v1 · health check: `GET /api/v1/health` · tests: `python -m pytest`
