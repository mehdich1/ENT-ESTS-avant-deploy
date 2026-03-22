from pydantic import BaseModel
from typing import Optional

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    sent_at: Optional[str] = None