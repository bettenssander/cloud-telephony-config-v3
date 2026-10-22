// PDF-verslag en overzichtspagina (tekening van de call-flow, tabellen).
// (Klassiek script: deelt de globale variabelen en functies met de andere bestanden in js/; laadvolgorde: zie index.html.)

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["08-pdf-en-overzicht.js"] = "2026-10-21.1";

/* ======================================================================
 * PDF EN OVERZICHT: tekening van de call-flow, tabellen en overzichtspagina
 * ====================================================================== */

// "#rrggbb" -> [r, g, b].
function hex(c) {
  if (c.length === 4)
    c = "#" + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2) + c.charAt(3) + c.charAt(3);
  return [1, 3, 5].map(function (i) {
    return parseInt(c.substr(i, 2), 16);
  });
}
// Tekent het schema van één nummer op een liggende PDF-pagina (auto-schaling) met daaronder de
// tabel "Instellingen van de blokken" (groepen, keuzemenu, openingsuren, forward, voicemail).
function pdfFlow(d, root, nr) {
  var TW = 38,
    TH = 18,
    GAP = 40,
    VG = 6,
    PW = d.internal.pageSize.getWidth(),
    PH = d.internal.pageSize.getHeight(),
    dep = 0;
  function meas(n) {
    var K = slots(n)
        .filter(function (s) {
          return s.g();
        })
        .map(function (s) {
          return { s: s, c: meas(s.g()) };
        }),
      h = 0;
    K.forEach(function (k, i) {
      h += k.c.h + (i ? VG : 0);
    });
    return { n: n, K: K, kh: h, h: Math.max(h, TH) };
  }
  var m = meas(root),
    dets = [];
  (function walk(n) {
    if ({ grp: 1, menu: 1, oh: 1, ext: 1, vm: 1 }[n.t])
      dets.push([
        n.t === "grp" ? tx("Groep {0}", (n.name || "").trim() || "?") : NAME[n.t],
        n.t === "grp"
          ? desc(n).split("\n").slice(1).join("\n")
          : n.t === "menu"
            ? tx("Toetsen: {0}", n.keys
                .map(function (k) {
                  return k.k === "Geen keuze" ? tx("geen keuze (beller drukt niets in)") : k.k;
                })
                .join(", "))
            : desc(n),
      ]);
    slots(n).forEach(function (s) {
      var c = s.g();
      if (c) walk(c);
    });
  })(root);
  var rs = dets.length ? Math.min(75, (PH - 42) * 0.42) : 0;
  function place(m, x, y, dd) {
    m.x = x;
    m.cy = y + m.h / 2;
    dep = Math.max(dep, dd);
    var ky = y + (m.h - m.kh) / 2;
    m.K.forEach(function (k) {
      place(k.c, x + TW + GAP, ky, dd + 1);
      ky += k.c.h + VG;
    });
  }
  place(m, 0, 0, 0);
  var Wt = (dep + 1) * (TW + GAP) - GAP,
    sc = Math.max(0.3, Math.min(1, (PW - 24) / Wt, (PH - 42 - rs) / m.h)),
    ox = 12,
    oy = 32;
  function X(v) {
    return ox + v * sc;
  }
  function Y(v) {
    return oy + v * sc;
  }
  function ln(a, b, c, e) {
    d.line(X(a), Y(b), X(c), Y(e));
  }
  d.setFont("helvetica", "bold");
  d.setFontSize(14);
  d.setTextColor(0);
  d.text(tx("Call-flow – {0}", nr), 12, 16);
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(110);
  d.text(tx("Wat er gebeurt wanneer iemand dit nummer belt"), 12, 22);
  d.setDrawColor(150, 158, 170);
  d.setLineWidth(Math.max(0.2, 0.5 * sc));
  (function lines(m) {
    if (m.K.length) {
      var px = m.x + TW,
        mx = px + 6,
        ys = m.K.map(function (k) {
          return k.c.cy;
        }).concat(m.cy);
      ln(px, m.cy, mx, m.cy);
      ln(mx, Math.min.apply(null, ys), mx, Math.max.apply(null, ys));
      m.K.forEach(function (k) {
        ln(mx, k.c.cy, k.c.x, k.c.cy);
        lines(k.c);
      });
    }
  })(m);
  (function boxes(m) {
    var n = m.n,
      x = X(m.x),
      y = Y(m.cy - TH / 2),
      w = TW * sc,
      h = TH * sc,
      c = hex(COL[n.t]);
    d.setFillColor(255, 255, 255);
    d.setDrawColor(150, 158, 170);
    d.setLineWidth(0.3);
    d.roundedRect(x, y, w, h, 2 * sc, 2 * sc, "FD");
    d.setFillColor(c[0], c[1], c[2]);
    d.rect(x + 0.3, y + 2 * sc, 1.6 * sc, h - 4 * sc, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(Math.max(4, 8 * sc));
    d.setTextColor(20);
    d.text(SHORT[n.t], x + w / 2 + 1, y + h * 0.42, { align: "center" });
    d.setFont("helvetica", "normal");
    d.setFontSize(Math.max(3.5, 6.5 * sc));
    d.setTextColor(100);
    d.text(d.splitTextToSize(sub(n) || "", w - 5).slice(0, 2), x + w / 2 + 1, y + h * 0.68, {
      align: "center",
    });
    m.K.forEach(function (k) {
      var lx = X((m.x + TW + 6 + k.c.x) / 2),
        ly = Y(k.c.cy),
        t = k.s.l;
      d.setFont("helvetica", "bold");
      d.setFontSize(Math.max(3.5, 5.5 * sc));
      var tw = d.getTextWidth(t) + 3 * sc,
        th = 4.2 * sc;
      d.setFillColor(255, 255, 255);
      d.setDrawColor(150, 158, 170);
      d.setLineWidth(0.2);
      d.roundedRect(lx - tw / 2, ly - th / 2, tw, th, th / 2, th / 2, "FD");
      d.setTextColor(40);
      d.text(t, lx, ly + 1.3 * sc, { align: "center" });
      boxes(k.c);
    });
  })(m);
  d.setTextColor(0);
  if (dets.length) {
    var ty = Y(m.h) + 9;
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    d.text(tx("Instellingen van de blokken"), 12, ty);
    d.setFont("helvetica", "normal");
    d.autoTable({
      startY: ty + 2,
      head: [[tx("Blok"), tx("Instellingen")]],
      body: dets,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [255, 121, 0], textColor: [0, 0, 0] },
      margin: { left: 12, right: 12, bottom: 12 },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
    });
  }
}
// Maakt tekst veilig voor gebruik in HTML.
function esc(t) {
  var d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}
