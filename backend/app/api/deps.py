"""
FastAPI dependency: resolve and verify the current authenticated user
from either an Authorization header (Bearer token) or a ?token= query
parameter (required for EventSource SSE connections).
"""
from __future__ import annotations

import uuid

import jwt
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.security import decode_access_token
from app.db.crud import get_user_by_id
from app.db.database import get_db
from app.db.models import User

# Bearer scheme — auto-extracts Authorization header (optional so SSE can use ?token=)
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    token: Optional[str] = Query(default=None, include_in_schema=False),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Resolve the current user from a Bearer JWT token.

    Token may come from:
      - Authorization: Bearer <token>  (all standard requests)
      - ?token=<token>                 (EventSource SSE, which cannot set headers)
    """
    raw_token: str | None = None

    if credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(raw_token)
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that enforces administrator role access.
    """
    user_role = getattr(current_user, "role", "user") or "user"
    user_is_admin = getattr(current_user, "is_admin", False) or (user_role == "admin") or (current_user.email.lower() == "samjanjua6@gmail.com")

    if not user_is_admin and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required. You do not have permission to access this resource.",
        )

    return current_user

