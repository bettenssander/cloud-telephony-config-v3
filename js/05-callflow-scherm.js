// Call-flow: het schema tekenen (tegels, plus-knoppen, menu, instellingenvenster, keuzelijst met nummers).
// (Klassiek script: deelt de globale variabelen en functies met de andere bestanden in js/; laadvolgorde: zie index.html.)

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["05-callflow-scherm.js"] = "2026-10-21.1";

/* ======================================================================
 * CALL-FLOW: tekenen van het schema (tegels, plus-knoppen, menu, venster, keuzelijst met nummers)
 * ====================================================================== */

// Verwijdert een blok; met vervolgstappen eerst een kleine bevestiging.
function askDel(n, x, del) {
  if (
    !slots(n).some(function (s) {
      return s.g();
    })
  ) {
    del();
    return;
  }
  var c = $("conf"),
    r = x.getBoundingClientRect();
  c.innerHTML = tx("<div>Dit blok en alle stappen erna verwijderen?</div>");
  c.appendChild(
    btn(
      tx("Verwijderen"),
      function () {
        c.style.display = "none";
        del();
      },
      "p",
    ),
  );
  c.appendChild(
    btn(tx("Annuleren"), function () {
      c.style.display = "none";
    }),
  );
  c.style.display = "block";
  c.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 250)) + "px";
  c.style.top = Math.max(4, Math.min(r.bottom + 6, window.innerHeight - c.offsetHeight - 8)) + "px";
}
// Tekent één blok als tegel (icoon, naam, sub-tekst, waarschuwing, ✕ en klikgedrag).
function tile(n) {
  var t = document.createElement("button");
  t.type = "button";
  t.className = "tile" + (SEL === n ? " on" : "");
  t.style.setProperty("--c", COL[n.t]);
  t.innerHTML =
    '<span class="ic">' +
    IC[n.t] +
    "</span><b>" +
    SHORT[n.t] +
    "</b><small>" +
    esc(sub(n)) +
    "</small>" +
    (own(n).length ? '<span class="bd">!</span>' : "");
  t._tip = function () {
    return (
      tx("{0}\n{1}\n\n{2}{3}\n\n(klik om de instellingen te openen)", NAME[n.t], HELP[n.t], desc(n), own(n).length ? "\n\n⚠ " + own(n).join("\n⚠ ") : "")
    );
  };
  t.onclick = function () {
    SEL = n;
    render();
    if (window.innerWidth <= 900 && $("panel").scrollIntoView)
      setTimeout(function () {
        $("panel").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
  };
  var dl = DEL.get(n);
  if (dl) {
    var x = document.createElement("span");
    x.className = "x";
    x.textContent = "✕";
    x.onclick = function (e) {
      e.stopPropagation();
      askDel(n, x, dl);
    };
    x._tip = function () {
      return tx("Blok verwijderen");
    };
    t.appendChild(x);
  }
  return t;
}
// Ronde "+"-knop voor een leeg aansluitpunt; pulseert als de stap verplicht is.
function plus(s) {
  var b = btn(
    "+",
    function () {
      openMenu(b, s);
    },
    "plus" + (s.req ? " req" : ""),
  );
  b._tip = function () {
    return (
      tx("Stap toevoegen: {0}{1}", s.l.toLowerCase(), s.req ? "" : tx(" (optioneel; zonder stap eindigt het gesprek hier)"))
    );
  };
  return b;
}
// Opent het keuzemenu met mogelijke vervolgblokken (met sluitknop; sluit ook bij klik ernaast of Esc).
function openMenu(b, s) {
  var m = $("menu");
  m.innerHTML = "";
  var hd = document.createElement("div");
  hd.className = "mh";
  hd.innerHTML = tx("<b>Kies de volgende stap</b>");
  var cx = btn(
    "✕",
    function () {
      m.style.display = "none";
    },
    "cl",
  );
  cx.title = tx("Sluiten");
  hd.appendChild(cx);
  m.appendChild(hd);
  s.al.forEach(function (t) {
    var o = document.createElement("button");
    o.type = "button";
    o.style.setProperty("--c", COL[t]);
    o.innerHTML =
      '<span class="ic">' +
      IC[t] +
      "</span><span><b>" +
      NAME[t] +
      "</b><br><small>" +
      HELP[t] +
      "</small></span>";
    o.onclick = function () {
      var n = mk(t);
      s.s(n);
      SEL = n;
      m.style.display = "none";
      render();
    };
    m.appendChild(o);
  });
  var r = b.getBoundingClientRect();
  m.style.display = "block";
  m.style.left = Math.max(4, Math.min(r.right + 8, window.innerWidth - 310)) + "px";
  m.style.top = Math.max(4, Math.min(r.top, window.innerHeight - m.offsetHeight - 8)) + "px";
}
// Eén aansluiting: label + het gekoppelde blok of een plus-knop.
function slotEl(n, s) {
  var d = document.createElement("div"),
    l = document.createElement("div");
  d.className = "kid";
  l.className = "lab";
  l.textContent = s.l;
  d.appendChild(l);
  var c = s.g();
  if (c)
    d.appendChild(
      nodeEl(c, function () {
        s.s(null);
        render();
      }),
    );
  else d.appendChild(plus(s));
  return d;
}
// Tekent een blok met al zijn aansluitingen, recursief (de boom van links naar rechts).
function nodeEl(n, del) {
  DEL.set(n, del);
  var w = document.createElement("div"),
    S = slots(n);
  w.className = "node";
  w.appendChild(tile(n));
  if (S.length) {
    var k = document.createElement("div");
    k.className = "kids";
    S.forEach(function (s) {
      k.appendChild(slotEl(n, s));
    });
    w.appendChild(k);
  }
  return w;
}
// Zit blok x in de boom van n?
function has(n, x) {
  return (
    n === x ||
    slots(n).some(function (s) {
      var c = s.g();
      return c && has(c, x);
    })
  );
}
// Bloktypes zonder instellingen: voor deze opent geen instellingenvenster.
var NOSET = { msg: 1, hang: 1 };
// Instellingenvenster van het geselecteerde blok (SEL). Bewaart de scrollpositie bij herladen.
function panel() {
  var p = $("panel"),
    n = SEL,
    op =
      n &&
      !NOSET[n.t] &&
      !(
        n.t === "nr" &&
        !D.nrs.some(function (x) {
          return x !== n.nr && FL[x] && FL[x].kid;
        })
      ),
    same = p._n === n,
    st = same ? p.scrollTop : 0;
  p.innerHTML = "";
  p._n = n;
  p.classList.toggle("open", !!op);
  $("pback").classList.toggle("open", !!op);
  if (!op) return;
  var h = document.createElement("div");
  h.className = "bh";
  h.style.setProperty("--c", COL[n.t]);
  h.innerHTML = '<span class="ic">' + IC[n.t] + "</span><span>" + NAME[n.t] + "</span>";
  var xb = btn(
    "✕",
    function () {
      SEL = null;
      render();
    },
    "cl",
  );
  xb.title = tx("Sluiten");
  h.appendChild(xb);
  p.appendChild(h);
  var q = document.createElement("div");
  q.className = "help";
  q.textContent = HELP[n.t];
  p.appendChild(q);
  F[n.t] && F[n.t](p, n);
  p.appendChild(
    btn(
      tx("Klaar"),
      function () {
        SEL = null;
        render();
      },
      "p done",
    ),
  );
  p.scrollTop = st;
}
$("pback").onclick = function () {
  SEL = null;
  if (root) render();
};
// Statusbalk boven het schema: wat nog ontbreekt, en hoeveel nummers een volledige call-flow hebben.
function upd() {
  var o = root.kid ? issues(root, []) : [],
    s = $("st"),
    dn = D.nrs.filter(function (n) {
      return FL[n] && FL[n].kid && !issues(FL[n], []).length;
    }).length;
  s.className = "st" + (o.length ? " w" : "");
  s.innerHTML =
    tx("{0}<div class=\"mu\">{1} van {2} nummers hebben een volledige call-flow</div>", !root.kid
      ? tx("<b>Nog geen call-flow ingesteld voor {0}.</b> Dit is optioneel: klik op de + om er een op te bouwen.", esc(cur))
      : o.length
        ? tx("<b>Nog in te vullen voor {0}:</b><ul>{1}</ul>", esc(cur), o
            .map(function (x) {
              return "<li>" + esc(x) + "</li>";
            })
            .join(""))
        : tx("<b>✔ De call-flow van {0} is volledig.</b>", esc(cur)), dn, D.nrs.length);
  // Is deze call-flow volledig en zijn er nog nummers zonder call-flow? Dan kan er een volgende gemaakt worden.
  if (
    root.kid &&
    !o.length &&
    D.nrs.some(function (n) {
      return n !== cur && !(FL[n] && FL[n].kid);
    })
  )
    s.appendChild(btn(tx("+ Call-flow voor een ander nummer instellen"), nextNr, "p"));
}
// Tekent enkel het schema opnieuw (niet het venster), zodat het typen in een veld niet onderbroken wordt.
function refreshTree() {
  var t = $("tree");
  t.innerHTML = "";
  t.appendChild(nodeEl(root, null));
  fillPick();
  upd();
}
// Volledig opnieuw tekenen: schema, venster, keuzelijst met nummers en status.
function render() {
  $("menu").style.display = "none";
  if (SEL && !has(root, SEL)) SEL = null;
  var t = $("tree");
  t.innerHTML = "";
  t.appendChild(nodeEl(root, null));
  panel();
  fillPick();
  upd();
}
// Kiest het nummer waarvoor de call-flow wordt ingesteld.
function setCur(n) {
  cur = n;
  if (!FL[n]) {
    FL[n] = mk("nr");
    FL[n].nr = n;
  }
  root = FL[n];
  SEL = null;
  flowVis();
  render();
}
// Vult de keuzelijst met alle ingevulde nummers die niet als rechtstreeks nummer bij een gebruiker staan,
// met per nummer de status van de call-flow.
function fillPick() {
  var s = $("selNr"),
    ds = {};
  nrsList().forEach(function (r) {
    expandNums(r[0]).forEach(function (x) {
      ds[x] = r[1];
    });
  });
  s.innerHTML =
    tx("<option value=\"\">– kies een nummer –</option>{0}", D.nrs
      .map(function (n) {
        var r = FL[n],
          st = !r || !r.kid ? "" : issues(r, []).length ? tx("⚠ nog niet volledig") : tx("✔ call-flow volledig");
        return '<option value="' + esc(n) + '">' + esc(n + (ds[n] ? " – " + ds[n] : "") + (st ? "   (" + st + ")" : "")) + "</option>";
      })
      .join(""));
  s.value = cur;
  s.className = cur ? "" : "ask";
  $("pickInfo").textContent =
    tx("{0}Een call-flow instellen is optioneel: nummers waarvoor u niets instelt, blijven zoals ze zijn.", cur ? "" : tx("Kies eerst een nummer. "));
}
// Keuze in de lijst: schema van dat nummer tonen (of niets tonen zolang er geen nummer gekozen is).
$("selNr").onchange = function () {
  if (this.value) setCur(this.value);
  else {
    cur = "";
    root = null;
    SEL = null;
    flowVis();
    panel();
    fillPick();
  }
};
// Terug naar de keuzelijst om een call-flow voor een ander nummer in te stellen.
function nextNr() {
  cur = "";
  root = null;
  SEL = null;
  flowVis();
  panel();
  fillPick();
  var s = $("selNr");
  if (s.scrollIntoView) s.scrollIntoView({ block: "center", behavior: "smooth" });
  try {
    s.focus();
    if (s.showPicker) s.showPicker();
  } catch (e) {
    /* niet elke browser laat dit toe: de lijst blijft dan gewoon gemarkeerd */
  }
}
// Toont het schema pas wanneer een nummer gekozen is.
function flowVis() {
  var on = cur && D.nrs.length ? "" : "none";
  ["fWrap", "st", "fTools"].forEach(function (i) {
    $(i).style.display = on;
  });
}