// HTML-tabel voor het overzicht.
function table(h, rows) {
  return (
    "<table><tr>" +
    h
      .map(function (x) {
        return "<th>" + esc(x) + "</th>";
      })
      .join("") +
    "</tr>" +
    rows
      .map(function (r) {
        return (
          "<tr>" +
          r
            .map(function (x) {
              return "<td>" + esc(x || "") + "</td>";
            })
            .join("") +
          "</tr>"
        );
      })
      .join("") +
    "</table>"
  );
}
// Bouwt de overzichtspagina (stap 6).
function summary() {
  var o = gather();
  $("sum").innerHTML =
    tx("<h3>Klant</h3>{0}<h3>Telefoonnummers</h3>{1}<h3>Randapparatuur</h3>{2}<h3>Nummerplan</h3>{3}<h3>Call-flow</h3>{4}", table(
      [tx("Veld"), tx("Waarde")],
      [
        [tx("Bedrijfsnaam"), o.bedrijf],
        [tx("Adres"), o.adres],
        [tx("Contactpersoon"), o.contact],
      ],
    ), table([tx("Nummer"), tx("Omschrijving")], o.nrs), table([tx("Apparaat"), tx("Configuratie")], o.ap), table(
      [tx("Intern"), tx("Rechtstreeks"), tx("Voornaam"), tx("Familienaam"), tx("Apps"), tx("GSM"), tx("E-mail")],
      o.ppl.map(function (u) {
        return [u.i, u.r, u.v, u.f, u.app, u.g, u.m];
      }),
    ), table([tx("Nummer"), tx("Call-flow")], o.flows));
}
// Sluit het stapmenu bij een klik ernaast.
document.addEventListener("click", function (e) {
  var m = $("menu");
  if (
    m.style.display === "block" &&
    !m.contains(e.target) &&
    !(e.target.closest && e.target.closest(".plus"))
  )
    m.style.display = "none";
});
// Esc sluit menu, bevestigingsvenster en instellingenvenster.
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  $("menu").style.display = "none";
  $("conf").style.display = "none";
  if (SEL) {
    SEL = null;
    if (root) render();
  }
});
