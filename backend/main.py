import json
from sqlalchemy import text
from fastapi import Request, FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from migrations import migrate
from db import Database
from crud import (
    create_user,
    get_user,
    get_users,
    delete_user,
    create_poll,
    get_poll,
    get_polls,
    delete_poll,
    create_vote,
    get_vote,
    get_vote_check,
    get_votes_poll,
    create_approval,
    check_approvals,
)
from models import (
    CreateUserData,
    CreateVoteData,
    CreatePollData,
    CreateVoteApprovalData,
)

ovs = FastAPI()

migrate()  # Call without 'await'

origins = [
    "http://localhost",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://0.0.0.0:8001",
]

ovs.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@ovs.post("/user")
async def ovs_api_create_user(data: CreateUserData):
    user = await get_user(data.admin_id)
    if user.roll != 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    return await create_user(data)


@ovs.get("/user")
async def ovs_api_get_user(user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@ovs.get("/users")
async def ovs_api_get_users():
    return await get_users()


@ovs.delete("/user")
async def ovs_api_delete_user(user_id: str):
    return await delete_user(user_id)


### Polls


@ovs.post("/poll")
async def ovs_api_create_poll(data: CreatePollData):
    return await create_poll(data)


@ovs.get("/poll")
async def ovs_api_get_poll(poll_id: str):
    return await get_poll(poll_id)


@ovs.get("/polls")
async def ovs_api_get_polls():
    return await get_polls()


# Needs signature of the person who created poll
@ovs.delete("/poll")
async def ovs_api_delete_poll(signature: str, poll_id: str):
    return await delete_poll(signature, poll_id)


### Approvals


@ovs.post("/approval")
async def ovs_api_create_approval(data: CreateVoteApprovalData):
    return await create_approval(data)


@ovs.get("/approval")
async def ovs_api_check_approval(poll_id: str) -> List[CreateVoteApprovalData]:
    return await check_approvals(poll_id)


### Votes


@ovs.post("/vote")
async def ovs_api_create_vote(data: CreateVoteData):
    return await create_vote(data)


@ovs.get("/vote")
async def ovs_api_get_vote(vote_id: str) -> CreateVoteData:
    return await get_vote(vote_id)


@ovs.get("/votes")
async def ovs_api_get_votes_poll(poll_id: str) -> List[CreateVoteData]:
    return await get_votes_poll(poll_id)


@ovs.get("/checkvotes")
async def ovs_api_check_votes(user_id: str) -> List[CreateVoteData]:
    return await get_vote_check(user_id)
