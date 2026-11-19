#!/usr/bin/env python3
"""Start the SkyMesh Scout dashboard from the component directory."""
from pathlib import Path
from runpy import run_path

if __name__ == "__main__":
    run_path(str(Path(__file__).resolve().parent / "server" / "server.py"), run_name="__main__")
