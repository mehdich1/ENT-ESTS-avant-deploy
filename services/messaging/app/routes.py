from fastapi import APIRouter, Depends, HTTPException, Query
from app.rabbitmq_publisher import publish_notification
from app.database import get_session
from app.auth import get_current_user
from app.models import MessageCreate
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/messages", tags=["Messaging"], redirect_slashes=False)


@router.post("")
async def send_message(message: MessageCreate, current_user=Depends(get_current_user)):
    session = get_session()
    try:
        message_id = uuid.uuid4()
        sender_id = uuid.UUID(current_user["sub"])
        receiver_id = uuid.UUID(message.receiver_id)
        now = datetime.now(timezone.utc)
        session.execute("""
            INSERT INTO messages (id, sender_id, receiver_id, content, sent_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (message_id, sender_id, receiver_id, message.content, now))
        publish_notification("new_message", {
            "sender_id": str(sender_id),
            "receiver_id": str(receiver_id),
            "sender_username": current_user.get("preferred_username", ""),
            "content_preview": message.content[:50]
        })
        return {"id": str(message_id), "sender_id": str(sender_id),
                "receiver_id": str(receiver_id), "content": message.content, "sent_at": str(now)}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/inbox")
async def get_inbox(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=50),
                    current_user=Depends(get_current_user)):
    session = get_session()
    try:
        receiver_id = uuid.UUID(current_user["sub"])
        rows = list(session.execute(
            "SELECT * FROM messages WHERE receiver_id = %s ALLOW FILTERING", (receiver_id,)
        ))
        rows.sort(key=lambda x: x.sent_at, reverse=True)
        total = len(rows)
        paginated = rows[(page-1)*size: page*size]
        return {"total": total, "page": page, "size": size,
                "pages": (total+size-1)//size if total > 0 else 0,
                "items": [{"id": str(r.id), "sender_id": str(r.sender_id),
                           "receiver_id": str(r.receiver_id), "content": r.content,
                           "sent_at": str(r.sent_at)} for r in paginated]}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/sent")
async def get_sent(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=50),
                   current_user=Depends(get_current_user)):
    session = get_session()
    try:
        sender_id = uuid.UUID(current_user["sub"])
        rows = list(session.execute(
            "SELECT * FROM messages WHERE sender_id = %s ALLOW FILTERING", (sender_id,)
        ))
        rows.sort(key=lambda x: x.sent_at, reverse=True)
        total = len(rows)
        paginated = rows[(page-1)*size: page*size]
        return {"total": total, "page": page, "size": size,
                "pages": (total+size-1)//size if total > 0 else 0,
                "items": [{"id": str(r.id), "sender_id": str(r.sender_id),
                           "receiver_id": str(r.receiver_id), "content": r.content,
                           "sent_at": str(r.sent_at)} for r in paginated]}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/{message_id}")
async def delete_message(message_id: str, current_user=Depends(get_current_user)):
    """Chaque utilisateur peut supprimer ses propres messages"""
    session = get_session()
    try:
        row = session.execute(
            "SELECT * FROM messages WHERE id = %s ALLOW FILTERING",
            (uuid.UUID(message_id),)
        ).one()
    except Exception:
        raise HTTPException(404, "Message non trouvé")
    if not row:
        raise HTTPException(404, "Message non trouvé")
    roles = current_user.get("realm_access", {}).get("roles", [])
    user_id = current_user["sub"]
    # Admin peut tout supprimer, sinon seulement ses propres messages
    if "admin" not in roles and str(row.sender_id) != user_id and str(row.receiver_id) != user_id:
        raise HTTPException(403, "Accès refusé")
    session.execute("DELETE FROM messages WHERE id = %s", (uuid.UUID(message_id),))
    return {"message": "Message supprimé"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "messaging"}