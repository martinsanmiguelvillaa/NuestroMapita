from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.place_wishlist import PlaceWishlist
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse
from app.services.cloudinary_service import upload_image, delete_image
from app.services.upload_validation import MAX_PLACE_PHOTOS_PER_REQUEST, read_valid_image_upload

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

    image_contents = []
    for file in files:
        image_contents.append(await read_valid_image_upload(file))

    created = []
    uploaded_public_ids = []
    try:
        for content in image_contents:
            result = upload_image(content, folder="nuestro-mapita/lugares")
            uploaded_public_ids.append(result["public_id"])

            photo = Photo(
                place_visited_id=place_id,
                cloudinary_url=result["url"],
                cloudinary_public_id=result["public_id"],
            )
            db.add(photo)
            db.flush()  # Obtener el ID sin hacer commit todavía
            created.append(photo)

        db.commit()
    except Exception:
        db.rollback()
        for public_id in uploaded_public_ids:
            try:
                delete_image(public_id)
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

    image_contents = []
    for file in files:
        image_contents.append(await read_valid_image_upload(file))

    created = []
    uploaded_public_ids = []
    try:
        for content in image_contents:
            result = upload_image(content, folder="nuestro-mapita/lugares")
            uploaded_public_ids.append(result["public_id"])
            photo = Photo(
                place_wishlist_id=place_id,
                cloudinary_url=result["url"],
                cloudinary_public_id=result["public_id"],
            )
            db.add(photo)
            db.flush()
            created.append(photo)
        db.commit()
    except Exception:
        db.rollback()
        for public_id in uploaded_public_ids:
            try:
                delete_image(public_id)
            except Exception:
                pass
        raise

    for p in created:
        db.refresh(p)
    return created


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
        delete_image(photo.cloudinary_public_id)
    except Exception:
        pass  # Si falla en Cloudinary, seguimos y borramos de la BD de todas formas

    db.delete(photo)
    db.commit()
