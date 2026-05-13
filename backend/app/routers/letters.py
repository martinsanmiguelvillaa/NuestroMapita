from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.letter import Letter
from app.schemas.letter import LetterCreate, LetterUpdate, LetterResponse
from app.services.cloudinary_service import upload_image, delete_image

router = APIRouter(prefix="/letters", tags=["Cartitas"])


@router.get("/", response_model=List[LetterResponse])
def list_letters(
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    return db.query(Letter).order_by(Letter.created_at.desc()).all()


@router.post("/", response_model=LetterResponse, status_code=201)
def create_letter(
    data: LetterCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    letter = Letter(**data.model_dump())
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return letter


@router.get("/{letter_id}", response_model=LetterResponse)
def get_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    letter = db.query(Letter).filter(Letter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cartita no encontrada")
    return letter


@router.put("/{letter_id}", response_model=LetterResponse)
def update_letter(
    letter_id: int,
    data: LetterUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    letter = db.query(Letter).filter(Letter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cartita no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(letter, field, value)
    db.commit()
    db.refresh(letter)
    return letter


@router.delete("/{letter_id}", status_code=204)
def delete_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    letter = db.query(Letter).filter(Letter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cartita no encontrada")
    # Borrar foto de Cloudinary si tiene
    if letter.photo_public_id:
        try:
            delete_image(letter.photo_public_id)
        except Exception:
            pass
    db.delete(letter)
    db.commit()


@router.post("/{letter_id}/photo", response_model=LetterResponse)
async def upload_letter_photo(
    letter_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Sube o reemplaza la foto de una cartita."""
    letter = db.query(Letter).filter(Letter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cartita no encontrada")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    # Si ya tenía foto, borrarla de Cloudinary
    if letter.photo_public_id:
        try:
            delete_image(letter.photo_public_id)
        except Exception:
            pass

    content = await file.read()
    result = upload_image(content, folder="nuestro-mapita/cartitas")
    letter.photo_url = result["url"]
    letter.photo_public_id = result["public_id"]
    db.commit()
    db.refresh(letter)
    return letter


@router.delete("/{letter_id}/photo", status_code=204)
def delete_letter_photo(
    letter_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Elimina la foto de una cartita."""
    letter = db.query(Letter).filter(Letter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cartita no encontrada")
    if letter.photo_public_id:
        try:
            delete_image(letter.photo_public_id)
        except Exception:
            pass
    letter.photo_url = None
    letter.photo_public_id = None
    db.commit()
