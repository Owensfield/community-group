from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class CreateUserData(BaseModel):
    admin_id: str
    email: str
    roll: int

class UserData(BaseModel):
    id: str
    email: str
    roll: int
    timestamp: Optional[str] = str(datetime.now())

class UpdateUserData(BaseModel):
    id: str
    email: str
    admin_id: str
    roll: int

class CreatePollData(BaseModel):
    id: Optional[str] = None
    title: str
    choices: Optional[str] = None
    user_id: Optional[str] = None
    confirms: Optional[int] = 0
    confirmers: Optional[str] = None
    duration: Optional[int] = 0
    startdate: Optional[str] = None
    timestamp: Optional[str] = 0


class PollData(BaseModel):
    id: Optional[str] = None
    title: str
    choices: Optional[str] = None
    confirms: Optional[int] = 0
    confirmers: Optional[str] = None
    duration: Optional[int] = 0
    startdate: Optional[str] = None
    voters: Optional[str] = None
    complete: Optional[bool] = None
    timestamp: Optional[str] = None

class UpdatePollRun(BaseModel):
    id: Optional[str] = None
    duration: Optional[int] = 0
    complete: Optional[bool] = None
    admin_id: Optional[str] = None

class CreateVote(BaseModel):
    poll_id: Optional[str] = None
    user_id: Optional[str] = None
    opt_no: Optional[int] = 0
    confirm: Optional[bool] = False

class UpdateConditions(BaseModel):
    user_id: str
    quorum: int
    threshold: int

class Conditions(BaseModel):
    quorum: int
    threshold: int

class EmailRequest(BaseModel):
    to_emails: List[EmailStr]
    subject: str
    body: str

class EmailAllRequest(BaseModel):
    subject: str
    message: str

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str