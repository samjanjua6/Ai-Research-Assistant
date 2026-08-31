import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import AsyncSessionLocal
from app.db.crud import list_runs, get_run

async def check():
    async with AsyncSessionLocal() as db:
        runs = await list_runs(db, limit=5)
        for r in runs:
            print(f"ID: {r.id} | Status: {r.status} | Question: {r.question[:40]} | Sources: {len(r.sources or [])} | FollowUps: {len(r.follow_up_questions or [])}")
            if r.status.value == "done" or str(r.status) == "done":
                run_data = await get_run(db, r.id)
                print("  Sources sample:", run_data.sources[:2] if run_data.sources else None)
                print("  Follow-up sample:", run_data.follow_up_questions[:2] if run_data.follow_up_questions else None)
                print("  Summary length:", len(run_data.summary or ""))
                print("  Final report length:", len(run_data.final_report or ""))

if __name__ == "__main__":
    asyncio.run(check())
