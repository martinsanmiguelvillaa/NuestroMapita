from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse, PhotoPositionUpdate
from app.services.cloudinary_service import upload_image, upload_video, delete_media
from app.services.upload_validation import MAX_PLACE_PHOTOS_PER_REQUEST, read_valid_media_upload

router = APIRouter(tags=["Fotos"])


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
