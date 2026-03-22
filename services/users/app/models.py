from pydantic import BaseModel
from typing import Optional
import uuid

class UserCreate(BaseModel):
    email: str
    username: str
    full_name: str
    role: str  # etudiant | enseignant | admin

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    role: str
    created_at: Optional[str] = None