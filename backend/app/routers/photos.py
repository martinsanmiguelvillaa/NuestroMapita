import json
import re
import urllib.request
import urllib.parse
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response as RawResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.letter import Letter
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse, PhotoPositionUpdate
from app.services.cloudinary_service import upload_image, upload_video, delete_media
from app.services.upload_validation import MAX_PLACE_PHOTOS_PER_REQUEST, read_valid_media_upload

router = APIRouter(tags=["Fotos"])


@router.get("/photos/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Conteo rápido de lugares visitados, por visitar y cartitas."""
    visited = db.query(func.count(PlaceVisited.id)).scalar()
    wishlist = db.query(func.count(PlaceWishlist.id)).scalar()
    letters = db.query(func.count(Letter.id)).scalar()
    return {"visited": visited, "wishlist": wishlist, "letters": letters}


@router.get("/photos/recent")
def get_recent_photos(
    limit: int = Query(16, ge=1, le=50),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve las fotos más recientes de lugares visitados para la galería del home."""
    photos = (
        db.query(Photo)
        .options(joinedload(Photo.place_visited))
        .filter(Photo.place_visited_id.isnot(None))
        .order_by(Photo.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "cloudinary_url": p.cloudinary_url,
            "resource_type": p.resource_type,
            "position_x": p.position_x,
            "position_y": p.position_y,
            "place_name": p.place_visited.name if p.place_visited else "",
        }
        for p in photos
    ]


@router.post("/places/visited/{place_id}/photos", response_model=List[PhotoResponse], status_code=201)
async def upload_photos(
    place_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """
    Sube una o varias fotos a Cloudinary y las asocia al lugar visitado.
    Recibe multipart/form-data con campo 'files'.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Tenés que subir al menos una imagen")
    if len(files) > MAX_PLACE_PHOTOS_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Podés subir hasta {MAX_PLACE_PHOTOS_PER_REQUEST} fotos por vez",
        )

    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    media_contents = []
    for file in files:
        media_contents.append(await read_valid_media_upload(file))

    created = []
    uploaded = []  # list of (public_id, resource_type)
    try:
        for content, resource_type in media_contents:
            if resource_type == "video":
                result = upload_video(content, folder="nuestro-mapita/lugares")
            else:
                result = upload_image(content, folder="nuestro-mapita/lugares")
            uploaded.append((result["public_id"], resource_type))

            photo = Photo(
                place_visited_id=place_id,
                cloudinary_url=result["url"],
                cloudinary_public_id=result["public_id"],
                resource_type=resource_type,
            )
            db.add(photo)
            db.flush()
            created.append(photo)

        db.commit()
    except Exception:
        db.rollback()
        for public_id, rtype in uploaded:
            try:
                delete_media(public_id, resource_type=rtype)
            except Exception:
                pass
        raise

    for p in created:
        db.refresh(p)

    return created


@router.post("/places/wishlist/{place_id}/photos", response_model=List[PhotoResponse], status_code=201)
async def upload_wishlist_photos(
    place_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Sube fotos a un lugar por visitar."""
    if not files:
        raise HTTPException(status_code=400, detail="Tenés que subir al menos una imagen")
    if len(files) > MAX_PLACE_PHOTOS_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Podés subir hasta {MAX_PLACE_PHOTOS_PER_REQUEST} fotos por vez",
        )

    place = db.query(PlaceWishlist).filter(PlaceWishlist.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    media_contents = []
    for file in files:
        media_contents.append(await read_valid_media_upload(file))

    created = []
    uploaded = []
    try:
        for content, resource_type in media_contents:
            if resource_type == "video":
                result = upload_video(content, folder="nuestro-mapita/lugares")
            else:
                result = upload_image(content, folder="nuestro-mapita/lugares")
            uploaded.append((result["public_id"], resource_type))
            photo = Photo(
                place_wishlist_id=place_id,
                cloudinary_url=result["url"],
                cloudinary_public_id=result["public_id"],
                resource_type=resource_type,
            )
            db.add(photo)
            db.flush()
            created.append(photo)
        db.commit()
    except Exception:
        db.rollback()
        for public_id, rtype in uploaded:
            try:
                delete_media(public_id, resource_type=rtype)
            except Exception:
                pass
        raise

    for p in created:
        db.refresh(p)
    return created


@router.patch("/photos/{photo_id}/set-cover", status_code=200)
def set_cover_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Establece esta foto como portada (sort_order=0) y reordena las demás."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")

    # Obtener todas las fotos del mismo lugar
    if photo.place_visited_id:
        siblings = db.query(Photo).filter(
            Photo.place_visited_id == photo.place_visited_id,
            Photo.id != photo_id,
        ).order_by(Photo.sort_order, Photo.created_at).all()
    else:
        siblings = db.query(Photo).filter(
            Photo.place_wishlist_id == photo.place_wishlist_id,
            Photo.id != photo_id,
        ).order_by(Photo.sort_order, Photo.created_at).all()

    photo.sort_order = 0
    for i, sibling in enumerate(siblings):
        sibling.sort_order = i + 1

    db.commit()
    return {"ok": True}


@router.patch("/photos/{photo_id}/position", status_code=200)
def update_photo_position(
    photo_id: int,
    data: PhotoPositionUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Guarda el punto focal (object-position) de una foto."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    photo.position_x = max(0, min(100, data.x))
    photo.position_y = max(0, min(100, data.y))
    db.commit()
    return {"ok": True}


@router.delete("/photos/{photo_id}", status_code=204)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elimina una foto de la base de datos y de Cloudinary."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")

    # Borrar de Cloudinary primero
    try:
        delete_media(photo.cloudinary_public_id, resource_type=photo.resource_type)
    except Exception:
        pass  # Si falla en Cloudinary, seguimos y borramos de la BD de todas formas

    db.delete(photo)
    db.commit()


# ---------------------------------------------------------------------------
# Thumbnail proxy — para Share Target (evita CORS al descargar desde el front)
# ---------------------------------------------------------------------------

_ALLOWED_THUMBNAIL_DOMAINS = (
    'img.youtube.com',
    'i.ytimg.com',
    'tiktokcdn.com',
    'cdninstagram.com',
    'fbcdn.net',
)


def _extract_youtube_id(url: str):
    m = re.search(
        r'(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([a-zA-Z0-9_-]{11})',
        url,
    )
    return m.group(1) if m else None


def _oembed_thumbnail(oembed_url: str):
    try:
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            return json.loads(resp.read()).get('thumbnail_url')
    except Exception:
        return None


@router.get('/utils/thumbnail')
def proxy_thumbnail(
    url: str = Query(...),
    _: bool = Depends(get_current_user),
):
    """Descarga y proxea la thumbnail de un link de YouTube, TikTok o Instagram."""
    thumbnail_url = None

    yt_id = _extract_youtube_id(url)
    if yt_id:
        thumbnail_url = f'https://img.youtube.com/vi/{yt_id}/hqdefault.jpg'
    elif re.search(r'tiktok\.com', url, re.I):
        thumbnail_url = _oembed_thumbnail(
            f'https://www.tiktok.com/oembed?url={urllib.parse.quote(url, safe="")}'
        )
    elif re.search(r'instagram\.com|fb\.watch', url, re.I):
        thumbnail_url = _oembed_thumbnail(
            f'https://api.instagram.com/oembed/?url={urllib.parse.quote(url, safe="")}'
        )

    if not thumbnail_url:
        raise HTTPException(status_code=404, detail='No se encontró thumbnail para esta URL')

    parsed = urllib.parse.urlparse(thumbnail_url)
    if not any(parsed.netloc.endswith(d) for d in _ALLOWED_THUMBNAIL_DOMAINS):
        raise HTTPException(status_code=400, detail='Dominio de thumbnail no permitido')

    try:
        req = urllib.request.Request(thumbnail_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            content_type = resp.headers.get('Content-Type', 'image/jpeg').split(';')[0]
        return RawResponse(content=content, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=502, detail='No se pudo descargar el thumbnail')
