"""
Email dispatching service using Brevo (Sendinblue) SMTP Relay and REST API.
Supports signup verification, 1-click magic password reset, and security alerts.
"""
from __future__ import annotations

import asyncio
from email.message import EmailMessage
import secrets
import smtplib
import urllib.parse
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def generate_otp() -> str:
    """Generate a secure 6-digit numeric string."""
    return f"{secrets.randbelow(900000) + 100000}"


def _build_otp_html(otp_code: str, user_name: str, purpose: str, expire_minutes: int, to_email: str) -> str:
    is_reset = purpose == "password_reset"
    title = "Reset Your Password" if is_reset else "Verify Your Email"
    heading = "Password Reset Request" if is_reset else "Verification Code"
    action_text = "reset your account password" if is_reset else "verify your email address and create your account"
    encoded_email = urllib.parse.quote(to_email)
    magic_url = f"https://research.mychatbot.codes/?reset_email={encoded_email}&reset_code={otp_code}"

    magic_button_html = f"""
    <div style="margin: 24px 0 16px; text-align: center;">
      <a href="{magic_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7C6AF0, #06B6D4); color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 700; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(124, 106, 240, 0.4);">
        Reset Password Directly &rarr;
      </a>
      <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">
        Or enter the 6-digit code below manually:
      </p>
    </div>
    """ if is_reset else ""

    security_notice = (
        "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged."
        if is_reset
        else "If you didn't request this verification code, you can safely ignore this email."
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 30px 15px; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #161822; border-radius: 14px; border: 1px solid #282b3d; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px 20px; border-bottom: 1px solid #282b3d; text-align: left;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7C6AF0, #06B6D4); border-radius: 7px; text-align: center; line-height: 28px; color: #ffffff; font-weight: bold; font-size: 14px;">
                    &loz;
                  </div>
                </td>
                <td style="vertical-align: middle; padding-left: 10px;">
                  <span style="font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">AI Research Assistant</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px 32px 24px;">
            <h1 style="margin: 0 0 14px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
              {heading}
            </h1>
            <p style="margin: 0 0 18px; font-size: 14.5px; line-height: 1.6; color: #94a3b8;">
              Hi <strong style="color: #f1f5f9;">{user_name}</strong>,<br>
              We received a request to {action_text}.
            </p>

            {magic_button_html}

            <!-- OTP Highlight Card -->
            <div style="margin: 20px 0; padding: 18px; background-color: #1a1738; border: 1px dashed #7c3aed; border-radius: 10px; text-align: center;">
              <span style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #c4b5fd;">
                {otp_code}
              </span>
            </div>

            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
              This code is valid for <strong style="color: #cbd5e1;">{expire_minutes} minutes</strong>.
            </p>
            <p style="margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.5;">
              {security_notice}
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


def _build_password_changed_alert_html(user_name: str, device_hint: str = "Web Browser", time_str: str = "") -> str:
    timestamp_display = time_str or "Just now"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert: Password Changed</title>
    </head>
    <body style="margin: 0; padding: 30px 15px; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #161822; border-radius: 14px; border: 1px solid #282b3d; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px 20px; border-bottom: 1px solid #282b3d; text-align: left;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7C6AF0, #06B6D4); border-radius: 7px; text-align: center; line-height: 28px; color: #ffffff; font-weight: bold; font-size: 14px;">
                    &loz;
                  </div>
                </td>
                <td style="vertical-align: middle; padding-left: 10px;">
                  <span style="font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">AI Research Assistant</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px 32px 24px;">
            <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
              Security Alert: Password Changed
            </h1>
            <p style="margin: 0 0 16px; font-size: 14.5px; line-height: 1.6; color: #94a3b8;">
              Hi <strong style="color: #f1f5f9;">{user_name}</strong>,<br>
              The password for your AI Research Assistant account was successfully changed.
            </p>

            <div style="margin: 20px 0; padding: 14px 18px; background-color: #1a1528; border-left: 3px solid #10b981; border-radius: 6px;">
              <p style="margin: 0 0 6px; font-size: 13.5px; color: #e2e8f0; line-height: 1.4;">
                <strong>Device / Client:</strong> {device_hint}
              </p>
              <p style="margin: 0; font-size: 12.5px; color: #94a3b8; line-height: 1.4;">
                <strong>Timestamp:</strong> {timestamp_display} (UTC)
              </p>
            </div>

            <p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8; line-height: 1.5;">
              If you made this change, you can safely ignore this email.
            </p>

            <div style="margin: 20px 0; padding: 14px 18px; background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px;">
              <p style="margin: 0 0 10px; font-size: 13px; color: #ef4444; font-weight: 600;">
                Did not request this change?
              </p>
              <p style="margin: 0 0 12px; font-size: 12.5px; color: #f87171; line-height: 1.5;">
                Your account credentials may be compromised. Please reset your password immediately.
              </p>
              <a href="https://research.mychatbot.codes" target="_blank" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 12.5px; font-weight: 700; padding: 8px 18px; border-radius: 6px;">
                Secure My Account &rarr;
              </a>
            </div>
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

    is_reset = purpose == "password_reset"
    subject = (
        f"{otp_code} is your password reset code"
        if is_reset
        else f"{otp_code} is your Research Assistant verification code"
    )
    html_content = _build_otp_html(otp_code, user_name, purpose, settings.otp_expire_minutes, to_email)
    text_content = (
        f"Hi {user_name},\n\nYour 6-digit password reset code is: {otp_code}\n\nThis code expires in {settings.otp_expire_minutes} minutes."
        if is_reset
        else f"Hi {user_name},\n\nYour 6-digit verification code is: {otp_code}\n\nThis code expires in {settings.otp_expire_minutes} minutes."
    )

    # 1. Try Brevo SMTP Relay
    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)
        logger.info("brevo_smtp_email_sent_successfully", email=to_email, purpose=purpose)
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


