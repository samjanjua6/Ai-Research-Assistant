# 🔬 Research Assistant Agent

An autonomous, agentic web researcher powered by **LangGraph** and **Groq**. 

Given a research question, the agent plans a multi-step investigation strategy, searches the web iteratively using DuckDuckGo, self-reviews its drafted findings to detect missing information, and delivers a comprehensive, cited Markdown report in real time.

---

## 🌟 Key Features

- **Autonomous Agent Workflow:** Built with **LangGraph** featuring planning, searching, draft synthesis, iterative self-review loops, and final report generation.
- **Fast LLM Inference:** Powered by Groq's `openai/gpt-oss-120b` (or Llama 3 models) for near-instant reasoning and synthesis.
- **Free Web Search:** Real-time web scraping & search via DuckDuckGo without paid search API dependencies.
- **Real-Time Streaming:** Server-Sent Events (SSE) stream graph execution steps, progress milestones, and search results live to the client.
- **User Authentication & History:** Secure JWT-based authentication with bcrypt hashing, isolated per-user research history, and guest draft preservation.
- **Modern UI & PDF Export:** Dark-themed responsive React UI built with Vite, markdown table rendering via `remark-gfm`, and one-click styled PDF export.

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Agent Framework** | LangGraph 0.2+, LangChain Core |
| **LLM Provider** | Groq (`openai/gpt-oss-120b`) |
| **Search Engine** | DuckDuckGo (`ddgs`) |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2 |
| **Auth & Security** | PyJWT, bcrypt, Email-Validator |
| **Database & ORM** | PostgreSQL 14+, SQLAlchemy 2.0 (Asyncpg) |
| **Streaming** | Server-Sent Events (SSE) |
| **Frontend** | React 18, Vite, React Markdown, Remark GFM |

---

## 🔄 Graph Architecture

```
plan_steps ──► search_web ──► draft_report ──► review_draft
                    ▲                                │
                    │    (gaps found & loop < 3)     │
                    └────────────────────────────────┘
                                                     │
                             (no gaps OR max loops reached)
                                                     ▼
                                              finalize_report
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL (or Docker)
- A [Groq API Key](https://console.groq.com/) (Free tier available)

### 2. Environment Configuration
Create a `.env` file in `backend/` (or copy from `.env.example`):
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=research_helper
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET_KEY=your_jwt_secret_key_here
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📖 API Reference

### Auth Endpoints
- `POST /auth/signup` — Register with name, email, password, and terms acceptance.
- `POST /auth/login` — Authenticate and receive a 7-day JWT access token.
- `GET /auth/me` — Fetch current user profile.
- `GET /auth/terms` — Retrieve Terms of Service and AI disclaimer.

### Research Endpoints
- `POST /research` — Start a new research run for a query.
- `GET /research` — List past research runs for the authenticated user.
- `GET /research/{id}` — Get report details and step logs.
- `GET /research/{id}/stream?token={jwt}` — Stream live agent execution logs via SSE.
- `POST /research/{id}/stop` — Cancel an in-progress research execution.

Interactive Swagger documentation is available at `http://localhost:8000/docs`.

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agent/          # LangGraph graph, state, nodes, and search tools
│   │   ├── api/            # FastAPI routes, auth endpoints, and dependencies
│   │   ├── core/           # Security (bcrypt/JWT), config, and logging
│   │   ├── db/             # SQLAlchemy async engine, models, and CRUD
│   │   └── main.py         # FastAPI application entry point & static mount
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # API client with token interceptor and SSE handling
│   │   ├── components/     # Header, AuthModal, ProgressTimeline, ReportPanel, etc.
│   │   ├── context/        # AuthContext for session management
│   │   ├── hooks/          # useResearch hook
│   │   ├── App.jsx
│   │   └── index.css       # Design tokens & responsive styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 📄 License
This project is open-source and available under the MIT License.
