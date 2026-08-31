import asyncio
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import dotenv_values
env = dotenv_values("backend/.env")
for k, v in env.items():
    if v:
        os.environ[k] = v

from app.agent.graph import graph

async def test_run():
    state = {
        "run_id": "test-local-1",
        "question": "What are the main advantages of solid state batteries?",
        "source_scope": "all",
        "documents": [],
        "grounded_urls": [],
        "steps": [],
        "search_results": [],
        "draft": "",
        "review_notes": "",
        "gaps_found": False,
        "loop_count": 0,
        "final_report": "",
        "summary": "",
        "sources": [],
        "follow_up_questions": []
    }
    print("\n[START] Starting LangGraph test run...")
    async for chunk in graph.astream(state, stream_mode="updates"):
        for node, update in chunk.items():
            print(f"==> Node finished: {node}")
            if "steps" in update:
                print("  Steps:", update["steps"])
            if "search_results" in update:
                print("  Search results count:", len(update["search_results"]))
            if "draft" in update:
                print("  Draft length:", len(update["draft"]))
            if "final_report" in update:
                print("  Final report length:", len(update["final_report"]))
    print("[DONE] LangGraph completed successfully!\n")

if __name__ == "__main__":
    asyncio.run(test_run())
