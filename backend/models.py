from pydantic import BaseModel
from typing import Optional


class CreateUserData(BaseModel):
    id: Optional[str] = None
    admin_id: Optional[str] = None
    email: Optional[str] = None
    roll: int = 0


class CreatePollData(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    signature: Optional[str] = None
    options: Optional[str] = None
    active: int = 0
    closing_date: int = 0
    timestamp: int = 0


class GetPollData(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    options: Optional[str] = None
    active: int = 0
    closing_date: int = 0
    timestamp: int = 0


class CreateVoteApprovalData(BaseModel):
    id: Optional[str] = None
    poll_id: Optional[str] = None
    user_id: Optional[str] = None


class CreateVoteData(BaseModel):
    id: Optional[str] = None
    poll_id: Optional[str] = None
    vote_opt: Optional[str] = None
    user_id: Optional[str] = None
