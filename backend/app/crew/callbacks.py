"""
CrewAI Callback Handlers.
Streams agent thoughts, actions, and task completions to the frontend via SSE
and logs reasoning steps to PostgreSQL.
"""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.events import publish_event
from app.core.logging import get_logger
from app.db.crud import log_step
from app.db.database import AsyncSessionLocal

logger = get_logger(__name__)


class CrewSSECallbackHandler:
    """
    Callback handler for CrewAI execution.
    Broadcasts step and task lifecycle events over SSE to the frontend timeline.
    """

    def __init__(self, run_id: str):
        self.run_id = str(run_id)

    def on_step(self, step_output: Any) -> None:
        """Called by CrewAI on each intermediate agent action/thought."""
        try:
            agent_role = getattr(step_output, "agent", "Agent")
            thought = ""
            if hasattr(step_output, "thought") and step_output.thought:
                thought = str(step_output.thought)
            elif hasattr(step_output, "text"):
                thought = str(step_output.text)

            payload = {
                "agent": str(agent_role),
                "thought": thought[:400] if thought else "Executing analytical sub-step…",
            }

            publish_event(
                self.run_id,
                "step",
                {
                    "run_id": self.run_id,
                    "node": str(agent_role),
                    "loop": 0,
                    "payload": payload,
                },
            )
        except Exception as exc:
            logger.warning("crew_step_callback_error", error=str(exc))

    def on_task_complete(self, task_output: Any, task_name: str) -> None:
        """Called when a CrewAI task completes."""
        try:
            output_str = getattr(task_output, "raw", str(task_output))
            payload = {
                "task": task_name,
                "summary": output_str[:300] if output_str else "Task completed successfully",
            }

            publish_event(
                self.run_id,
                "step",
                {
                    "run_id": self.run_id,
                    "node": task_name,
                    "loop": 0,
                    "payload": payload,
                },
            )

            # Persist step log asynchronously to DB
            async def _persist():
                try:
                    async with AsyncSessionLocal() as db:
                        import uuid
                        await log_step(
                            db,
                            run_id=uuid.UUID(self.run_id),
                            step_name=task_name,
                            loop_index=0,
                            payload=payload,
                        )
                except Exception as db_err:
                    logger.warning("crew_db_log_error", error=str(db_err))

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(_persist())
                else:
                    loop.run_until_complete(_persist())
            except Exception:
                pass
        except Exception as exc:
            logger.warning("crew_task_callback_error", error=str(exc))
