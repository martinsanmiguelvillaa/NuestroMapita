from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.recipe import Recipe, RecipeComment
from app.schemas.recipe import (
    RecipeCreate,
    RecipeUpdate,
    RecipeResponse,
    RecipeCommentCreate,
    RecipeCommentResponse,
)
from app.services.cloudinary_service import upload_image, delete_image
from app.services.upload_validation import read_valid_image_upload

router = APIRouter(prefix="/recipes", tags=["Recetas"])


def _get_or_404(recipe_id: int, db: Session) -> Recipe:
    recipe = (
        db.query(Recipe)
        .options(selectinload(Recipe.comments))
        .filter(Recipe.id == recipe_id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return recipe


# ---------------------------------------------------------------------------
# CRUD Recetas
# ---------------------------------------------------------------------------

@router.get("", response_model=List[RecipeResponse])
def list_recipes(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    query = db.query(Recipe).options(selectinload(Recipe.comments))
    if category:
        query = query.filter(Recipe.category == category)
    if search:
        query = query.filter(Recipe.title.ilike(f"%{search}%"))
    return query.order_by(Recipe.created_at.desc()).all()


@router.post("", response_model=RecipeResponse, status_code=201)
def create_recipe(
    data: RecipeCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    recipe = Recipe(**data.model_dump())
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return _get_or_404(recipe.id, db)


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    return _get_or_404(recipe_id, db)


@router.put("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    recipe = _get_or_404(recipe_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    db.commit()
    return _get_or_404(recipe_id, db)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    recipe = _get_or_404(recipe_id, db)
    if recipe.image_public_id:
        try:
            delete_image(recipe.image_public_id)
        except Exception:
            pass
    db.delete(recipe)
    db.commit()


# ---------------------------------------------------------------------------
# Foto de la receta
# ---------------------------------------------------------------------------

@router.post("/{recipe_id}/photo", response_model=RecipeResponse)
async def upload_recipe_photo(
    recipe_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    """Sube o reemplaza la foto de portada de una receta."""
    recipe = _get_or_404(recipe_id, db)
    content = await read_valid_image_upload(file)
    old_public_id = recipe.image_public_id

    result = upload_image(content, folder="nuestro-mapita/recetas")
    recipe.image_url = result["url"]
    recipe.image_public_id = result["public_id"]

    try:
        db.commit()
    except Exception:
        db.rollback()
        try:
            delete_image(result["public_id"])
        except Exception:
            pass
        raise

    if old_public_id:
        try:
            delete_image(old_public_id)
        except Exception:
            pass

    return _get_or_404(recipe_id, db)


@router.delete("/{recipe_id}/photo", status_code=204)
def delete_recipe_photo(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    recipe = _get_or_404(recipe_id, db)
    if recipe.image_public_id:
        try:
            delete_image(recipe.image_public_id)
        except Exception:
            pass
    recipe.image_url = None
    recipe.image_public_id = None
    db.commit()


# ---------------------------------------------------------------------------
# Comentarios
# ---------------------------------------------------------------------------

@router.post("/{recipe_id}/comments", response_model=RecipeCommentResponse, status_code=201)
def add_comment(
    recipe_id: int,
    data: RecipeCommentCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    _get_or_404(recipe_id, db)  # verifica que la receta existe
    comment = RecipeComment(recipe_id=recipe_id, **data.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{recipe_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    recipe_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    comment = (
        db.query(RecipeComment)
        .filter(
            RecipeComment.id == comment_id,
            RecipeComment.recipe_id == recipe_id,
        )
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    db.delete(comment)
    db.commit()
