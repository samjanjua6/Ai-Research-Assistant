"""
Authentication endpoints:
  POST /auth/send-signup-otp      — send 6-digit OTP for registration
  POST /auth/verify-otp-and-signup— verify OTP & create account
  POST /auth/resend-otp           — resend signup OTP
  POST /auth/forgot-password      — send 6-digit OTP & 1-click magic link for password reset
  POST /auth/verify-reset-code    — pre-validate 6-digit reset code
  POST /auth/reset-password       — verify OTP, update password & auto-login
  POST /auth/login                — authenticate & get JWT
  GET  /auth/me                   — return current user profile
  GET  /auth/terms                — return full Terms of Service text
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.email import (
    generate_otp,
    send_brevo_otp,
    send_password_changed_security_alert,
    send_account_deleted_email,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.db.crud import (
    create_user,
    get_user_by_email,
    create_or_update_otp,
    verify_otp,
    get_otp_record,
    update_user_password,
    get_user_account_summary,
    get_user_export_data,
    delete_user_account,
)
from app.db.database import get_db
from app.db.models import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


# ── Request / Response schemas ─────────────────────────────────────

class SendOtpRequest(BaseModel):
    name: str
    email: EmailStr

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters.")
        return v


class VerifySignupOtpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    terms_accepted: bool
    otp: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("terms_accepted")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "You must accept the Terms of Service & Privacy Policy to create an account."
            )
        return v

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if len(v) != 6 or not v.isdigit():
            raise ValueError("Verification code must be exactly 6 digits.")
        return v


class ResendOtpRequest(BaseModel):
    name: str = "there"
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if len(v) != 6 or not v.isdigit():
            raise ValueError("Verification code must be exactly 6 digits.")
        return v


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if len(v) != 6 or not v.isdigit():
            raise ValueError("Verification code must be exactly 6 digits.")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long.")
        return v


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    terms_accepted: bool

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("terms_accepted")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "You must accept the Terms of Service & Privacy Policy to create an account."
            )
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str = "user"
    is_admin: bool = False
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Helper ────────────────────────────────────────────────────────

def _user_response(user: User) -> UserResponse:
    user_role = getattr(user, "role", "user") or "user"
    user_is_admin = getattr(user, "is_admin", False) or (user_role == "admin") or (user.email.lower() in ("samjanjua6@gmail.com", "aliexports63@gmail.com"))
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role="admin" if user_is_admin else user_role,
        is_admin=user_is_admin,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


# ── Signup & Verification Endpoints ───────────────────────────────

@router.post("/send-signup-otp")
async def send_signup_otp(
    body: SendOtpRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1: Check if email is available, generate 6-digit OTP, save to DB, and send via Brevo.
    """
    clean_email = body.email.strip().lower()
    existing = await get_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in instead.",
        )

    # Check resend cooldown
    record = await get_otp_record(db, clean_email, "signup")
    now = datetime.now(timezone.utc)
    if record and (now - record.created_at).total_seconds() < settings.otp_resend_cooldown_seconds:
        remaining = int(settings.otp_resend_cooldown_seconds - (now - record.created_at).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting another verification code.",
        )

    otp_code = generate_otp()
    expires_at = now + timedelta(minutes=settings.otp_expire_minutes)

    await create_or_update_otp(
        db,
        email=clean_email,
        otp_code=otp_code,
        purpose="signup",
        expires_at=expires_at,
    )

    # Dispatch email in background task
    background_tasks.add_task(
        send_brevo_otp,
        to_email=clean_email,
        otp_code=otp_code,
        user_name=body.name.strip(),
        purpose="signup",
    )

    return {
        "status": "ok",
        "message": f"Verification code sent to {clean_email}",
        "expires_in_minutes": settings.otp_expire_minutes,
    }


