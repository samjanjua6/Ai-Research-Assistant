"""
In-memory async Pub/Sub event bus for live streaming events (tokens, steps, done).
Enables zero-latency broadcasting from LangGraph nodes directly to active SSE connections.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

# Maps run_id (str) -> set of asyncio.Queue instances
RUN_SUBSCRIBERS: dict[str, set[asyncio.Queue]] = {}


def subscribe(run_id: str) -> asyncio.Queue:
    """Register a new SSE subscriber queue for a specific research run."""
    queue: asyncio.Queue = asyncio.Queue()
    RUN_SUBSCRIBERS.setdefault(run_id, set()).add(queue)
    return queue


def unsubscribe(run_id: str, queue: asyncio.Queue) -> None:
    """Remove a subscriber queue when the SSE connection disconnects."""
    if run_id in RUN_SUBSCRIBERS:
        RUN_SUBSCRIBERS[run_id].discard(queue)
        if not RUN_SUBSCRIBERS[run_id]:
            RUN_SUBSCRIBERS.pop(run_id, None)


def publish_event(run_id: str, event_type: str, data: dict[str, Any]) -> None:
    """
    Broadcast an event to all active subscriber queues for a run.
    event_type can be 'token', 'step', 'done', or 'ping'.
    """
    subscribers = RUN_SUBSCRIBERS.get(run_id)
    if not subscribers:
        return

    payload = {
        "event": event_type,
        "data": json.dumps(data) if isinstance(data, dict) else str(data),
    }

    for queue in list(subscribers):
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass
        except Exception:
            pass