async def send_password_changed_security_alert(
    to_email: str,
    user_name: str = "there",
    device_hint: str = "Web Browser",
    time_str: str = "",
) -> bool:
    """
    Sends a security alert email notifying the user that their password was changed.
    """
    subject = "Security Alert: Password Changed for AI Research Assistant"
    html_content = _build_password_changed_alert_html(user_name, device_hint=device_hint, time_str=time_str)
    text_content = (
        f"Hi {user_name},\n\nYour password for AI Research Assistant was changed successfully.\n"
        f"Device / Client: {device_hint}\n"
        f"Timestamp: {time_str or 'Just now'} UTC\n\n"
        "If you did not perform this action, please reset your password immediately."
    )

    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)
        logger.info("password_changed_alert_sent", email=to_email, device=device_hint)
        return True
    except Exception as exc:
        logger.warning("password_changed_alert_failed", email=to_email, error=str(exc))
        return False


def _build_account_deleted_html(user_name: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Deleted</title>
    </head>
    <body style="margin: 0; padding: 30px 15px; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #161822; border-radius: 14px; border: 1px solid #282b3d; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px 20px; border-bottom: 1px solid #282b3d; text-align: left;">
            <span style="font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">AI Research Assistant</span>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px 32px 24px;">
            <h1 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
              Account Deleted Confirmation
            </h1>
            <p style="margin: 0 0 16px; font-size: 14.5px; line-height: 1.6; color: #94a3b8;">
              Hi <strong style="color: #f1f5f9;">{user_name}</strong>,<br>
              Your AI Research Assistant account and all associated research runs, syntheses, and logs have been permanently deleted as requested.
            </p>

            <div style="margin: 20px 0; padding: 14px 18px; background-color: #1a1622; border-left: 3px solid #7c6af0; border-radius: 6px;">
              <p style="margin: 0; font-size: 13.5px; color: #cbd5e1; line-height: 1.5;">
                All personal data has been erased from our primary databases in compliance with our data retention policy.
              </p>
            </div>

            <p style="margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.5;">
              Thank you for using AI Research Assistant. You are welcome back anytime at <a href="https://research.mychatbot.codes" style="color: #7c6af0; text-decoration: none;">research.mychatbot.codes</a>.
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


async def send_account_deleted_email(to_email: str, user_name: str = "there") -> bool:
    """
    Sends a confirmation email notifying the user that their account was deleted.
    """
    subject = "Your AI Research Assistant Account Has Been Deleted"
    html_content = _build_account_deleted_html(user_name)
    text_content = (
        f"Hi {user_name},\n\nYour AI Research Assistant account and all associated research data have been permanently deleted.\n\n"
        "Thank you for using AI Research Assistant."
    )

    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)
        logger.info("account_deleted_email_sent", email=to_email)
        return True
    except Exception as exc:
        logger.warning("account_deleted_email_failed", email=to_email, error=str(exc))
        return False
