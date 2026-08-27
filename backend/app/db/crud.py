import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EmailVerification, ResearchRun, RunStatus, StepLog, User


# ── User helpers ──────────────────────────────────────────────────

async def create_user(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    hashed_password: str,
    terms_accepted_at: datetime,
    is_verified: bool = True,
) -> User:
    user = User(
        name=name,
        email=email.strip().lower(),
        hashed_password=hashed_password,
        is_verified=is_verified,
        terms_accepted=True,
        terms_accepted_at=terms_accepted_at,
        terms_version="v1.0",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email.strip().lower())
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user_password(
    db: AsyncSession,
    *,
    user: User,
    hashed_password: str,
) -> User:
    user.hashed_password = hashed_password
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_account_summary(db: AsyncSession, user: User) -> dict[str, Any]:
    """Returns summary stats for the user account before deletion."""
    result = await db.execute(
        select(ResearchRun.id).where(ResearchRun.user_id == user.id)
    )
    run_ids = result.scalars().all()

    return {
        "user_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "runs_count": len(run_ids),
    }


async def get_user_export_data(db: AsyncSession, user: User) -> dict[str, Any]:
    """Generates complete GDPR JSON data export for the user."""
    result = await db.execute(
        select(ResearchRun).where(ResearchRun.user_id == user.id).order_by(desc(ResearchRun.created_at))
    )
    runs = result.scalars().all()

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "terms_accepted_at": user.terms_accepted_at.isoformat() if user.terms_accepted_at else None,
            "terms_version": user.terms_version,
        },
        "research_runs": [
            {
                "id": str(r.id),
                "question": r.question,
                "status": r.status.value,
                "summary": r.summary,
                "final_report": r.final_report,
                "sources": r.sources,
                "documents_metadata": r.documents_metadata,
                "urls_metadata": r.urls_metadata,
                "follow_up_questions": r.follow_up_questions,
                "loop_count": r.loop_count,
                "is_public": r.is_public,
                "share_token": r.share_token,
                "views_count": r.views_count,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            }
            for r in runs
        ],
    }


async def delete_user_account(db: AsyncSession, *, user: User) -> None:
    """
    Permanently deletes user account, cascading down to all research runs, step logs,
    and removing any associated email verification records.
    """
    clean_email = user.email.strip().lower()

    # 1. Delete associated email verification & OTP records
    await db.execute(
        delete(EmailVerification).where(EmailVerification.email == clean_email)
    )

    # 2. Delete the user instance (DB & ORM cascades delete research_runs & step_logs)
    await db.delete(user)
    await db.commit()


# ── Email OTP helpers ──────────────────────────────────────────────

async def create_or_update_otp(
    db: AsyncSession,
    *,
    email: str,
    otp_code: str,
    purpose: str = "signup",
    expires_at: datetime,
) -> EmailVerification:
    clean_email = email.strip().lower()
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == clean_email,
            EmailVerification.purpose == purpose,
        )
    )
    record = result.scalar_one_or_none()

    if record:
        record.otp_code = otp_code
        record.attempts = 0
        record.expires_at = expires_at
        record.created_at = datetime.now(timezone.utc)
    else:
        record = EmailVerification(
            email=clean_email,
            otp_code=otp_code,
            purpose=purpose,
            attempts=0,
            expires_at=expires_at,
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return record


async def get_otp_record(
    db: AsyncSession,
    email: str,
    purpose: str = "signup",
) -> EmailVerification | None:
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.email == email.strip().lower(),
            EmailVerification.purpose == purpose,
        )
    )
    return result.scalar_one_or_none()


async def verify_otp(
    db: AsyncSession,
    *,
    email: str,
    otp_code: str,
    purpose: str = "signup",
) -> tuple[bool, str]:
    record = await get_otp_record(db, email, purpose)
    now = datetime.now(timezone.utc)

    if not record:
        return False, "No verification code found. Please request a new code."

    if record.expires_at < now:
        return False, "Verification code has expired. Please request a new code."

    if record.attempts >= 5:
        return False, "Too many failed attempts. Please request a new code."

    if record.otp_code != otp_code.strip():
        record.attempts += 1
        await db.commit()
        remaining = max(0, 5 - record.attempts)
        return False, f"Invalid verification code. {remaining} attempt(s) remaining."

    # Valid! Delete the used OTP
    await db.delete(record)
    await db.commit()
    return True, "Verification successful."


