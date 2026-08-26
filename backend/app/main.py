"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager
import html
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.routes import router as research_router, public_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.db.crud import get_run_by_share_token
from app.db.database import engine, Base, AsyncSessionLocal

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup/shutdown logic."""
    setup_logging()
    logger = get_logger(__name__)
    logger.info("startup", env=settings.app_env, model=settings.groq_model)

    # Auto-create tables on first run (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure user_id column and index exist on research_runs if upgrading from older schema
        await conn.execute(
            text(
                "ALTER TABLE research_runs ADD COLUMN IF NOT EXISTS user_id UUID "
                "REFERENCES users(id) ON DELETE CASCADE;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;"
            )
        )
        # Auto-promote initial admin account
        await conn.execute(
            text(
                "UPDATE users SET role = 'admin', is_admin = TRUE WHERE LOWER(email) IN ('samjanjua6@gmail.com', 'aliexports63@gmail.com');"
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_research_runs_user_id ON research_runs(user_id);"
            )
        )
        # Ensure share_token, is_public, and views_count exist
        await conn.execute(
            text(
                "ALTER TABLE research_runs ADD COLUMN IF NOT EXISTS share_token VARCHAR(32) UNIQUE;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE research_runs ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE research_runs ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;"
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_research_runs_share_token ON research_runs(share_token);"
            )
        )

    logger.info("database_tables_ready")
    yield
    logger.info("shutdown")
    await engine.dispose()


app = FastAPI(
    title="Research Assistant Agent",
    description="LangGraph-powered research assistant with FastAPI + PostgreSQL",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(research_router)
app.include_router(public_router)

@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "model": settings.groq_model}


# ── Serve Vite build output & SPA fallback routes ─────────────────
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

@app.get("/r/{share_token}", include_in_schema=False)
async def serve_share_page(share_token: str):
    """Serve public share page with dynamic OpenGraph meta tags for rich social previews."""
    index_file = os.path.join(frontend_dist, "index.html")
    if not os.path.exists(index_file):
        return HTMLResponse("<h1>Frontend build not found</h1>", status_code=404)

    try:
        with open(index_file, "r", encoding="utf-8") as f:
            html_content = f.read()

        async with AsyncSessionLocal() as db:
            run = await get_run_by_share_token(db, share_token)
            if run:
                title = html.escape(f"Research Report: {run.question}")
                raw_desc = run.summary or run.question
                desc = html.escape(raw_desc[:240] + "..." if len(raw_desc) > 240 else raw_desc)
                og_tags = f"""<title>{title}</title>
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{desc}" />"""
                html_content = html_content.replace("<title>Research Assistant Agent</title>", og_tags)

        return HTMLResponse(content=html_content)
    except Exception:
        return FileResponse(index_file)


if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
