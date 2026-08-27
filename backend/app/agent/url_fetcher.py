"""
Intelligent Web URL Grounding & Specialized Platform Extractors.
Supports arXiv, GitHub, Wikipedia, and Universal Web HTML extraction
with boilerplate cleaning, metadata extraction, and URL Passport generation.
"""

from __future__ import annotations

import re
import uuid
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.agent.scoring import extract_clean_domain


BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def normalize_url(url: str) -> str:
    """Ensure URL has http/https scheme and is stripped."""
    u = url.strip()
    if not u.startswith("http://") and not u.startswith("https://"):
        u = "https://" + u
    return u


def _extract_arxiv(html: str, url: str) -> tuple[str, str, str]:
    """Specialized parser for arXiv abstract pages."""
    soup = BeautifulSoup(html, "html.parser")
    title_el = soup.find("h1", class_="title")
    title = title_el.get_text().replace("Title:", "").strip() if title_el else ""

    authors_el = soup.find("div", class_="authors")
    authors = authors_el.get_text().replace("Authors:", "").strip() if authors_el else ""

    abstract_el = soup.find("blockquote", class_="abstract")
    abstract = abstract_el.get_text().replace("Abstract:", "").strip() if abstract_el else ""

    subjects_el = soup.find("td", class_="tablecell subjects")
    subjects = subjects_el.get_text().strip() if subjects_el else ""

    if not title:
        title = soup.title.get_text().strip() if soup.title else "arXiv Research Paper"

    body_parts = []
    if authors:
        body_parts.append(f"Authors: {authors}")
    if subjects:
        body_parts.append(f"Subjects: {subjects}")
    if abstract:
        body_parts.append(f"Abstract:\n{abstract}")

    full_text = "\n\n".join(body_parts) if body_parts else soup.get_text()
    preview = abstract[:300] + ("..." if len(abstract) > 300 else "") if abstract else full_text[:300]
    return title, preview, full_text


def _extract_wikipedia(html: str, url: str) -> tuple[str, str, str]:
    """Specialized parser for Wikipedia articles."""
    soup = BeautifulSoup(html, "html.parser")

    # Strip navigation, references, and infobox clutter
    for tag in soup.find_all(["table", "nav", "footer", "style", "script", "noscript", "aside"]):
        tag.decompose()
    for cl in ["mw-editsection", "navbox", "reflist", "reference", "catlinks", "portal"]:
        for el in soup.find_all(class_=cl):
            el.decompose()

    title_el = soup.find("h1", id="firstHeading")
    title = title_el.get_text().strip() if title_el else (soup.title.get_text().strip() if soup.title else "Wikipedia Article")

    content_el = soup.find("div", id="bodyContent") or soup.find("div", id="content") or soup.body
    paragraphs = []
    if content_el:
        for p in content_el.find_all(["p", "h2", "h3", "li"]):
            txt = p.get_text().strip()
            if len(txt) > 20:
                paragraphs.append(txt)

    full_text = "\n\n".join(paragraphs)
    preview = paragraphs[0][:300] + ("..." if len(paragraphs[0]) > 300 else "") if paragraphs else full_text[:300]
    return title, preview, full_text


def _extract_universal(html: str, url: str) -> tuple[str, str, str]:
    """Universal HTML cleaner for blogs, news, and technical documentation."""
    soup = BeautifulSoup(html, "html.parser")

    # Extract title
    title = ""
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = str(og_title["content"]).strip()
    elif soup.title and soup.title.get_text().strip():
        title = soup.title.get_text().strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text().strip()
    else:
        title = urlparse(url).netloc

    # Remove non-content elements
    for tag in soup.find_all([
        "script", "style", "nav", "header", "footer", "aside",
        "iframe", "noscript", "svg", "button", "input", "form"
    ]):
        tag.decompose()

    # Find primary content container if available
    main_el = soup.find("article") or soup.find("main") or soup.find("div", role="main") or soup.body

    paragraphs = []
    if main_el:
        for el in main_el.find_all(["p", "h1", "h2", "h3", "h4", "li"]):
            t = el.get_text().strip()
            t = re.sub(r"\s+", " ", t)
            if len(t) > 25:
                paragraphs.append(t)

    full_text = "\n\n".join(paragraphs)
    if not full_text:
        # Fallback to general text extraction
        full_text = re.sub(r"\n\s*\n", "\n\n", soup.get_text().strip())

    preview_first = paragraphs[0] if paragraphs else full_text
    preview = preview_first[:300] + ("..." if len(preview_first) > 300 else "")

    return title, preview, full_text


