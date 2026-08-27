"""
Admin Management & System Telemetry API Endpoints:
  GET    /admin/overview        — Platform KPI summary and recent activity
  GET    /admin/users           — Searchable, paginated user accounts
  PATCH  /admin/users/{user_id}/role — Toggle user role (user <-> admin)
  DELETE /admin/users/{user_id} — Cascade delete a user account
  GET    /admin/runs            — Searchable & filterable research runs
  GET    /admin/runs/{run_id}   — Full research run inspector details
  GET    /admin/server-metrics  — Live CPU, RAM, Disk, DB and system telemetry
"""
from __future__ import annotations

import os
import platform
import shutil
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_admin_user
from app.core.config import get_settings
from app.db.crud import delete_user_account, get_run
from app.db.database import get_db
from app.db.models import EmailVerification, ResearchRun, RunStatus, StepLog, User

router = APIRouter(prefix="/admin", tags=["admin"])

STARTUP_TIME = time.time()


class UpdateRoleRequest(BaseModel):
    role: str  # "admin" or "user"


# ── 1. Overview KPIs ───────────────────────────────────────────────

@router.get("/overview")
async def get_admin_overview(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns platform-wide KPIs: user growth, research volume, success rates,
    public engagement, and high-level system resource status.
    """
    # 1. Total & Verified Users
    users_count_res = await db.execute(select(func.count(User.id)))
    total_users = users_count_res.scalar() or 0

    verified_count_res = await db.execute(
        select(func.count(User.id)).where(User.is_verified.is_(True))
    )
    verified_users = verified_count_res.scalar() or 0

    admins_count_res = await db.execute(
        select(func.count(User.id)).where(
            (User.role == "admin") | (User.is_admin.is_(True))
        )
    )
    total_admins = admins_count_res.scalar() or 0

    # 2. Research Runs Breakdown
    runs_count_res = await db.execute(select(func.count(ResearchRun.id)))
    total_runs = runs_count_res.scalar() or 0

    done_runs_res = await db.execute(
        select(func.count(ResearchRun.id)).where(ResearchRun.status == RunStatus.done)
    )
    done_runs = done_runs_res.scalar() or 0

    running_runs_res = await db.execute(
        select(func.count(ResearchRun.id)).where(ResearchRun.status == RunStatus.running)
    )
    running_runs = running_runs_res.scalar() or 0

    failed_runs_res = await db.execute(
        select(func.count(ResearchRun.id)).where(ResearchRun.status == RunStatus.failed)
    )
    failed_runs = failed_runs_res.scalar() or 0

    # Step Logs Count
    steps_count_res = await db.execute(select(func.count(StepLog.id)))
    total_steps = steps_count_res.scalar() or 0

    # Public shares & views
    shares_count_res = await db.execute(
        select(func.count(ResearchRun.id)).where(ResearchRun.is_public.is_(True))
    )
    total_shares = shares_count_res.scalar() or 0

    views_count_res = await db.execute(select(func.sum(ResearchRun.views_count)))
    total_views = views_count_res.scalar() or 0

    # Success rate
    completed_total = done_runs + failed_runs
    success_rate = (
        round((done_runs / completed_total) * 100, 1) if completed_total > 0 else 100.0
    )

    # 3. Recent 5 Activity Feed
    recent_runs_res = await db.execute(
        select(ResearchRun, User.name, User.email)
        .outerjoin(User, ResearchRun.user_id == User.id)
        .order_by(desc(ResearchRun.created_at))
        .limit(6)
    )
    recent_activity = [
        {
            "id": str(r.id),
            "question": r.question,
            "status": r.status.value,
            "user_name": user_name or "Anonymous Guest",
            "user_email": user_email or "N/A",
            "loop_count": r.loop_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, user_name, user_email in recent_runs_res.all()
    ]

    # 4. System Metrics Summary
    uptime_seconds = int(time.time() - STARTUP_TIME)
    total_disk, used_disk, free_disk = shutil.disk_usage("/")

    return {
        "kpis": {
            "total_users": total_users,
            "verified_users": verified_users,
            "total_admins": total_admins,
            "total_runs": total_runs,
            "done_runs": done_runs,
            "running_runs": running_runs,
            "failed_runs": failed_runs,
            "total_steps": total_steps,
            "total_shares": total_shares,
            "total_views": total_views,
            "success_rate": success_rate,
        },
        "system": {
            "uptime_seconds": uptime_seconds,
            "disk_used_gb": round(used_disk / (1024**3), 1),
            "disk_total_gb": round(total_disk / (1024**3), 1),
            "disk_percent": round((used_disk / total_disk) * 100, 1),
            "python_version": platform.python_version(),
            "platform": platform.platform(),
        },
        "recent_activity": recent_activity,
    }


# ── 2. Users Management ────────────────────────────────────────────

@router.get("/users")
async def get_admin_users(
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns paginated user list with research query counts."""
    query = select(User).order_by(desc(User.created_at))

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(User.name).like(term) | func.lower(User.email).like(term)
        )

    # Total count
    count_query = select(func.count(User.id))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        count_query = count_query.where(
            func.lower(User.name).like(term) | func.lower(User.email).like(term)
        )
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginated results with runs count
    users_res = await db.execute(query.offset(offset).limit(limit))
    users = users_res.scalars().all()

    items = []
    for u in users:
        u_role = getattr(u, "role", "user") or "user"
        u_is_admin = getattr(u, "is_admin", False) or (u_role == "admin") or (u.email.lower() == "samjanjua6@gmail.com")

        # Runs count for this user
        rc_res = await db.execute(
            select(func.count(ResearchRun.id)).where(ResearchRun.user_id == u.id)
        )
        user_runs_count = rc_res.scalar() or 0

        items.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": "admin" if u_is_admin else u_role,
            "is_admin": u_is_admin,
            "is_verified": u.is_verified,
            "terms_accepted": u.terms_accepted,
            "runs_count": user_runs_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": items,
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    body: UpdateRoleRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Promotes or demotes user role."""
    target_user_res = await db.execute(select(User).where(User.id == user_id))
    target_user = target_user_res.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    new_role = "admin" if body.role.lower() == "admin" else "user"
    target_user.role = new_role
    target_user.is_admin = new_role == "admin"

    await db.commit()
    await db.refresh(target_user)

    return {
        "status": "ok",
        "user_id": str(target_user.id),
        "name": target_user.name,
        "email": target_user.email,
        "role": target_user.role,
        "is_admin": target_user.is_admin,
    }


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-triggered cascade deletion of user and all data."""
    if admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account from the dashboard.",
        )

    target_user_res = await db.execute(select(User).where(User.id == user_id))
    target_user = target_user_res.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    await delete_user_account(db, user=target_user)

    return {
        "status": "ok",
        "message": f"User {target_user.email} and all associated data permanently erased.",
    }


