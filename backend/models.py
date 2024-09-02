from pydantic import BaseModel
from typing import Optional

class CreateUserData(BaseModel):
    admin_id: str
    email: str
    roll: int

class UserData(BaseModel):
    id: str
    email: str
    roll: int
    timestamp: Optional[str]


class CreatePollData(BaseModel):
    id: Optional[str] = None
    title: str
    choices: Optional[str] = None
    user_id: Optional[str] = None
    confirms: Optional[int] = 0
    confirmers: Optional[str] = None
    timestamp: Optional[str] = 0


class PollData(BaseModel):
    id: Optional[str] = None
    title: str
    choices: Optional[str] = None
    confirms: Optional[int] = 0
    confirmers: Optional[str] = None
    voters: Optional[str] = None
    complete: Optional[bool] = None
    timestamp: Optional[str] = None

class CreateVote(BaseModel):
    poll_id: Optional[str] = None
    user_id: Optional[str] = None
    opt_no: Optional[int] = 0
    confirm: Optional[bool] = False