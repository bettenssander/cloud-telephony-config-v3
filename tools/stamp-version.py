#!/usr/bin/env python3
"""Zet in alle bestanden dezelfde versie, zodat een oud of in de cache bewaard bestand opvalt.

Wat het doet:
  - index.html: <meta name="app-version"> en de ?v=-toevoeging achter alle css/js-verwijzingen
    (daardoor haalt de browser na elke nieuwe versie de nieuwe bestanden op in plaats van oude uit de cache);
  - elk js-bestand: de regel  window.VER["..."] = "versie";  bovenaan;
  - het js-bestand met APP_VERSION (de versie die onderaan de pagina getoond wordt).
De pagina vergelijkt bij het openen die versies en toont een melding als er een bestand niet meer klopt.

Gebruik (vanuit de projectmap), na elke wijziging en vóór het uploaden:
    python3 tools/stamp-version.py            # versie = datum + tijd, bv. 2026-10-14.1530
    python3 tools/stamp-version.py 2026-10-14.7   # eigen versie
"""
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
version = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y-%m-%d.%H%M")

# index.html
p = ROOT / "index.html"
h = p.read_text(encoding="utf-8")
h, n1 = re.subn(r'(<meta name="app-version" content=")[^"]*(")', r"\g<1>%s\g<2>" % version, h)
h, n2 = re.subn(r'((?:href|src)="(?:css|js)/[^"?]+)(?:\?v=[^"]*)?(")', r"\g<1>?v=%s\g<2>" % version, h)
p.write_text(h, encoding="utf-8")

# js-bestanden
n3 = 0
for f in sorted((ROOT / "js").glob("*.js")):
    s = f.read_text(encoding="utf-8")
    new, c = re.subn(r'(window\.VER\["%s"\] = ")[^"]*(";)' % re.escape(f.name), r"\g<1>%s\g<2>" % version, s)
    if c != 1:
        sys.exit("Versieregel ontbreekt in " + f.name)
    f.write_text(new, encoding="utf-8")
    n3 += 1
# APP_VERSION in js/01-basis.js (de versie die onderaan de pagina getoond wordt)
p2 = next(f for f in sorted((ROOT / "js").glob("*.js")) if "var APP_VERSION" in f.read_text(encoding="utf-8"))
s2 = p2.read_text(encoding="utf-8")
s2, n4 = re.subn(r'(var APP_VERSION = ")[^"]*(";)', r"\g<1>%s\g<2>" % version, s2)
if n4 != 1:
    sys.exit("APP_VERSION ontbreekt in " + p2.name)
p2.write_text(s2, encoding="utf-8")
if n1 != 1:
    sys.exit("meta app-version ontbreekt in index.html")
print(f"versie {version}: index.html ({n2} verwijzingen) en {n3} js-bestanden bijgewerkt")
