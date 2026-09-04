"""Make the backend modules importable from the tests.

Without this, `from sources import ...` only resolves when pytest is
invoked from inside backend/, which is easy to get wrong and gives a
confusing ImportError rather than a useful failure.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
