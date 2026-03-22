from pydantic import BaseModel
from typing import Optional

class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    content: str
    sent_at: Optional[str] = None