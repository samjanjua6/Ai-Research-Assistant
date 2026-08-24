/**
 * Research Assistant — Frontend App
 *
 * Flow:
 *  1. User types question → POST /research → get run_id
 *  2. Open SSE stream → GET /research/{run_id}/stream
 *  3. Render each "step" event in the progress timeline
 *  4. On "done" event → render final report + sources
 */

const API_BASE = "";

// ── DOM refs ──────────────────────────────────────────────────────
const questionInput = document.getElementById("question-input");
const submitBtn     = document.getElementById("submit-btn");
const btnText       = document.getElementById("btn-text");
const btnSpinner    = document.getElementById("btn-spinner");
const errorMsg      = document.getElementById("error-msg");

const progressPanel = document.getElementById("progress-panel");
const stepList      = document.getElementById("step-list");

const reportPanel   = document.getElementById("report-panel");
const summaryBox    = document.getElementById("summary-box");
const reportBody    = document.getElementById("report-body");
const sourcesList   = document.getElementById("sources-list");

const placeholder   = document.getElementById("placeholder");
const historyList   = document.getElementById("history-list");
const copyBtn       = document.getElementById("copy-btn");

// ── Node metadata for the timeline ───────────────────────────────
const NODE_META = {
  plan_steps:      { icon: "🧭", label: "Planning sub-questions" },
  search_web:      { icon: "🔍", label: "Searching the web"      },
  draft_report:    { icon: "✍️",  label: "Drafting report"        },
  review_draft:    { icon: "🔎", label: "Reviewing draft"         },
  finalize_report: { icon: "📋", label: "Finalising report"       },
};

// ── State ─────────────────────────────────────────────────────────
let activeEventSource = null;

// ── Helpers ───────────────────────────────────────────────────────
function setLoading(on) {
  submitBtn.disabled  = on;
  btnText.classList.toggle("hidden", on);
  btnSpinner.classList.toggle("hidden", !on);
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function clearError() {
  errorMsg.textContent = "";
  errorMsg.classList.add("hidden");
}

function showSection(which) {
  // which: "placeholder" | "progress" | "report"
  placeholder.classList.add("hidden");
  progressPanel.classList.add("hidden");
  reportPanel.classList.add("hidden");

  if (which === "placeholder") placeholder.classList.remove("hidden");
  if (which === "progress")    progressPanel.classList.remove("hidden");
  if (which === "report")      reportPanel.classList.remove("hidden");
}

/** Very lightweight markdown → HTML (headings, bold, code, paragraphs). */
function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>(\n)?)+/g, m => `<ul>${m}</ul>`)
    // Citations like [1]
    .replace(/\[(\d+)\]/g, '<sup class="cite">[$1]</sup>')
    // Double newlines → paragraphs
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block =>
      /^<(h[123]|ul|ol|li)/.test(block) ? block : `<p>${block}</p>`
    )
    .join("\n");
  return html;
}

// ── Add a step row to the timeline ───────────────────────────────
function addStepItem(nodeName, loopIndex) {
  const meta = NODE_META[nodeName] || { icon: "⚙️", label: nodeName };
  const li = document.createElement("li");
  li.className = "step-item";
  li.innerHTML = `
    <span class="step-icon">${meta.icon}</span>
    <div class="step-content">
      <div class="step-name">${meta.label}</div>
      ${loopIndex > 0 ? `<div class="step-loop">Loop ${loopIndex}</div>` : ""}
    </div>`;
  stepList.appendChild(li);
  li.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Render the final report ───────────────────────────────────────
function renderReport(data) {
  summaryBox.textContent  = data.summary || "";
  reportBody.innerHTML    = renderMarkdown(data.final_report || "");

  sourcesList.innerHTML   = "";
  (data.sources || []).forEach((url, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${url}" target="_blank" rel="noopener">[${i + 1}] ${url}</a>`;
    sourcesList.appendChild(li);
  });

  showSection("report");
  progressPanel.classList.remove("hidden"); // keep timeline visible alongside
}

// ── Copy report to clipboard ──────────────────────────────────────
copyBtn.addEventListener("click", () => {
  const text = reportBody.innerText;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "✅ Copied";
    setTimeout(() => (copyBtn.textContent = "📋 Copy"), 2000);
  });
});

// ── SSE Streaming ─────────────────────────────────────────────────
function openStream(runId) {
  if (activeEventSource) {
    activeEventSource.close();
    activeEventSource = null;
  }

  stepList.innerHTML = "";
  showSection("progress");
  progressPanel.classList.remove("hidden");
  reportPanel.classList.add("hidden");

  const url = `${API_BASE}/research/${runId}/stream`;
  const es = new EventSource(url);
  activeEventSource = es;

  es.addEventListener("step", (e) => {
    const data = JSON.parse(e.data);
    addStepItem(data.node, data.loop || 0);
  });

  es.addEventListener("done", (e) => {
    es.close();
    activeEventSource = null;
    setLoading(false);
    const data = JSON.parse(e.data);
    if (data.status === "done") {
      renderReport(data);
    } else {
      showError(data.error ? `Research failed: ${data.error}` : "The research run failed. Check the server logs.");
      showSection("placeholder");
    }
    loadHistory();
  });

  es.onerror = () => {
    // SSE reconnects automatically; only abort if already done
    if (!activeEventSource) return;
    es.close();
    activeEventSource = null;
    setLoading(false);
    showError("Stream connection lost. Reload to retry.");
  };
}

// ── Submit research question ──────────────────────────────────────
submitBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  if (!question) {
    showError("Please enter a research question.");
    return;
  }

  clearError();
  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const { run_id } = await res.json();
    openStream(run_id);
    loadHistory();

  } catch (err) {
    setLoading(false);
    showError(`Error: ${err.message}`);
  }
});

// ── History ───────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/research`);
    if (!res.ok) return;
    const runs = await res.json();
    renderHistory(runs);
  } catch (_) {
    /* silently skip if server not ready */
  }
}

function renderHistory(runs) {
  historyList.innerHTML = "";
  if (!runs.length) {
    historyList.innerHTML = '<li class="empty-hint">No runs yet.</li>';
    return;
  }
  runs.forEach(run => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.dataset.runId = run.id;
    const time = new Date(run.created_at).toLocaleTimeString();
    li.innerHTML = `
      <div class="h-question" title="${run.question}">${run.question}</div>
      <div class="h-meta">
        <span class="status-dot status-${run.status}"></span>
        ${run.status} · ${time}
      </div>`;
    li.addEventListener("click", () => loadRunDetail(run.id));
    historyList.appendChild(li);
  });
}

async function loadRunDetail(runId) {
  try {
    const res = await fetch(`${API_BASE}/research/${runId}`);
    if (!res.ok) return;
    const run = await res.json();

    if (run.status === "done") {
      stepList.innerHTML = "";
      showSection("progress");
      renderReport({
        summary:      run.summary,
        final_report: run.final_report,
        sources:      run.sources,
      });
    } else if (run.status === "running") {
      stepList.innerHTML = "";
      openStream(runId);
    }
  } catch (_) { /* skip */ }
}

// ── Enter key submits ─────────────────────────────────────────────
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    submitBtn.click();
  }
});

// ── Init ──────────────────────────────────────────────────────────
loadHistory();
