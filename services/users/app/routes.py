from fastapi import APIRouter, Depends, HTTPException, Query
from app.models import UserCreate, UserResponse
from app.database import get_session
from app.auth import get_current_user, require_role
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/users", tags=["Users"], redirect_slashes=False)


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    """Retourne les infos de l'utilisateur connecté depuis le JWT"""
    return {
        "id": current_user.get("sub"),
        "username": current_user.get("preferred_username"),
        "preferred_username": current_user.get("preferred_username"),
        "name": current_user.get("name"),
        "given_name": current_user.get("given_name"),
        "family_name": current_user.get("family_name"),
        "email": current_user.get("email"),
        "roles": current_user.get("realm_access", {}).get("roles", []),
    }


@router.get("")
async def list_users(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=100, ge=1, le=200),
    current_user=Depends(get_current_user)
):
    """
    Liste les utilisateurs.
    Tous les utilisateurs authentifiés peuvent voir la liste (pour la messagerie).
    Les données sensibles sont filtrées pour les non-admins.
    """
    session = get_session()
    roles = current_user.get("realm_access", {}).get("roles", [])
    is_admin = "admin" in roles

    rows = list(session.execute("SELECT * FROM users"))
    total = len(rows)
    paginated = rows[(page - 1) * size: page * size]

    items = []
    for row in paginated:
        item = {
            "id": str(row.id),
            "username": row.username,
            "preferred_username": row.username,
            "name": row.full_name or "",
            "given_name": "",
            "family_name": "",
        }
        if is_admin:
            item["email"] = row.email
            item["role"] = row.role
            item["created_at"] = str(row.created_at)
        items.append(item)

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total > 0 else 0,
        "items": items
    }


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    current_user=Depends(get_current_user)
):
    """Retourne un utilisateur par ID"""
    session = get_session()
    try:
        row = session.execute(
            "SELECT * FROM users WHERE id = %s",
            (uuid.UUID(user_id),)
        ).one()
    except Exception:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    return {
        "id": str(row.id),
        "username": row.username,
        "preferred_username": row.username,
        "name": row.full_name or "",
        "email": row.email,
        "role": row.role,
        "created_at": str(row.created_at)
    }


@router.post("")
async def create_user(
    user: UserCreate,
    current_user=Depends(require_role("admin"))
):
    """Crée un utilisateur — admin seulement"""
    session = get_session()
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    session.execute("""
        INSERT INTO users (id, email, username, full_name, role, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (user_id, user.email, user.username, user.full_name, user.role, now))
    return {
        "id": str(user_id),
        "email": user.email,
        "username": user.username,
        "preferred_username": user.username,
        "name": user.full_name,
        "role": user.role,
        "created_at": str(now)
    }


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user=Depends(require_role("admin"))
):
    """Supprime un utilisateur — admin seulement"""
    session = get_session()
    session.execute(
        "DELETE FROM users WHERE id = %s",
        (uuid.UUID(user_id),)
    )
    return {"message": "Utilisateur supprimé"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "users"}