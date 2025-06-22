import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from models import UserData
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request

load_dotenv()

EMAIL = os.getenv("GMAIL_EMAIL")
PASSWORD = os.getenv("GMAIL_PASSWORD")
CONTACT_FORM_EMAIL = os.getenv("CONTACT_FORM_EMAIL")

GITHUB_API_BASE = os.getenv("GITHUB_API_BASE")
REPO_OWNER = os.getenv("REPO_OWNER")
REPO_NAME = os.getenv("REPO_NAME")
DOCS_PATH = os.getenv("DOCS_PATH")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

FRONTEND_LINK = os.getenv("FRONTEND_LINK")

SUPER_USER_EMAIL = str(os.getenv("SUPER_USER_EMAIL"))

# Email sending function
def send_email(to_emails: list, subject: str, body: str, bcc: bool = False):
    print(EMAIL, PASSWORD)
    # Gmail configuration
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = EMAIL
    sender_password = PASSWORD

    # Set up the email
    msg = MIMEMultipart()
    msg["From"] = sender_email
    if bcc:
        msg["To"] = sender_email
        msg["Bcc"] = ", ".join(to_emails)
    else:
        msg["To"] = ", ".join(to_emails)
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)

            server.sendmail(sender_email, to_emails, msg.as_string())

            if bcc:
                print(f"BCC email sent to {len(to_emails)} users")
            else:
                print(f"Email sent to: {', '.join(to_emails)}")
    except Exception as e:
        print(f"Failed to send email: {e}")
    
def get_all_emails(users):
    emails = [user.email for user in users]
    return emails

async def resend_link_email(data: UserData):
    return send_email([data.email], "User Link Owensfield Community Group", "Here is your link: https://owensfield.wales?id=" + data.id)