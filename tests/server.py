"""Serveur de test ephemere : aucune lecture des donnees du compte systeme."""

from pathlib import Path
import tempfile

import uvicorn

from companion.admin import create_app


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="companion-web-test-") as directory:
        uvicorn.run(create_app(Path(directory) / "data"), host="127.0.0.1", port=8001, access_log=False)