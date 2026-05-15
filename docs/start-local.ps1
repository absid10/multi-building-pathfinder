$root = "c:\Users\razvi\Downloads\multi-building-pathfinder-main\multi-building-pathfinder-main"

# Backend terminal
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  @"
cd '$root\backend'
if (-not (Test-Path .venv)) { python -m venv .venv }
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\migrate_db.py
python scripts\import_map_seed.py
python run.py
"@
)

# Frontend terminal
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  @"
cd '$root\frontend'
npm install
`$env:VITE_API_BASE_URL='http://localhost:5000'
npm run dev
"@
)