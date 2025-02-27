import sqlite3
from datetime import datetime


def migrate():
    connection = sqlite3.connect("ovs.sqlite3")
    cursor = connection.cursor()

    # Use SQLite's built-in CURRENT_TIMESTAMP for timestamp columns
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS Users
                  (id TEXT PRIMARY KEY,
                  email TEXT,
                  roll INTEGER,
                  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"""
    )

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS Polls
                  (id TEXT PRIMARY KEY,
                  title TEXT, 
                  choices TEXT, 
                  confirms INTEGER,
                  confirmers TEXT,
                  voters TEXT,
                  complete BOOLEAN,
                  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"""
    )

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS votes
                  (id TEXT PRIMARY KEY,
                  poll_id TEXT, 
                  user_id TEXT,
                  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"""
    )

    # Check if 'duration' column exists
    cursor.execute("PRAGMA table_info(Polls);")
    columns = [column[1] for column in cursor.fetchall()]
    if 'duration' not in columns:
        cursor.execute(
            """ALTER TABLE Polls ADD COLUMN duration INTEGER;"""
        )

    # Check if 'startdate' column exists
    if 'startdate' not in columns:
        cursor.execute(
            """ALTER TABLE Polls ADD COLUMN startdate TEXT;"""
        )

    cursor.execute(
        """CREATE TABLE IF NOT EXISTS conditions
                  (id TEXT PRIMARY KEY DEFAULT 1,
                  quorum INTEGER DEFAULT 15, 
                  threshold INTEGER DEFAULT 51)"""
    )

    # Ensure only one record exists in the 'conditions' table
    cursor.execute("SELECT COUNT(*) FROM conditions")
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.execute(
            """INSERT INTO conditions (id, quorum, threshold) VALUES (1, 15, 51)"""
        )

    connection.commit()
    connection.close()
    print("Database built!")    
