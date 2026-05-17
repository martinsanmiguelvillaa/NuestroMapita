from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.models.push_subscription import PushSubscription
from app.config import settings

router = APIRouter(prefix="/push", tags=["Push"])


class SubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.get("/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=201)
def subscribe(req: SubscribeRequest, db: Session = Depends(get_db), _: bool = Depends(get_current_user)):
    existing = db.query(PushSubscription).filter_by(endpoint=req.endpoint).first()
    if existing:
        return {"status": "already_subscribed"}
    sub = PushSubscription(endpoint=req.endpoint, p256dh=req.p256dh, auth=req.auth)
    db.add(sub)
    db.commit()
    return {"status": "subscribed"}


@router.post("/unsubscribe")
def unsubscribe(req: SubscribeRequest, db: Session = Depends(get_db), _: bool = Depends(get_current_user)):
    db.query(PushSubscription).filter_by(endpoint=req.endpoint).delete()
    db.commit()
    return {"status": "unsubscribed"}
