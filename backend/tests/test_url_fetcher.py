import unittest
from app.agent.url_fetcher import (
    normalize_url,
    _extract_arxiv,
    _extract_wikipedia,
    _extract_universal,
    format_grounded_urls_for_context,
)


class TestUrlFetcher(unittest.TestCase):

    def test_normalize_url(self):
        self.assertEqual(normalize_url("example.com"), "https://example.com")
        self.assertEqual(normalize_url("https://example.com"), "https://example.com")
        self.assertEqual(normalize_url("http://example.com/path"), "http://example.com/path")

    def test_extract_arxiv(self):
        mock_arxiv_html = """
        <html>
        <head><title>[2401.12345] Deep Quantum Architecture</title></head>
        <body>
            <h1 class="title"><span class="descriptor">Title:</span>Deep Quantum Architecture for LLMs</h1>
            <div class="authors"><span class="descriptor">Authors:</span>Alice Smith, Bob Jones</div>
            <blockquote class="abstract"><span class="descriptor">Abstract:</span>We present a novel quantum transformer model achieving superior performance.</blockquote>
            <td class="tablecell subjects">Quantum Physics (quant-ph); Artificial Intelligence (cs.AI)</td>
        </body>
        </html>
        """
        title, preview, full_text = _extract_arxiv(mock_arxiv_html, "https://arxiv.org/abs/2401.12345")
        self.assertEqual(title, "Deep Quantum Architecture for LLMs")
        self.assertIn("Alice Smith, Bob Jones", full_text)
        self.assertIn("novel quantum transformer model", full_text)
        self.assertIn("quant-ph", full_text)
        self.assertIn("We present a novel quantum transformer", preview)

    def test_extract_wikipedia(self):
        mock_wiki_html = """
        <html>
        <body>
            <h1 id="firstHeading">Artificial Neural Network</h1>
            <div id="bodyContent">
                <div class="mw-editsection">[edit]</div>
                <table class="infobox"><tr><td>Infobox clutter</td></tr></table>
                <p>An artificial neural network is an interconnected group of nodes inspired by biological brains.</p>
                <p>These systems learn to perform tasks by considering examples without prior explicit programming.</p>
                <div class="navbox">Navigation menu</div>
            </div>
        </body>
        </html>
        """
        title, preview, full_text = _extract_wikipedia(mock_wiki_html, "https://en.wikipedia.org/wiki/Artificial_neural_network")
        self.assertEqual(title, "Artificial Neural Network")
        self.assertIn("interconnected group of nodes", full_text)
        self.assertNotIn("Infobox clutter", full_text)
        self.assertNotIn("[edit]", full_text)
        self.assertNotIn("Navigation menu", full_text)

    def test_extract_universal(self):
        mock_blog_html = """
        <html>
        <head>
            <meta property="og:title" content="State of Modern AI in 2026" />
        </head>
        <body>
            <header><nav><a href="/">Home</a><a href="/pricing">Pricing</a></nav></header>
            <script>console.log("analytics");</script>
            <article>
                <h1>State of Modern AI in 2026</h1>
                <p>The transition toward agentic workflows has fundamentally shifted developer productivity.</p>
                <p>Multi-agent collaboration enables complex synthesis of diverse information corpora.</p>
            </article>
            <footer><p>Copyright 2026. All rights reserved.</p></footer>
        </body>
        </html>
        """
        title, preview, full_text = _extract_universal(mock_blog_html, "https://techblog.com/state-of-ai-2026")
        self.assertEqual(title, "State of Modern AI in 2026")
        self.assertIn("agentic workflows has fundamentally shifted", full_text)
        self.assertIn("Multi-agent collaboration", full_text)
        self.assertNotIn("console.log", full_text)
        self.assertNotIn("Pricing", full_text)
        self.assertNotIn("Copyright 2026", full_text)

    def test_format_grounded_urls_for_context(self):
        mock_urls = [
            {
                "title": "Quantum Paper",
                "domain": "arxiv.org",
                "url": "https://arxiv.org/abs/2401.12345",
                "word_count": 500,
                "full_text": "Detailed quantum transformer architecture findings and benchmark numbers.",
            }
        ]
        context = format_grounded_urls_for_context(mock_urls)
        self.assertIn("[GROUNDED WEB URL: Quantum Paper]", context)
        self.assertIn("arxiv.org", context)
        self.assertIn("Detailed quantum transformer architecture", context)


if __name__ == "__main__":
    unittest.main()
