import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.auth import _failed_attempts


client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_failed_attempts():
    _failed_attempts.clear()
    yield
    _failed_attempts.clear()


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_rejects_wrong_password():
    response = client.post("/auth/login", json={"password": "wrong"})

    assert response.status_code == 401


def test_login_returns_token_for_valid_password():
    response = client.post("/auth/login", json={"password": "test-password"})

    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["token_type"] == "bearer"


def test_protected_route_requires_token():
    response = client.get("/places/visited")

    assert response.status_code == 401


def test_login_rate_limits_repeated_failures():
    for _ in range(5):
        response = client.post("/auth/login", json={"password": "wrong"})
        assert response.status_code == 401

    response = client.post("/auth/login", json={"password": "wrong"})

    assert response.status_code == 429
