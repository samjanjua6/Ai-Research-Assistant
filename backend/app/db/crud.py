import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ResearchRun, RunStatus, StepLog, User


# ── User helpers ──────────────────────────────────────────────────

async def create_user(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    hashed_password: str,
    terms_accepted_at: datetime,
) -> User:
    user = User(
        name=name,
        email=email.strip().lower(),
        hashed_password=hashed_password,
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


# ── ResearchRun helpers ────────────────────────────────────────────

async def create_run(
    db: AsyncSession,
    question: str,
    user_id: uuid.UUID | None = None,
) -> ResearchRun:
    run = ResearchRun(question=question, status=RunStatus.pending, user_id=user_id)
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
    limit: int = 20,
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
    if loop_count is not None:
        run.loop_count = loop_count
    if status in (RunStatus.done, RunStatus.failed):
        run.finished_at = datetime.now(timezone.utc)
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
