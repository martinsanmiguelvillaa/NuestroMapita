from fastapi import HTTPException, UploadFile


MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024
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

ALLOWED_VIDEO_CONTENT_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/avi",
    "video/x-msvideo",
    "video/mov",
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


def _looks_like_video(content: bytes) -> bool:
    # MP4 / MOV / QuickTime: bytes 4-8 = 'ftyp'
    if len(content) >= 12 and content[4:8] == b"ftyp":
        return True
    # WebM: EBML magic
    if content.startswith(b"\x1a\x45\xdf\xa3"):
        return True
    # AVI: RIFF....AVI
    if content.startswith(b"RIFF") and content[8:12] == b"AVI ":
        return True
    return False


async def _read_upload(file: UploadFile, max_bytes: int) -> bytes:
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
    return bytes(content)


def is_video(file: UploadFile) -> bool:
    return file.content_type in ALLOWED_VIDEO_CONTENT_TYPES


async def read_valid_media_upload(file: UploadFile) -> tuple[bytes, str]:
    """
    Lee y valida un archivo de imagen o video.
    Devuelve (contenido, resource_type) donde resource_type es 'image' o 'video'.
    """
    if file.content_type in ALLOWED_IMAGE_CONTENT_TYPES:
        data = await _read_upload(file, MAX_IMAGE_SIZE_BYTES)
        if not data or not _looks_like_image(data):
            raise HTTPException(status_code=400, detail=f"'{file.filename}' no parece ser una imagen válida")
        return data, "image"

    if file.content_type in ALLOWED_VIDEO_CONTENT_TYPES:
        data = await _read_upload(file, MAX_VIDEO_SIZE_BYTES)
        if not data or not _looks_like_video(data):
            raise HTTPException(status_code=400, detail=f"'{file.filename}' no parece ser un video válido")
        return data, "video"

    raise HTTPException(status_code=400, detail=f"'{file.filename}' no es una imagen ni video válido")


async def read_valid_image_upload(file: UploadFile, max_bytes: int = MAX_IMAGE_SIZE_BYTES) -> bytes:
    if file.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"'{file.filename}' no es una imagen válida")
    data = await _read_upload(file, max_bytes)
    if not data or not _looks_like_image(data):
        raise HTTPException(status_code=400, detail=f"'{file.filename}' no parece ser una imagen válida")
    return data
