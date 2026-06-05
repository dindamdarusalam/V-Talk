import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

db_file = Path(__file__).parent / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{db_file.as_posix()}"
os.environ["DEFAULT_USER_EMAIL"] = "tester@vtalk.example.com"
os.environ["DEFAULT_USER_PASSWORD"] = "testpass123"

from app.db.session import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client
