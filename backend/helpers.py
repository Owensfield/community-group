import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

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

SUPER_USER_EMAIL = os.getenv("SUPER_USER_EMAIL")

# Email sending function
def send_email(to_emails: list, subject: str, body: str):
    print(EMAIL, PASSWORD)
    # Gmail configuration
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = EMAIL
    sender_password = PASSWORD

    # Set up the email
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = ", ".join(to_emails)  # Join all emails into a single string
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        # Connect to Gmail's SMTP server
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # Upgrade connection to secure
            server.login(sender_email, sender_password)

            # Send the email to all recipients
            server.sendmail(sender_email, to_emails, msg.as_string())
            print(f"Email sent successfully to: {', '.join(to_emails)}")
    except Exception as e:
        print(f"Failed to send email: {e}")
    
def get_all_emails(users):
    emails = [user.email for user in users]
    return emails