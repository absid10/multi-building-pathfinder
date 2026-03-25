import os

from app import create_app
from app.extensions import db


app = create_app()


def _auto_init_db() -> None:
    auto_init = os.getenv("AUTO_INIT_DB", "true").lower() == "true"
    if not auto_init:
        return

    with app.app_context():
        db.create_all()


if __name__ == "__main__":
    _auto_init_db()
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
