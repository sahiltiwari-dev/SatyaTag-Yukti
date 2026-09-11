"""Test configuration.

The app reads backend/.env so pytest can simply be run from backend/.
Tests that need a database use the configured local PostgreSQL instance.
"""
import os
import sys

# Ensure `app` is importable when pytest runs from the backend/ directory.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)