# ── ResearchRun helpers ────────────────────────────────────────────

async def create_run(
    db: AsyncSession,
    question: str,
    user_id: uuid.UUID | None = None,
    documents_metadata: list[dict] | None = None,
    urls_metadata: list[dict] | None = None,
) -> ResearchRun:
    run = ResearchRun(
        question=question,
        status=RunStatus.pending,
        user_id=user_id,
        documents_metadata=documents_metadata,
        urls_metadata=urls_metadata,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def get_run(db: AsyncSession, run_id: uuid.UUID) -> ResearchRun | None:
    result = await db.execute(select(ResearchRun).where(ResearchRun.id == run_id))
    return result.scalar_one_or_none()


async def list_runs(
    db: AsyncSession,
    user_id: uuid.UUID | None = None,
    limit: int = 50,
) -> list[ResearchRun]:
    q = select(ResearchRun).order_by(desc(ResearchRun.created_at)).limit(limit)
    if user_id is not None:
        q = q.where(ResearchRun.user_id == user_id)
    result = await db.execute(q)
    return list(result.scalars().all())


async def update_run_status(
    db: AsyncSession,
    run_id: uuid.UUID,
    status: RunStatus,
    *,
    final_report: str | None = None,
    summary: str | None = None,
    sources: list[str] | None = None,
    documents_metadata: list[dict] | None = None,
    urls_metadata: list[dict] | None = None,
    follow_up_questions: list[Any] | None = None,
    loop_count: int | None = None,
) -> ResearchRun | None:
    run = await get_run(db, run_id)
    if not run:
        return None
    run.status = status
    if final_report is not None:
        run.final_report = final_report
    if summary is not None:
        run.summary = summary
    if sources is not None:
        run.sources = sources
    if documents_metadata is not None:
        run.documents_metadata = documents_metadata
    if urls_metadata is not None:
        run.urls_metadata = urls_metadata
    if follow_up_questions is not None:
        run.follow_up_questions = follow_up_questions
    if loop_count is not None:
        run.loop_count = loop_count
    if status in (RunStatus.done, RunStatus.failed):
        run.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return run


async def update_run_share_status(
    db: AsyncSession,
    run_id: uuid.UUID,
    *,
    is_public: bool,
    share_token: str | None = None,
) -> ResearchRun | None:
    run = await get_run(db, run_id)
    if not run:
        return None
    run.is_public = is_public
    if share_token is not None:
        run.share_token = share_token
    await db.commit()
    await db.refresh(run)
    return run


async def get_run_by_share_token(
    db: AsyncSession,
    share_token: str,
    *,
    increment_views: bool = False,
) -> ResearchRun | None:
    from sqlalchemy.orm import joinedload

    result = await db.execute(
        select(ResearchRun)
        .options(joinedload(ResearchRun.user))
        .where(ResearchRun.share_token == share_token)
        .where(ResearchRun.is_public == True)  # noqa: E712
    )
    run = result.scalar_one_or_none()
    if run and increment_views:
        run.views_count = (run.views_count or 0) + 1
        await db.commit()
        await db.refresh(run)
    return run


# ── StepLog helpers ───────────────────────────────────────────────

async def log_step(
    db: AsyncSession,
    run_id: uuid.UUID,
    step_name: str,
    loop_index: int = 0,
    payload: dict[str, Any] | None = None,
) -> StepLog:
    log = StepLog(
        run_id=run_id,
        step_name=step_name,
        loop_index=loop_index,
        payload=payload or {},
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def get_step_logs(db: AsyncSession, run_id: uuid.UUID) -> list[StepLog]:
    result = await db.execute(
        select(StepLog)
        .where(StepLog.run_id == run_id)
        .order_by(StepLog.logged_at)
    )
    return list(result.scalars().all())