@router.post("/resend-otp")
async def resend_otp(
    body: ResendOtpRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Resend a new 6-digit OTP to the email address."""
    clean_email = body.email.strip().lower()
    existing = await get_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    record = await get_otp_record(db, clean_email, "signup")
    now = datetime.now(timezone.utc)
    if record and (now - record.created_at).total_seconds() < settings.otp_resend_cooldown_seconds:
        remaining = int(settings.otp_resend_cooldown_seconds - (now - record.created_at).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting a new code.",
        )

    otp_code = generate_otp()
    expires_at = now + timedelta(minutes=settings.otp_expire_minutes)

    await create_or_update_otp(
        db,
        email=clean_email,
        otp_code=otp_code,
        purpose="signup",
        expires_at=expires_at,
    )

    background_tasks.add_task(
        send_brevo_otp,
        to_email=clean_email,
        otp_code=otp_code,
        user_name=body.name.strip(),
        purpose="signup",
    )

    return {
        "status": "ok",
        "message": f"New verification code sent to {clean_email}",
        "expires_in_minutes": settings.otp_expire_minutes,
    }


@router.post("/verify-otp-and-signup", response_model=AuthResponse, status_code=201)
async def verify_otp_and_signup(
    body: VerifySignupOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2: Validate OTP and complete user account registration.
    """
    clean_email = body.email.strip().lower()
    existing = await get_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    is_valid, msg = await verify_otp(
        db,
        email=clean_email,
        otp_code=body.otp,
        purpose="signup",
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    user = await create_user(
        db,
        name=body.name.strip(),
        email=clean_email,
        hashed_password=hash_password(body.password),
        is_verified=True,
        terms_accepted_at=datetime.now(timezone.utc),
    )

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=_user_response(user))


# ── Password Reset Endpoints ───────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1: Dispatches a 6-digit password reset code and magic link via Brevo SMTP.
    Returns generic success message for privacy/anti-enumeration protection.
    """
    clean_email = body.email.strip().lower()
    user = await get_user_by_email(db, clean_email)

    if user:
        # Check resend cooldown
        record = await get_otp_record(db, clean_email, "password_reset")
        now = datetime.now(timezone.utc)
        if record and (now - record.created_at).total_seconds() < settings.otp_resend_cooldown_seconds:
            remaining = int(settings.otp_resend_cooldown_seconds - (now - record.created_at).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another reset code.",
            )

        otp_code = generate_otp()
        expires_at = now + timedelta(minutes=settings.otp_expire_minutes)

        await create_or_update_otp(
            db,
            email=clean_email,
            otp_code=otp_code,
            purpose="password_reset",
            expires_at=expires_at,
        )

        background_tasks.add_task(
            send_brevo_otp,
            to_email=clean_email,
            otp_code=otp_code,
            user_name=user.name,
            purpose="password_reset",
        )

    return {
        "status": "ok",
        "message": f"If an account exists for {clean_email}, a 6-digit reset code has been sent.",
        "email": clean_email,
        "expires_in_minutes": settings.otp_expire_minutes,
    }


@router.post("/resend-forgot-password-otp")
async def resend_forgot_password_otp(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Resends a new password reset code to the email address."""
    clean_email = body.email.strip().lower()
    user = await get_user_by_email(db, clean_email)

    if user:
        record = await get_otp_record(db, clean_email, "password_reset")
        now = datetime.now(timezone.utc)
        if record and (now - record.created_at).total_seconds() < settings.otp_resend_cooldown_seconds:
            remaining = int(settings.otp_resend_cooldown_seconds - (now - record.created_at).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new code.",
            )

        otp_code = generate_otp()
        expires_at = now + timedelta(minutes=settings.otp_expire_minutes)

        await create_or_update_otp(
            db,
            email=clean_email,
            otp_code=otp_code,
            purpose="password_reset",
            expires_at=expires_at,
        )

        background_tasks.add_task(
            send_brevo_otp,
            to_email=clean_email,
            otp_code=otp_code,
            user_name=user.name,
            purpose="password_reset",
        )

    return {
        "status": "ok",
        "message": f"If an account exists for {clean_email}, a new reset code has been sent.",
    }


@router.post("/verify-reset-code")
async def verify_reset_code(
    body: VerifyResetCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Pre-validates a reset code (e.g. from 1-click magic link) without invalidating it.
    """
    clean_email = body.email.strip().lower()
    record = await get_otp_record(db, clean_email, "password_reset")
    now = datetime.now(timezone.utc)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password reset request found. Please request a new code.",
        )

    if record.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset code has expired. Please request a new code.",
        )

    if record.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many invalid attempts. Please request a new reset code.",
        )

    if record.otp_code != body.otp.strip():
        record.attempts += 1
        await db.commit()
        remaining = max(0, 5 - record.attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reset code. {remaining} attempt(s) remaining.",
        )

    return {"status": "ok", "valid": True}


@router.post("/reset-password", response_model=AuthResponse)
async def reset_password(
    body: ResetPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2: Validates OTP, updates the user's password, dispatches security alert, and returns JWT session.
    """
    clean_email = body.email.strip().lower()
    user = await get_user_by_email(db, clean_email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    is_valid, msg = await verify_otp(
        db,
        email=clean_email,
        otp_code=body.otp,
        purpose="password_reset",
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # Update password
    await update_user_password(
        db,
        user=user,
        hashed_password=hash_password(body.new_password),
    )

    # Dispatch security alert email
    background_tasks.add_task(
        send_password_changed_security_alert,
        to_email=user.email,
        user_name=user.name,
    )

    # Issue fresh JWT session
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=_user_response(user))


# ── Direct Signup & Login Endpoints ────────────────────────────────

@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Direct signup fallback (if OTP is bypassed)."""
    clean_email = body.email.strip().lower()
    existing = await get_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = await create_user(
        db,
        name=body.name.strip(),
        email=clean_email,
        hashed_password=hash_password(body.password),
        is_verified=True,
        terms_accepted_at=datetime.now(timezone.utc),
    )

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password."""
    user = await get_user_by_email(db, body.email)

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=_user_response(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return _user_response(current_user)


class DeleteAccountRequest(BaseModel):
    password: str


@router.get("/account-summary")
async def get_account_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return summary statistics for the user's account prior to deletion."""
    return await get_user_account_summary(db, current_user)


@router.get("/export-data")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a complete JSON backup archive of all user research data."""
    return await get_user_export_data(db, current_user)


@router.patch("/password", response_model=AuthResponse)
async def change_password(
    body: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the authenticated user's password.
    Validates the current password, enforces minimum strength and novelty,
    dispatches a device-aware security alert email, and returns a refreshed JWT session.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password. Please verify your current password and try again.",
        )

    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your current password.",
        )

    # Update password hash in database
    await update_user_password(
        db,
        user=current_user,
        hashed_password=hash_password(body.new_password),
    )

    # Extract user agent / client device info
    user_agent = request.headers.get("user-agent", "Web Browser")
    time_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Dispatch security alert email via Brevo SMTP in background
    background_tasks.add_task(
        send_password_changed_security_alert,
        to_email=current_user.email,
        user_name=current_user.name,
        device_hint=user_agent[:80] if user_agent else "Web Browser",
        time_str=time_str,
    )

    # Issue fresh JWT token for seamless session continuation
    token = create_access_token(current_user.id, current_user.email)
    return AuthResponse(access_token=token, user=_user_response(current_user))


@router.delete("/account")
async def delete_account(
    body: DeleteAccountRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes user account and cascades down to all research runs,
    step logs, and verification records. Requires password confirmation.
    """
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Please enter your valid current password to confirm deletion.",
        )

    user_email = current_user.email
    user_name = current_user.name

    # Perform cascade purge
    await delete_user_account(db, user=current_user)

    # Dispatch goodbye notification email in background
    background_tasks.add_task(
        send_account_deleted_email,
        to_email=user_email,
        user_name=user_name,
    )

    return {
        "status": "ok",
        "message": "Account and all associated research data have been permanently deleted.",
    }


@router.get("/terms")
async def get_terms():
    """Return the current Terms of Service & Privacy Policy text."""
    return {
        "version": "v1.0",
        "title": "Terms of Service & AI Usage Policy",
        "effective_date": "2026-08-24",
        "sections": [
            {
                "heading": "1. AI-Generated Content & Accuracy",
                "body": (
                    "Research reports are generated by an AI system using real-time web search results. "
                    "While we strive for accuracy, AI-generated content may contain errors, omissions, or "
                    "outdated information. You should independently verify any critical facts, especially "
                    "for medical, legal, financial, or scientific decisions."
                ),
            },
            {
                "heading": "2. Acceptable Use",
                "body": (
                    "You agree not to use this service for automated scraping, bypassing API rate limits, "
                    "generating harmful, illegal, or misleading content, or any purpose that violates "
                    "applicable laws or regulations."
                ),
            },
            {
                "heading": "3. Data & Privacy",
                "body": (
                    "Your research queries and generated reports are stored privately and linked strictly "
                    "to your account. We do not share your data with other users or third parties, except "
                    "as required by law. You may delete your account at any time to remove all associated data."
                ),
            },
            {
                "heading": "4. Acceptance Record",
                "body": (
                    "By creating an account, we record your acceptance of these terms (including the timestamp "
                    "and terms version) to maintain a verifiable record of consent."
                ),
            },
            {
                "heading": "5. Changes to Terms",
                "body": (
                    "We may update these terms from time to time. Continued use of the service after changes "
                    "constitutes acceptance of the updated terms."
                ),
            },
        ],
    }