async def fetch_and_parse_url(url: str) -> dict[str, Any]:
    """
    Asynchronously fetches a public URL, strips boilerplate HTML,
    extracts structured text, and returns a comprehensive URL Passport.
    """
    clean_url = normalize_url(url)
    domain = extract_clean_domain(clean_url)

    async with httpx.AsyncClient(
        headers=BROWSER_HEADERS,
        timeout=12.0,
        follow_redirects=True,
        verify=False,
    ) as client:
        try:
            # Special fast-path for GitHub repositories: try raw README.md
            if "github.com" in domain and not clean_url.endswith(".git") and "/blob/" not in clean_url:
                gh_match = re.match(r"https?://github\.com/([^/]+)/([^/]+)/?$", clean_url)
                if gh_match:
                    owner, repo = gh_match.group(1), gh_match.group(2)
                    raw_readme_url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.md"
                    raw_resp = await client.get(raw_readme_url)
                    if raw_resp.status_code == 200 and raw_resp.text:
                        raw_text = raw_resp.text.strip()
                        title = f"GitHub: {owner}/{repo}"
                        preview = raw_text[:300] + ("..." if len(raw_text) > 300 else "")
                        words = len(raw_text.split())
                        return {
                            "id": f"url_{uuid.uuid4().hex[:8]}",
                            "url": clean_url,
                            "domain": domain,
                            "title": title,
                            "word_count": words,
                            "char_count": len(raw_text),
                            "preview": preview,
                            "full_text": raw_text[:40000],
                            "status": "ok",
                        }

            resp = await client.get(clean_url)
            resp.raise_for_status()
            html = resp.text
        except Exception as exc:
            raise ValueError(f"Could not fetch URL ({domain}): {str(exc)}") from exc

    # Dispatch to specialized or universal extractor
    if "arxiv.org" in domain:
        title, preview, full_text = _extract_arxiv(html, clean_url)
    elif "wikipedia.org" in domain:
        title, preview, full_text = _extract_wikipedia(html, clean_url)
    else:
        title, preview, full_text = _extract_universal(html, clean_url)

    # Sanitize title
    title = re.sub(r"\s+", " ", title).strip()
    if not title:
        title = domain

    total_words = len(full_text.split())
    total_chars = len(full_text)

    return {
        "id": f"url_{uuid.uuid4().hex[:8]}",
        "url": clean_url,
        "domain": domain,
        "title": title,
        "word_count": total_words,
        "char_count": total_chars,
        "preview": preview,
        "full_text": full_text[:40000],
        "status": "ok" if total_words > 50 else "partial",
    }


def format_grounded_urls_for_context(
    urls: list[dict[str, Any]],
    max_chars: int = 35000,
) -> str:
    """
    Formats grounded URL contents into a structured context block for the LLM.
    """
    if not urls:
        return ""

    formatted_blocks = []
    budget_per_url = max_chars // len(urls)

    for u in urls:
        title = u.get("title", "Web Page")
        domain = u.get("domain", "")
        raw_url = u.get("url", "")
        body = u.get("full_text", "")[:budget_per_url]

        header = f"### [GROUNDED WEB URL: {title}] (Domain: {domain}, URL: {raw_url}, Words: {u.get('word_count', 0)})"
        formatted_blocks.append(f"{header}\n{body}")

    return "\n\n---\n\n".join(formatted_blocks)
