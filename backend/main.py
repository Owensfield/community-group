from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
import httpx
import base64
from time import time
from helpers import (
    send_email,
    resend_link_email,
    GITHUB_API_BASE,
    EMAIL,
    REPO_OWNER,
    REPO_NAME,
    DOCS_PATH,
    GITHUB_TOKEN,
    FRONTEND_LINK,
    SUPER_USER_EMAIL,
    CONTACT_FORM_EMAIL
)
from typing import List
from pydantic import BaseModel
from http import HTTPStatus
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from migrations import migrate
from crud import (
    create_user,
    update_user,
    get_user,
    get_users,
    delete_user,
    create_poll,
    get_poll,
    get_polls,
    delete_poll,
    update_poll,
    get_vote,
    update_poll_confirm,
    get_conditions,
    update_conditions,
    update_poll_run_time,
    get_user_by_email
)
from models import (
    CreateUserData,
    UserData,
    UpdateUserData,
    CreatePollData,
    CreateVote,
    UpdateConditions,
    EmailRequest,
    UpdatePollRun,
    ContactForm
)

ovs = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://0.0.0.0:8001",
    FRONTEND_LINK
]
print(f"Allowed Origins: {origins}")

ovs.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

migrate()  # Call without 'await'

@ovs.on_event("startup")
async def startup_event():
    user_data = CreateUserData(admin_id="admin", email=SUPER_USER_EMAIL, roll=2)
    try:
        user = await create_user(user_data)
        print("User created successfully: ", user)
    except Exception as e:
        print(f"Error creating user: {e}")


@ovs.post("/user")
async def ovs_api_create_user(data: CreateUserData):
    user = await get_user(data.admin_id)
    if user.roll != 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    return await create_user(data)


@ovs.put("/user")
async def ovs_api_update_user(data: UpdateUserData):
    user = await get_user(data.admin_id)
    if user.roll != 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    to_update = UserData(
        id=data.id,
        email=data.email,
        roll=data.roll
    )
    
    return await update_user(to_update)

@ovs.get("/user")
async def ovs_api_get_user(user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@ovs.get("/users")
async def ovs_api_get_users(user_id: str):
    user = await get_user(user_id)
    if not user or user.roll != 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    return await get_users()


@ovs.delete("/user")
async def ovs_api_delete_user(user_id: str, admin_id: str):
    print(user_id)
    user = await get_user(admin_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No admin found",
        )
    if user.roll != 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    user = await get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    return await delete_user(user_id)

### Resend Email

@ovs.get("/resend")
async def ovs_api_resend_email(email: str):
    user = await get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found with that email",
        )
    return await resend_link_email(user)


### Polls


@ovs.post("/poll")
async def ovs_api_create_poll(data: CreatePollData):
    user = await get_user(data.user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    poll = await create_poll(data)
    return poll


@ovs.get("/poll")
async def ovs_api_get_poll(poll_id: str, user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    return await get_poll(poll_id)


@ovs.put("/poll")
async def update_poll_vote(data: CreateVote):
    user = await get_user(data.user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    poll = await get_poll(data.poll_id)
    if not poll:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Poll not found.",
        )
    votecheck = await get_vote(data.poll_id, data.user_id)
    if votecheck:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="User already voted",
        )
    if data.confirm:
        if user.roll < 1:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Not an admin",
            )
        confirmers = poll.confirmers.split(",")
        for confirmer in confirmers:
            if confirmer == data.user_id:
                raise HTTPException(
                    status_code=HTTPStatus.UNAUTHORIZED,
                    detail="You already confirmed this poll",
                )
        poll = await update_poll_confirm(data.poll_id, data.user_id)
        if not poll:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Poll not found",
            )
        return poll
    if poll.confirms < 4:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not enough confirms",
        )
    voters = poll.voters.split(",")
    count = 0
    for voter in voters:
        if voter == data.user_id:
            count += 1
        if count >= 2:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="You already voted twice",
            )
    try:
        updated_poll = await update_poll(data.poll_id, data.user_id, data.opt_no)
        if not updated_poll:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="Poll not found",
            )
        return updated_poll
    except ValueError as e:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=str(e),
        )

@ovs.put("/polls/run")
async def ovs_api_update_poll(data: UpdatePollRun):
    user = await get_user(data.admin_id)
    if user.roll != 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    
    return await update_poll_run_time(data.id, data.duration, data.complete)

@ovs.get("/polls")
async def ovs_api_get_polls(user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    return await get_polls()


@ovs.delete("/poll")
async def ovs_api_delete_poll(poll_id: str, user_id: str):
    user = await get_user(user_id)
    if user.roll < 1:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an admin",
        )
    return await delete_poll(poll_id)


### DOCS


class DocFile(BaseModel):
    name: str
    path: str


@ovs.get("/api/docs", response_model=List[DocFile])
async def get_docs(user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    url = f"{GITHUB_API_BASE}/repos/{REPO_NAME}/contents/{DOCS_PATH}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
    if response.status_code == 200:
        files = [
            DocFile(name=file["name"], path=file["path"])
            for file in response.json()
            if file["name"].endswith(".md")
        ]
        return files
    else:
        raise HTTPException(status_code=500, detail="Failed to fetch docs")


@ovs.get("/api/docs/{filename}", response_class=PlainTextResponse)
async def get_doc_content(filename: str, user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    url = f"{GITHUB_API_BASE}/repos/{REPO_NAME}/contents/{DOCS_PATH}/{filename}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code == 200:
        content = response.json()["content"]
        decoded_content = base64.b64decode(content).decode("utf-8")
        return decoded_content
    else:
        raise HTTPException(status_code=500, detail="Failed to fetch doc content")
    
# Conditions

@ovs.get("/conditions")
async def ovs_api_get_conditions():
    conditions = await get_conditions()
    if not conditions:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Conditions not found",
        )
    return conditions

@ovs.put("/conditions")
async def ovs_api_update_conditions(data: UpdateConditions):
    user = await get_user(data.user_id)
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="No user found",
        )
    if user.roll < 2:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Not an super admin",
        )
    conditions = await update_conditions(data)
    if not conditions:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Conditions not found",
        )
    return conditions


@ovs.post("/contactform")
async def send_email_endpoint(email_request: ContactForm):
    try:
        send_email(
            to_emails=[CONTACT_FORM_EMAIL],
            subject="Contact form: " + email_request.subject,
            body=email_request.name + " " + email_request.email + "\n\n" + email_request.message
        )
        return {"message": "Email sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")