#!/usr/bin/env python3
"""Controleert of alle teksten in de code en in index.html een Franse vertaling hebben.

Wat het controleert:
  - elke tekst in tx("...") in js/*.js en elke vaste tekst in index.html (tekst, placeholder, title, alt, aria-label)
    moet in de woordenlijst FR (js/02-i18n-fr.js) staan;
  - elke vertaling moet dezelfde invulplaatsen ({0}, {1}, ...), dezelfde HTML-tags, hetzelfde aantal regeleinden en
    dezelfde spaties vooraan en achteraan hebben als de Nederlandse tekst.

Gebruik (vanuit de projectmap):
    python3 tools/check-i18n.py
Het script stopt met een foutmelding (exitcode 1) als er iets ontbreekt of niet klopt.
Let op: teksten die niet letterlijk in tx("...") staan (bv. een lijst met keuzes die pas bij het tonen vertaald wordt)
kan dit script niet vinden; test die in de browser met ?lang=fr.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEGEER = {"NL", "FR", "Nederlands", "Français", "Taal / Langue", "Orange Business"}


def js_string(raw):
    """Zet een JavaScript-tekenreeks (met aanhalingstekens) om naar de eigenlijke tekst."""
    body = raw[1:-1]

    def esc(m):
        c = m.group(1)
        if c[0] == "u":
            return chr(int(c[1:], 16))
        return {"n": "\n", "t": "\t", "r": "\r"}.get(c, c)

    return re.sub(r"\\(u[0-9a-fA-F]{4}|.)", esc, body)


def lees_woordenlijst():
    tekst = (ROOT / "js" / "02-i18n-fr.js").read_text(encoding="utf-8")
    fr = {}
    for m in re.finditer(r'^  ("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),$', tekst, re.M):
        fr[json.loads(m.group(1))] = json.loads(m.group(2))
    return fr


def sleutels_uit_js():
    gevonden = {}
    for f in sorted((ROOT / "js").glob("*.js")):
        if f.name in ("00-logo.js", "01-i18n.js", "02-i18n-fr.js"):
            continue
        s = f.read_text(encoding="utf-8")
        for m in re.finditer(r'\btx\(\s*("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')', s):
            gevonden.setdefault(js_string(m.group(1)), f.name)
    return gevonden


class Html(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sleutels, self.skip, self.in_title = {}, 0, False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "title":
            self.in_title = True
        for k, v in attrs:
            if k in ("placeholder", "title", "alt", "aria-label") and v and v not in NEGEER:
                self.sleutels.setdefault(v, "index.html")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        t = data.strip()
        if self.skip or not t or not re.search(r"[A-Za-zÀ-ÿ]", t) or t in NEGEER:
            return
        self.sleutels.setdefault(t, "index.html")


def sleutels_uit_html():
    p = Html()
    p.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    return p.sleutels


def tags(s):
    return [re.sub(r'(title|placeholder)="[^"]*"', r'\1="~"', t) for t in re.findall(r"<[^>]+>", s)]


fr = lees_woordenlijst()
alle = {**sleutels_uit_html(), **sleutels_uit_js()}
ontbreekt = [(k, b) for k, b in alle.items() if k not in fr]
fout = []
for k, v in fr.items():
    if sorted(re.findall(r"\{\d+\}", k)) != sorted(re.findall(r"\{\d+\}", v)):
        fout.append(("invulplaatsen {0}, {1}… verschillen", k, v))
    if tags(k) != tags(v):
        fout.append(("HTML-tags verschillen", k, v))
    if k.count("\n") != v.count("\n"):
        fout.append(("aantal regeleinden verschilt", k, v))
    if k[:1].isspace() != v[:1].isspace() or k[-1:].isspace() != v[-1:].isspace():
        fout.append(("spaties vooraan/achteraan verschillen", k, v))

print(f"{len(alle)} teksten gevonden, {len(fr)} vertalingen in de woordenlijst")
for k, b in ontbreekt:
    print(f"  ONTBREEKT ({b}): {k[:100]!r}")
for w, k, v in fout:
    print(f"  FOUT ({w}): {k[:70]!r} -> {v[:70]!r}")
if ontbreekt or fout:
    sys.exit(1)
print("OK: alle teksten hebben een correcte Franse vertaling.")
