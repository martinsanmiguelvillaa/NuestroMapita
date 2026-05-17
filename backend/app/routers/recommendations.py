from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.cine import CineItem
from app.models.recommendation import BlockedRecommendation, RecommendationHistory
from app.schemas.recommendation import (
    BlockedCreate,
    BlockedResponse,
    RecommendationHistoryResponse,
    RecommendationRequest,
)
from app.services.openai_service import generate_recommendations
from app.services.tmdb_service import search as tmdb_search

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def _item_to_dict(item: CineItem) -> dict:
    return {
        "title": item.title,
        "genres": item.genres or [],
        "rating": item.rating,
        "type": item.type,
    }


@router.post("/generate")
def generate(
    req: RecommendationRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY no configurada")

    watched = db.query(CineItem).filter(CineItem.status == "watched").all()
    favorites = db.query(CineItem).filter(CineItem.is_favorite == True).all()  # noqa: E712
    watchlist = db.query(CineItem).filter(CineItem.status == "to_watch").all()
    blocked = db.query(BlockedRecommendation).all()

    blocked_titles = [b.title for b in blocked]

    try:
        result = generate_recommendations(
            api_key=settings.OPENAI_API_KEY,
            watched=[_item_to_dict(i) for i in watched],
            favorites=[_item_to_dict(i) for i in favorites],
            watchlist=[_item_to_dict(i) for i in watchlist],
            blocked_titles=blocked_titles,
            req_type=req.type,
            moods=req.moods,
            extra_text=req.extra_text,
            include_watchlist=req.include_watchlist,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando recomendación: {exc}") from exc

    # Enrich with TMDB posters if API key is available
    if settings.TMDB_API_KEY:
        all_recs = [result["main"]] + result.get("similar", [])
        for rec in all_recs:
            try:
                tmdb_type = "movie" if rec.get("type") == "movie" else "series"
                hits = tmdb_search(rec["title"], settings.TMDB_API_KEY)
                # Pick the first result that matches the type
                match = next(
                    (h for h in hits if h["type"] == tmdb_type),
                    hits[0] if hits else None,
                )
                if match and match.get("poster_url"):
                    rec["poster_url"] = match["poster_url"]
            except Exception:
                pass  # poster is optional, never fail the whole request

    # Purge history older than 30 days
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    db.query(RecommendationHistory).filter(RecommendationHistory.created_at < cutoff).delete()

    # Persist to history
    entry = RecommendationHistory(
        request_type=req.type,
        request_moods=req.moods,
        request_extra=req.extra_text,
        main_title=result["main"].get("title", ""),
        recommendations=result,
    )
    db.add(entry)
    db.commit()

    return result


@router.get("/history", response_model=list[RecommendationHistoryResponse])
def get_history(
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    rows = (
        db.query(RecommendationHistory)
        .order_by(RecommendationHistory.created_at.desc())
        .limit(10)
        .all()
    )
    return rows


# ── Blocked ────────────────────────────────────────────────────────────────


@router.get("/blocked", response_model=list[BlockedResponse])
def list_blocked(
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    return db.query(BlockedRecommendation).order_by(BlockedRecommendation.created_at.desc()).all()


@router.post("/blocked", response_model=BlockedResponse, status_code=201)
def block_title(
    body: BlockedCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    # Avoid duplicates
    existing = db.query(BlockedRecommendation).filter(
        BlockedRecommendation.title == body.title
    ).first()
    if existing:
        return existing

    row = BlockedRecommendation(title=body.title)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/blocked/{blocked_id}", status_code=204)
def unblock_title(
    blocked_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_user),
):
    row = db.get(BlockedRecommendation, blocked_id)
    if not row:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(row)
    db.commit()
