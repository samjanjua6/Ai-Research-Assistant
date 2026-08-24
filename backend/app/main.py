"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from sqlalchemy import text
from app.api.routes import router as research_router
from app.api.auth import router as auth_router
from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.db.database import engine, Base

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
                "CREATE INDEX IF NOT EXISTS ix_research_runs_user_id ON research_runs(user_id);"
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
app.include_router(research_router)

@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "model": settings.groq_model}


# ── Serve Vite build output (must be last — catches all remaining routes) ─────
# In dev, use `npm run dev` in frontend/ instead (Vite dev server with HMR).
# In production, run `npm run build` first, then this serves the output.
# __file__ is backend/app/main.py → ../.. = project root → frontend/dist
frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
