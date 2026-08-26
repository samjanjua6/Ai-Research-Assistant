"""
Email dispatching service using Brevo (Sendinblue) SMTP Relay and REST API.
"""
from __future__ import annotations

import asyncio
from email.message import EmailMessage
import secrets
import smtplib
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def generate_otp() -> str:
    """Generate a secure 6-digit numeric string."""
    return f"{secrets.randbelow(900000) + 100000}"


def _build_otp_html(otp_code: str, user_name: str, purpose: str, expire_minutes: int) -> str:
    action_text = "verify your email address and create your account" if purpose == "signup" else "verify your account"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification Code</title>
    </head>
    <body style="margin: 0; padding: 30px 15px; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #161822; border-radius: 14px; border: 1px solid #282b3d; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px 20px; border-bottom: 1px solid #282b3d; text-align: left;">
            <span style="font-size: 22px; vertical-align: middle;">🔬</span>
            <span style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; margin-left: 8px; vertical-align: middle;">AI Research Assistant</span>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px 32px 24px;">
            <h1 style="margin: 0 0 14px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
              Verification Code
            </h1>
            <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #94a3b8;">
              Hi <strong style="color: #f1f5f9;">{user_name}</strong>,<br>
              Please enter the 6-digit verification code below to {action_text}:
            </p>

            <!-- OTP Highlight Card -->
            <div style="margin: 28px 0; padding: 20px; background-color: #1e1b4b; border: 1px dashed #7c3aed; border-radius: 10px; text-align: center;">
              <span style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #c4b5fd;">
                {otp_code}
              </span>
            </div>

            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
              ⏱️ This code will expire in <strong style="color: #cbd5e1;">{expire_minutes} minutes</strong>.
            </p>
            <p style="margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.5;">
              If you didn't request this verification code, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 32px; background-color: #11131c; border-top: 1px solid #282b3d; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              Autonomous Deep Research Assistant &nbsp;·&nbsp; <a href="https://research.mychatbot.codes" style="color: #7c3aed; text-decoration: none;">research.mychatbot.codes</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def _send_smtp_sync(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    settings = get_settings()
    smtp_password = settings.smtp_password.strip() or settings.brevo_api_key.strip()
    if not smtp_password:
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.brevo_sender_name} <{settings.brevo_sender_email}>"
    msg["To"] = to_email.strip().lower()
    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=12) as server:
        server.starttls()
        server.login(settings.smtp_user, smtp_password)
        server.send_message(msg)
    return True


async def send_brevo_otp(to_email: str, otp_code: str, user_name: str = "there", purpose: str = "signup") -> bool:
    """
    Sends an OTP verification email using Brevo SMTP Relay (or REST API fallback).
    """
    settings = get_settings()
    smtp_password = settings.smtp_password.strip() or settings.brevo_api_key.strip()

    if not smtp_password:
        logger.warning(
            "email_credentials_missing",
            email=to_email,
            otp=otp_code,
            msg="Brevo SMTP/API key not set — logging OTP for development.",
        )
        return True

    subject = f"{otp_code} is your Research Assistant verification code"
    html_content = _build_otp_html(otp_code, user_name, purpose, settings.otp_expire_minutes)
    text_content = f"Hi {user_name},\n\nYour 6-digit verification code is: {otp_code}\n\nThis code expires in {settings.otp_expire_minutes} minutes."

    # 1. Try Brevo SMTP Relay
    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)
        logger.info("brevo_smtp_email_sent_successfully", email=to_email)
        return True
    except Exception as smtp_err:
        logger.warning("brevo_smtp_failed_trying_rest", email=to_email, error=str(smtp_err))

    # 2. Try Brevo REST API fallback if API key is present
    if settings.brevo_api_key.strip():
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.brevo_api_key.strip(),
            "content-type": "application/json",
        }
        payload = {
            "sender": {
                "name": settings.brevo_sender_name,
                "email": settings.brevo_sender_email,
            },
            "to": [
                {
                    "email": to_email.strip().lower(),
                    "name": user_name,
                }
            ],
            "subject": subject,
            "htmlContent": html_content,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code in (200, 201, 202):
                    logger.info("brevo_rest_email_sent_successfully", email=to_email, status=response.status_code)
                    return True
                else:
                    logger.error(
                        "brevo_rest_email_failed",
                        email=to_email,
                        status=response.status_code,
                        response=response.text,
                    )
        except Exception as exc:
            logger.error("brevo_rest_email_exception", email=to_email, error=str(exc))

    return False
