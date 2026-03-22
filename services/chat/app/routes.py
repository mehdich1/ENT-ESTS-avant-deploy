from app.auth import get_current_user, get_user_from_token, require_role
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from app.database import get_session
from app.manager import ConnectionManager
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/chat", tags=["Chat"], redirect_slashes=False)
manager = ConnectionManager()

VALID_RESTRICTIONS = ["all", "enseignant", "etudiant", "admin"]


class RoomCreate(BaseModel):
    name: str
    description: str = ""
    restricted_to: str = "all"  # all | enseignant | etudiant | admin


def user_can_access_room(roles: list, restricted_to: str) -> bool:
    """Admin accède toujours à tout"""
    if "admin" in roles:
        return True
    if restricted_to == "all":
        return True
    if restricted_to == "enseignant" and "enseignant" in roles:
        return True
    if restricted_to == "etudiant" and "etudiant" in roles:
        return True
    return False


# ─── ROOMS ────────────────────────────────────────────────────────────────────

@router.get("/rooms")
async def list_rooms(current_user=Depends(get_current_user)):
    """Retourne uniquement les rooms accessibles à l'utilisateur"""
    session = get_session()
    roles = current_user.get("realm_access", {}).get("roles", [])
    try:
        rows = list(session.execute("SELECT * FROM chat_rooms"))
        rows.sort(key=lambda x: x.created_at if x.created_at else datetime.min)
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "description": r.description or "",
                "restricted_to": r.restricted_to or "all",
                "created_by": str(r.created_by) if r.created_by else "",
                "created_at": str(r.created_at)
            }
            for r in rows
            if user_can_access_room(roles, r.restricted_to or "all")
        ]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/rooms")
async def create_room(data: RoomCreate, current_user=Depends(require_role("admin"))):
    session = get_session()
    if data.restricted_to not in VALID_RESTRICTIONS:
        raise HTTPException(400, f"restricted_to doit être parmi : {VALID_RESTRICTIONS}")
    existing = list(session.execute(
        "SELECT * FROM chat_rooms WHERE name = %s ALLOW FILTERING", (data.name,)
    ))
    if existing:
        raise HTTPException(400, f"Une room '{data.name}' existe déjà")
    room_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    creator_id = uuid.UUID(current_user["sub"])
    session.execute("""
        INSERT INTO chat_rooms (id, name, description, restricted_to, created_by, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (room_id, data.name, data.description, data.restricted_to, creator_id, now))
    return {"id": str(room_id), "name": data.name, "description": data.description,
            "restricted_to": data.restricted_to, "created_at": str(now)}


@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, current_user=Depends(require_role("admin"))):
    session = get_session()
    try:
        session.execute("DELETE FROM chat_rooms WHERE id = %s", (uuid.UUID(room_id),))
        msgs = list(session.execute(
            "SELECT id FROM chat_messages WHERE room_id = %s ALLOW FILTERING", (room_id,)
        ))
        for msg in msgs:
            session.execute("DELETE FROM chat_messages WHERE id = %s", (msg.id,))
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"message": "Room supprimée"}


# ─── WEBSOCKET ────────────────────────────────────────────────────────────────

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str = Query(...)):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008)
        return

    roles = user.get("realm_access", {}).get("roles", [])
    session = get_session()

    # Vérifier que la room existe et que l'utilisateur y a accès
    try:
        room = session.execute(
            "SELECT * FROM chat_rooms WHERE id = %s", (uuid.UUID(room_id),)
        ).one()
    except Exception:
        await websocket.close(code=1008)
        return

    if not room:
        await websocket.close(code=1008)
        return

    if not user_can_access_room(roles, room.restricted_to or "all"):
        await websocket.close(code=1008)
        return

    username = user.get("preferred_username", "Anonyme")
    user_id = user.get("sub")
    room_name = room.name

    await manager.connect(websocket, room_id)

    # Historique
    try:
        history = list(session.execute(
            "SELECT * FROM chat_messages WHERE room_id = %s ALLOW FILTERING", (room_id,)
        ))
        history.sort(key=lambda x: x.sent_at)
        for msg in history[-50:]:
            sender = msg.sender_username if msg.sender_username else str(msg.sender_id)
            await websocket.send_json({
                "type": "message", "id": str(msg.id), "sender": sender,
                "content": msg.content, "sent_at": str(msg.sent_at),
                "room_id": room_id, "is_history": True
            })
    except Exception as e:
        print(f"Erreur historique: {e}")

    await manager.broadcast(
        {"type": "system", "content": f"{username} a rejoint #{room_name}"}, room_id
    )

    try:
        while True:
            data = await websocket.receive_text()
            now = datetime.now(timezone.utc)
            msg_id = uuid.uuid4()
            session.execute("""
                INSERT INTO chat_messages
                (id, room_id, sender_id, sender_username, content, sent_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (msg_id, room_id, uuid.UUID(user_id), username, data, now))
            await manager.broadcast({
                "type": "message", "id": str(msg_id), "sender": username,
                "content": data, "sent_at": str(now), "room_id": room_id
            }, room_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast(
            {"type": "system", "content": f"{username} a quitté #{room_name}"}, room_id
        )


# ─── HISTORY & DELETE ─────────────────────────────────────────────────────────

@router.get("/history/{room_id}")
async def get_history(room_id: str, current_user=Depends(get_current_user)):
    session = get_session()
    try:
        rows = list(session.execute(
            "SELECT * FROM chat_messages WHERE room_id = %s ALLOW FILTERING", (room_id,)
        ))
        rows.sort(key=lambda x: x.sent_at)
        return [{"id": str(r.id), "room_id": r.room_id,
                 "sender": r.sender_username if r.sender_username else str(r.sender_id),
                 "content": r.content, "sent_at": str(r.sent_at)} for r in rows[-100:]]
    except:
        return []


@router.delete("/messages/{message_id}")
async def delete_chat_message(message_id: str, current_user=Depends(get_current_user)):
    roles = current_user.get("realm_access", {}).get("roles", [])
    session = get_session()
    try:
        row = session.execute(
            "SELECT * FROM chat_messages WHERE id = %s ALLOW FILTERING",
            (uuid.UUID(message_id),)
        ).one()
    except:
        raise HTTPException(404, "Message non trouvé")
    if not row:
        raise HTTPException(404, "Message non trouvé")
    if "admin" not in roles and str(row.sender_id) != current_user["sub"]:
        raise HTTPException(403, "Accès refusé")
    session.execute("DELETE FROM chat_messages WHERE id = %s", (uuid.UUID(message_id),))
    return {"message": "Message supprimé"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "chat"}