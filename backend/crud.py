import json
from models import (
    CreateUserData,
    PollData,
    CreatePollData,
    UserData,
    Conditions,
    UpdateConditions,
)
from typing import Optional
from typing import List, Optional
import shortuuid
import time
from db import Database
from http import HTTPStatus
from fastapi import HTTPException
from datetime import datetime, timedelta

db = Database("ovs")
### Users


async def create_user(data: CreateUserData) -> CreateUserData:
    user = await get_user_by_email(data.email)
    if user:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail=f"User {data.email}, already exists",
        )
    user_id = shortuuid.uuid()
    await db.execute(
        """
        INSERT INTO Users (
            id,
            email,
            roll
        )
        VALUES (?, ?, ?)
        """,
        (
            user_id,
            data.email,
            data.roll,
        ),
    )
    return await get_user(user_id)


async def get_user(user_id: str):
    print(f"Fetching user with id: {user_id}")
    row = await db.fetchone("SELECT * FROM Users WHERE id = ?", (user_id,))
    if row:
        return UserData(**row)
    else:
        raise HTTPException(status_code=404, detail="User not found")

async def update_user(data: UserData) -> UserData:
    await db.execute(
        "UPDATE Users SET email = ?, roll = ? WHERE id = ?",
        (data.email, data.roll, data.id)
    )
    return await get_user(data.id)

async def get_user_by_email(email: str) -> UserData:
    row = await db.fetchone("SELECT * FROM Users WHERE email = ?", (email,))
    return UserData(**row) if row else None


async def get_users() -> List[UserData]:
    rows = await db.fetchall("SELECT * FROM Users")
    return [UserData(**row) for row in rows]


async def delete_user(user_id: str) -> None:
    return await db.execute("DELETE FROM Users WHERE id = ?", (user_id,))


### Polls


async def create_poll(
    data: CreatePollData
) -> PollData:
    poll_id = shortuuid.uuid()
    pollCheck = await get_poll(poll_id)
    if pollCheck:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail=f"Poll with title {data.title} already exists",
        )
    choices = data.choices.split('\n')
    choices = [[choice.strip(), 0] for choice in choices]
    choices_json = json.dumps(choices)
    await db.execute(
        """
        INSERT INTO Polls (
            id,
            title,
            confirms,
            confirmers,
            voters,
            choices,
            complete
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            poll_id,
            data.title,
            0,
            ",",
            ",",
            str(choices_json),
            False,
        ),
    )
    return await get_poll(poll_id)

async def get_poll(poll_id: str)-> PollData:
    row = await db.fetchone("SELECT * FROM Polls WHERE id = ?", (poll_id,))
    poll = PollData(**row) if row else None
    return poll

async def get_polls() -> List[PollData]:
    rows = await db.fetchall("SELECT * FROM Polls")
    for row in rows:
        if not row['complete'] and row['startdate']:
            startdate = datetime.strptime(row['startdate'], '%Y-%m-%d %H:%M:%S')
            duration_weeks = row['duration']
            if not duration_weeks:
                duration_weeks = 1
            enddate = startdate + timedelta(weeks=duration_weeks)
            if datetime.now() > enddate:
                # Duration has elapsed
                await db.execute("UPDATE Polls SET complete = ? WHERE id = ?", 
                     (True, row['id']))
    return [PollData(**row) for row in rows]

async def delete_poll(poll_id: str) -> None:
    return await db.execute("DELETE FROM Polls WHERE id = ?", (poll_id,))

async def get_users_count() -> int:
    row = await db.fetchone("SELECT COUNT(*) as count FROM Users")
    return row['count'] if row else 0

async def update_poll(poll_id: str, user_id: str, opt_no: int) -> Optional[PollData]:
    row = await db.fetchone("SELECT * FROM Polls WHERE id = ?", (poll_id,))
    if not row:
        return None
    voters = row['voters']
    if voters:
        voters += f",{user_id}"
    else:
        voters = user_id
    choices = json.loads(row['choices'])
    if 0 <= opt_no < len(choices):
        choices[opt_no][1] += 1
    else:
        raise ValueError("Invalid option number")
    updated_choices_json = json.dumps(choices)
    await db.execute("UPDATE Polls SET choices = ?, voters = ? WHERE id = ?", 
                    (updated_choices_json, voters, poll_id))
    updated_row = await db.fetchone("SELECT * FROM Polls WHERE id = ?", (poll_id,))
    return PollData(**updated_row) if updated_row else None

async def update_poll_confirm(poll_id: str, user_id: str) -> Optional[PollData]:
    row = await db.fetchone("SELECT * FROM Polls WHERE id = ?", (poll_id,))
    if not row:
        return None
    confirms = row['confirms'] + 1
    confirmers = row['confirmers']
    if confirmers:
        confirmers += f",{user_id}"
    else:
        confirmers = user_id
    startdate = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    await db.execute(
        "UPDATE Polls SET confirms = ?, confirmers = ?, startdate = ? WHERE id = ?",
        (confirms, confirmers, startdate, poll_id)
    )
    updated_row = await db.fetchone("SELECT * FROM Polls WHERE id = ?", (poll_id,))
    return PollData(**updated_row) if updated_row else None

async def get_vote(poll_id: str, user_id: str) -> Optional[dict]:
    row = await db.fetchone("SELECT * FROM Votes WHERE poll_id = ? AND user_id = ?", (poll_id, user_id))
    return row if row else None

# Conditions

async def get_conditions()-> Conditions:
    row = await db.fetchone("SELECT * FROM conditions WHERE id = ?", (1,))
    conditions = Conditions(**row) if row else None
    return conditions

async def update_conditions(data: Conditions) -> Optional[UpdateConditions]:
    await db.execute("UPDATE conditions SET quorum = ?, threshold = ? WHERE id = ?", 
                     (data.quorum, data.threshold, 1))
    rows = await db.fetchall("SELECT * FROM Polls")
    for row in rows:
        if row['startdate'] and row['duration']:
            startdate = datetime.strptime(row['startdate'], '%Y-%m-%d %H:%M:%S')
            duration_weeks = row['duration']
            enddate = startdate + timedelta(weeks=duration_weeks)
            if datetime.now() > enddate:
                # Duration has elapsed
                await db.execute("UPDATE Polls SET complete = ? WHERE id = ?", 
                    (True, row['id']))
            else:
                await db.execute("UPDATE Polls SET complete = ? WHERE id = ?", 
                    (False, row['id']))
    return await get_conditions()