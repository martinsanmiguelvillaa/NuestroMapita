from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.place_visited import PlaceVisited
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse
from app.services.cloudinary_service import upload_image, delete_image

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
    place = db.query(PlaceVisited).filter(PlaceVisited.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Lugar no encontrado")

    created = []
    for file in files:
        # Validar que sea imagen
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"'{file.filename}' no es una imagen válida")

        content = await file.read()
        result = upload_image(content, folder="nuestro-mapita/lugares")

        photo = Photo(
            place_visited_id=place_id,
            cloudinary_url=result["url"],
            cloudinary_public_id=result["public_id"],
        )
        db.add(photo)
        db.flush()  # Obtener el ID sin hacer commit todavía
        created.append(photo)

    db.commit()
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
