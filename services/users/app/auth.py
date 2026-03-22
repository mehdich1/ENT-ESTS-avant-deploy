from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt, httpx, os
from typing import Optional

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
REALM = os.getenv("KEYCLOAK_REALM", "ent-est")

security = HTTPBearer(auto_error=False)

_public_key = None

async def get_public_key():
    global _public_key
    if _public_key: return _public_key
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/certs")
        key = r.json()["keys"][0]
        _public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
        return _public_key

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Token manquant")
    try:
        pk = await get_public_key()
        return jwt.decode(credentials.credentials, pk, algorithms=["RS256"], options={"verify_aud": False})
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token invalide : {e}")

def require_role(role: str):
    async def checker(user=Depends(get_current_user)):
        roles = user.get("realm_access", {}).get("roles", [])
        if "admin" not in roles and role not in roles:
            raise HTTPException(status_code=403, detail=f"Rôle '{role}' requis")
        return user
    return checker

async def get_user_from_token(token: str):
    try:
        pk = await get_public_key()
        return jwt.decode(token, pk, algorithms=["RS256"], options={"verify_aud": False})
    except:
        return None