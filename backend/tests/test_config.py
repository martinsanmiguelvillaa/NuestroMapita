import pytest
from pydantic import ValidationError

from app.config import Settings


def test_settings_rejects_placeholder_password(monkeypatch):
    monkeypatch.setenv("APP_PASSWORD", "cambiar_esto")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-characters")

    with pytest.raises(ValidationError):
        Settings()


def test_settings_rejects_short_secret_key(monkeypatch):
    monkeypatch.setenv("APP_PASSWORD", "test-password")
    monkeypatch.setenv("SECRET_KEY", "too-short")

    with pytest.raises(ValidationError):
        Settings()
