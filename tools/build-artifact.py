#!/usr/bin/env python3
"""Maakt één zelfstandig HTML-bestand voor snelle tests in Claude (het "artifact").

Claude kan maar één bestand tonen. Dit script plakt css/style.css en alle js/*.js in index.html
en schrijft het resultaat naar artifact/cloud-telephony-configuratie.html.
De PDF-bibliotheken blijven via cdnjs geladen (het systeem werkt enkel online).

Gebruik (vanuit de projectmap):
    python3 tools/build-artifact.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")


def inline_css(m):
    return "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "</style>"


def inline_js(m):
    code = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return "<script>\n" + code.replace("</script", "<\\/script") + "</script>"


html, n_css = re.subn(r'<link rel="stylesheet" href="(css/[^"?]+)(?:\?[^"]*)?">', inline_css, html)
html, n_js = re.subn(r'<script src="(js/[^"?]+)(?:\?[^"]*)?"></script>', inline_js, html)
if not n_css or not n_js:
    raise SystemExit("Geen css/js-verwijzingen gevonden in index.html")

out = ROOT / "artifact" / "cloud-telephony-configuratie.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"geschreven: {out.relative_to(ROOT)} ({len(html)} tekens; {n_css} css, {n_js} js ingebouwd)")
