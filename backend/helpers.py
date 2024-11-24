import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()
EMAIL = os.getenv("GMAIL_EMAIL")
PASSWORD = os.getenv("GMAIL_PASSWORD")
GITHUB_API_BASE = os.getenv("GITHUB_API_BASE")
REPO_OWNER = os.getenv("REPO_OWNER")
REPO_NAME = os.getenv("REPO_NAME")
DOCS_PATH = os.getenv("DOCS_PATH")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

# Email sending function
def send_email(to_email: str, subject: str, body: str):
    # Gmail configuration
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = "your_email@gmail.com"  # Replace with your Gmail address
    sender_password = "your_app_password"  # Replace with your App Password

    # Set up the email
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        # Connect to Gmail's SMTP server
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # Upgrade connection to secure
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print("Email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")