from fastapi import HTTPException, UploadFile


MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_PLACE_PHOTOS_PER_REQUEST = 10

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp",
}

CHUNK_SIZE = 1024 * 1024


def _looks_like_image(content: bytes) -> bool:
    if content.startswith(b"\xff\xd8\xff"):
        return True
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if content.startswith((b"GIF87a", b"GIF89a")):
        return True
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return True
    if len(content) >= 12 and content[4:8] == b"ftyp" and content[8:12] in {
        b"heic",
        b"heix",
        b"hevc",
        b"hevx",
        b"mif1",
        b"msf1",
    }:
        return True
    return False


async def read_valid_image_upload(file: UploadFile, max_bytes: int = MAX_IMAGE_SIZE_BYTES) -> bytes:
    if file.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"'{file.filename}' no es una imagen válida")

    content = bytearray()
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"'{file.filename}' supera el límite de {max_bytes // (1024 * 1024)} MB",
            )

    data = bytes(content)
    if not data or not _looks_like_image(data):
        raise HTTPException(status_code=400, detail=f"'{file.filename}' no parece ser una imagen válida")

    return data
