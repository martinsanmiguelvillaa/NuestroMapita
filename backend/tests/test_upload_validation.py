import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers, UploadFile

from app.services.upload_validation import MAX_IMAGE_SIZE_BYTES, read_valid_image_upload


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def make_upload(content: bytes, content_type: str, filename: str = "foto.png") -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


def test_accepts_valid_png_upload():
    upload = make_upload(PNG_BYTES, "image/png")

    content = asyncio.run(read_valid_image_upload(upload))

    assert content == PNG_BYTES


def test_rejects_non_image_content_type():
    upload = make_upload(PNG_BYTES, "text/plain", "foto.txt")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(read_valid_image_upload(upload))

    assert exc.value.status_code == 400


def test_rejects_fake_image_payload():
    upload = make_upload(b"not really an image", "image/png")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(read_valid_image_upload(upload))

    assert exc.value.status_code == 400


def test_rejects_oversized_image():
    upload = make_upload(PNG_BYTES + b"x" * MAX_IMAGE_SIZE_BYTES, "image/png")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(read_valid_image_upload(upload))

    assert exc.value.status_code == 413
