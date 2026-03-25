import os
import subprocess
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = BACKEND_DIR / "migrations"


def _run_flask_db_command(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, "-m", "flask", "--app", "run.py", "db", *args]
    return subprocess.run(
        cmd,
        cwd=BACKEND_DIR,
        check=check,
        capture_output=True,
        text=True,
    )


def main() -> int:
    # Ensure migration repository exists once, then create migration and upgrade.
    if not MIGRATIONS_DIR.exists():
        init_result = _run_flask_db_command(["init"])
        if init_result.stdout:
            print(init_result.stdout.strip())

    message = os.getenv("MIGRATION_MESSAGE", "auto migration")
    migrate_result = _run_flask_db_command(["migrate", "-m", message], check=False)
    migrate_output = (migrate_result.stdout or "") + (migrate_result.stderr or "")

    if migrate_result.returncode != 0 and "No changes in schema detected" not in migrate_output:
        print(migrate_output.strip())
        return migrate_result.returncode

    if migrate_output.strip():
        print(migrate_output.strip())

    upgrade_result = _run_flask_db_command(["upgrade"])
    if upgrade_result.stdout:
        print(upgrade_result.stdout.strip())

    print("Database migrations completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