# ── 3. Research Runs Registry ──────────────────────────────────────

@router.get("/runs")
async def get_admin_runs(
    search: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns paginated research runs across the platform."""
    query = (
        select(ResearchRun, User.name, User.email)
        .outerjoin(User, ResearchRun.user_id == User.id)
        .order_by(desc(ResearchRun.created_at))
    )

    if status_filter and status_filter.lower() in ("done", "running", "failed", "pending"):
        query = query.where(ResearchRun.status == RunStatus(status_filter.lower()))

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(ResearchRun.question).like(term)
            | func.lower(User.name).like(term)
            | func.lower(User.email).like(term)
        )

    # Count
    count_query = select(func.count(ResearchRun.id)).outerjoin(
        User, ResearchRun.user_id == User.id
    )
    if status_filter and status_filter.lower() in ("done", "running", "failed", "pending"):
        count_query = count_query.where(ResearchRun.status == RunStatus(status_filter.lower()))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        count_query = count_query.where(
            func.lower(ResearchRun.question).like(term)
            | func.lower(User.name).like(term)
            | func.lower(User.email).like(term)
        )
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    results = await db.execute(query.offset(offset).limit(limit))
    rows = results.all()

    items = [
        {
            "id": str(r.id),
            "question": r.question,
            "status": r.status.value,
            "user_name": u_name or "Anonymous Guest",
            "user_email": u_email or "N/A",
            "user_id": str(r.user_id) if r.user_id else None,
            "loop_count": r.loop_count,
            "sources_count": len(r.sources) if r.sources else 0,
            "is_public": r.is_public,
            "share_token": r.share_token,
            "views_count": r.views_count,
            "has_report": bool(r.final_report),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        }
        for r, u_name, u_email in rows
    ]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": items,
    }


@router.get("/runs/{run_id}")
async def get_admin_run_detail(
    run_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns full deep inspection payload for a specific research run."""
    run = await get_run(db, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research run not found.",
        )

    # User info
    user_name = "Anonymous Guest"
    user_email = "N/A"
    if run.user_id:
        user_res = await db.execute(select(User).where(User.id == run.user_id))
        user_obj = user_res.scalar_one_or_none()
        if user_obj:
            user_name = user_obj.name
            user_email = user_obj.email

    # Steps
    steps_res = await db.execute(
        select(StepLog).where(StepLog.run_id == run_id).order_by(StepLog.logged_at)
    )
    steps = steps_res.scalars().all()

    return {
        "id": str(run.id),
        "question": run.question,
        "status": run.status.value,
        "user_name": user_name,
        "user_email": user_email,
        "user_id": str(run.user_id) if run.user_id else None,
        "loop_count": run.loop_count,
        "summary": run.summary,
        "final_report": run.final_report,
        "sources": run.sources or [],
        "documents_metadata": run.documents_metadata or [],
        "urls_metadata": run.urls_metadata or [],
        "follow_up_questions": run.follow_up_questions or [],
        "is_public": run.is_public,
        "share_token": run.share_token,
        "views_count": run.views_count,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "step_logs": [
            {
                "id": str(s.id),
                "step_name": s.step_name,
                "loop_index": s.loop_index,
                "payload": s.payload,
                "logged_at": s.logged_at.isoformat() if s.logged_at else None,
            }
            for s in steps
        ],
    }


# ── 4. Server & Health Telemetry ───────────────────────────────────

@router.get("/server-metrics")
async def get_admin_server_metrics(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns real-time server telemetry: CPU %, RAM, Disk, DB connection,
    Groq LLM model config, and Brevo SMTP relay status.
    """
    settings = get_settings()

    # Disk usage
    total_disk, used_disk, free_disk = shutil.disk_usage("/")

    # Memory / CPU (try psutil if available, otherwise OS metrics)
    cpu_percent = 0.0
    mem_used_mb = 0.0
    mem_total_mb = 0.0
    mem_percent = 0.0

    try:
        import psutil
        cpu_percent = psutil.cpu_percent(interval=None)
        vm = psutil.virtual_memory()
        mem_used_mb = round(vm.used / (1024 * 1024), 1)
        mem_total_mb = round(vm.total / (1024 * 1024), 1)
        mem_percent = vm.percent
    except ImportError:
        # Fallback reading /proc/meminfo on Linux
        if os.path.exists("/proc/meminfo"):
            try:
                meminfo = {}
                with open("/proc/meminfo") as f:
                    for line in f:
                        parts = line.split(":")
                        if len(parts) == 2:
                            meminfo[parts[0].strip()] = int(parts[1].split()[0])
                total_kb = meminfo.get("MemTotal", 1024)
                avail_kb = meminfo.get("MemAvailable", meminfo.get("MemFree", 0))
                used_kb = total_kb - avail_kb
                mem_total_mb = round(total_kb / 1024, 1)
                mem_used_mb = round(used_kb / 1024, 1)
                mem_percent = round((used_kb / total_kb) * 100, 1)
            except Exception:
                pass

    # Database Latency Check
    t0 = time.perf_counter()
    await db.execute(select(1))
    db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    uptime_seconds = int(time.time() - STARTUP_TIME)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": uptime_seconds,
        "cpu": {
            "percent": cpu_percent,
        },
        "memory": {
            "used_mb": mem_used_mb,
            "total_mb": mem_total_mb,
            "percent": mem_percent,
        },
        "disk": {
            "used_gb": round(used_disk / (1024**3), 1),
            "free_gb": round(free_disk / (1024**3), 1),
            "total_gb": round(total_disk / (1024**3), 1),
            "percent": round((used_disk / total_disk) * 100, 1),
        },
        "database": {
            "status": "connected",
            "latency_ms": db_latency_ms,
        },
        "llm_engine": {
            "model": settings.groq_model,
            "status": "active",
        },
        "smtp_relay": {
            "host": settings.smtp_host,
            "port": settings.smtp_port,
            "sender": f"{settings.brevo_sender_name} <{settings.brevo_sender_email}>",
            "status": "configured" if settings.smtp_password or settings.brevo_api_key else "dev_mode",
        },
        "environment": {
            "app_env": settings.app_env,
            "python_version": platform.python_version(),
            "platform": platform.platform(),
        },
    }
