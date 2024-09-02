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

    connection.commit()
    connection.close()
    print("Database built!")
