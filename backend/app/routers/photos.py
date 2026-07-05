import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File

logger = logging.getLogger(__name__)
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.letter import Letter
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.place_trip import PlaceTrip
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
    trips = db.query(func.count(PlaceTrip.id)).scalar()
    return {"visited": visited, "wishlist": wishlist, "letters": letters, "trips": trips}


@router.get("/photos/recent")
def get_recent_photos(
    limit: int = Query(16, ge=1, le=50),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Devuelve las fotos más recientes (de lugares visitados + sueltas) para la galería del home."""
    from sqlalchemy import or_

    photos = (
        db.query(Photo)
        .options(joinedload(Photo.place_visited))
        .filter(
            or_(
                Photo.place_visited_id.isnot(None),
                # Fotos sueltas: sin ningún FK asociado
                (Photo.place_visited_id.is_(None)
                 & Photo.place_wishlist_id.is_(None)
                 & Photo.place_trip_id.is_(None)),
            )
        )
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
            "is_loose": p.place_visited_id is None and p.place_wishlist_id is None and p.place_trip_id is None,
        }
        for p in photos
    ]


@router.post("/photos/loose", response_model=List[PhotoResponse], status_code=201)
async def upload_loose_photos(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Sube fotos sueltas a la galería (sin asociar a ningún lugar)."""
    if not files:
        raise HTTPException(status_code=400, detail="Tenés que subir al menos una imagen")
    if len(files) > MAX_PLACE_PHOTOS_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Podés subir hasta {MAX_PLACE_PHOTOS_PER_REQUEST} fotos por vez",
        )

    media_contents = []
    for file in files:
        media_contents.append(await read_valid_media_upload(file))

    created = []
    uploaded = []
    try:
        for content, resource_type in media_contents:
            if resource_type == "video":
                result = upload_video(content, folder="nuestro-mapita/galeria")
            else:
                result = upload_image(content, folder="nuestro-mapita/galeria")
            uploaded.append((result["public_id"], resource_type))

            photo = Photo(
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
            except Exception as e:
                logger.warning("No se pudo eliminar media de Cloudinary en rollback: public_id=%s error=%s", public_id, e)
        raise

    for p in created:
        db.refresh(p)
    return created


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
            except Exception as e:
                logger.warning("No se pudo eliminar media de Cloudinary en rollback: public_id=%s error=%s", public_id, e)
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
            except Exception as e:
                logger.warning("No se pudo eliminar media de Cloudinary en rollback: public_id=%s error=%s", public_id, e)
        raise

    for p in created:
        db.refresh(p)
    return created


@router.post("/trips/{trip_id}/photos", response_model=List[PhotoResponse], status_code=201)
async def upload_trip_photos(
    trip_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Sube fotos a un viajecito."""
    if not files:
        raise HTTPException(status_code=400, detail="Tenés que subir al menos una imagen")
    if len(files) > MAX_PLACE_PHOTOS_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Podés subir hasta {MAX_PLACE_PHOTOS_PER_REQUEST} fotos por vez",
        )

    trip = db.query(PlaceTrip).filter(PlaceTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viajecito no encontrado")

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
                place_trip_id=trip_id,
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
            except Exception as e:
                logger.warning("No se pudo eliminar media de Cloudinary en rollback: public_id=%s error=%s", public_id, e)
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
    elif photo.place_wishlist_id:
        siblings = db.query(Photo).filter(
            Photo.place_wishlist_id == photo.place_wishlist_id,
            Photo.id != photo_id,
        ).order_by(Photo.sort_order, Photo.created_at).all()
    elif photo.place_trip_id:
        siblings = db.query(Photo).filter(
            Photo.place_trip_id == photo.place_trip_id,
            Photo.id != photo_id,
        ).order_by(Photo.sort_order, Photo.created_at).all()
    else:
        raise HTTPException(status_code=400, detail="Foto no asociada a ningún lugar")

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
