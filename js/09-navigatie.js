// Navigatie tussen de stappen en de PDF-download.
// (Klassiek script: deelt de globale variabelen en functies met de andere bestanden in js/; laadvolgorde: zie index.html.)

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["09-navigatie.js"] = "2026-10-21.1";

/* ======================================================================
 * NAVIGATIE: stappen tonen, klikbare stappenbalk en PDF-download
 * ====================================================================== */

// Toont stap s en voert de voorbereiding ervan uit (keuzelijsten vullen, schema starten, overzicht bouwen).
function show(s) {
  step = s;
  document.querySelectorAll(".step").forEach(function (e) {
    e.classList.toggle("show", +e.dataset.s === s);
  });
  document.querySelectorAll("#bar i").forEach(function (e, k) {
    e.classList.toggle("on", k <= s);
    e.classList.toggle("cur", k === s);
  });
  $("prev").style.visibility = s ? "visible" : "hidden";
  $("next").style.display = s === N - 1 ? "none" : "";
  $("err").textContent = "";
  if (s === 2) fillNrSel();
  if (s === 3) fillRn();
  if (s === 4) initFlow();
  document.querySelectorAll("main,.in").forEach(function (e) {
    e.style.maxWidth = s === 3 || s === 4 ? "1320px" : "760px";
  });
  if (s === N - 1) summary();
  window.scrollTo(0, 0);
  cond();
}
$("prev").onclick = function () {
  show(step - 1);
};
$("next").onclick = function () {
  var e = check(step);
  if (e) {
    $("err").textContent = e;
    return;
  }
  show(step + 1);
};

// PDF-verslag maken met jsPDF/autoTable en downloaden (in Claude via de download-API, anders via een gewone link).
$("pdf").onclick = async function () {
  var msg = $("pdfMsg");
  msg.textContent = "";
  try {
    var o = gather(),
      J = window.jspdf.jsPDF,
      d = new J({ unit: "mm", format: "a4" }),
      y = 20,
      W = d.internal.pageSize.getWidth();
    var im = document.querySelector(".logo");
    if (im && im.naturalWidth) {
      var lw = 44,
        lh = (lw * im.naturalHeight) / im.naturalWidth;
      d.setFillColor(0, 0, 0);
      d.rect(0, 0, W, lh + 8, "F");
      d.setFillColor(255, 121, 0);
      d.rect(0, lh + 8, W, 1.2, "F");
      d.addImage(im.src, "JPEG", 10, 4, lw, lh);
      y = lh + 22;
    }
    d.setFontSize(18);
    d.text(tx("Cloud Telephony – configuratie"), 14, y);
    y += 7;
    d.setFontSize(10);
    d.setTextColor(110);
    d.text(tx("Opgemaakt op {0}", new Date().toLocaleDateString(LANG === "fr" ? "fr-BE" : "nl-BE")), 14, y);
    d.setTextColor(0);
    y += 8;
    function sec(t, h, rows, w) {
      d.setFontSize(12);
      d.text(t, 14, y);
      d.autoTable({
        startY: y + 2,
        head: [h],
        body: rows,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 121, 0], textColor: [0, 0, 0] },
        margin: { left: 14, right: 14 },
        columnStyles: w || {},
      });
      y = d.lastAutoTable.finalY + 9;
    }
    sec(
      tx("Klantgegevens"),
      [tx("Veld"), tx("Waarde")],
      [
        [tx("Bedrijfsnaam"), o.bedrijf],
        [tx("Adres"), o.adres],
        [tx("Contactpersoon"), o.contact],
      ],
      { 0: { cellWidth: 45 } },
    );
    sec(tx("Telefoonnummers"), [tx("Nummer"), tx("Omschrijving")], o.nrs.length ? o.nrs : [["-", "-"]]);
    sec(tx("Randapparatuur"), [tx("Apparaat"), tx("Configuratie")], o.ap, { 0: { cellWidth: 35 } });
    sec(
      tx("Nummerplan"),
      [tx("Intern"), tx("Rechtstr."), tx("Voornaam"), tx("Familienaam"), tx("Apps"), tx("GSM"), tx("E-mail")],
      o.ppl.map(function (u) {
        return [u.i, u.r || "-", u.v, u.f, u.app, u.g || "-", u.m];
      }),
    );
    sec(tx("Call-flow"), [tx("Nummer"), tx("Call-flow")], o.flows, { 0: { cellWidth: 35 } });
    var um2 = usedMap();
    allNums().forEach(function (nr) {
      var f = FL[nr];
      if (f && f.kid && !um2[nr]) {
        d.addPage("a4", "landscape");
        pdfFlow(d, f, nr);
      }
    });
    var pages = d.getNumberOfPages();
    for (var i = 1; i <= pages; i++) {
      d.setPage(i);
      d.setFontSize(8);
      d.setTextColor(120);
      d.text(i + " / " + pages, d.internal.pageSize.getWidth() - 14, d.internal.pageSize.getHeight() - 8, {
        align: "right",
      });
    }
    var dt = new Date(),
      pad = function (n) {
        return (n < 10 ? "0" : "") + n;
      },
      stamp = dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate()),
      title =
        tx("Cloud_Telephony_Configuratie_{0}_{1}", o.bedrijf.replace(/[^A-Za-z0-9\u00C0-\u00FF]+/g, "_").replace(/^_+|_+$/g, "") || tx("klant"), stamp);
    d.setProperties({ title: title });
    var blob = d.output("blob"),
      name = title + ".pdf";
    var dl = window.claude && (await window.claude.use("downloads"));
    if (!dl) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 3000);
      msg.textContent = tx("PDF gedownload.");
      return;
    }
    await dl.save({ filename: name, data: blob });
    msg.textContent = tx("PDF opgeslagen.");
  } catch (e) {
    msg.textContent =
      e && e.code === "declined" ? tx("Download geannuleerd.") : tx("PDF maken mislukt: {0}", (e && e.message) || e);
  }
};
// Springt naar een stap; vooruit springen controleert eerst alle stappen ertussen.
function goto(k) {
  if (k <= step) {
    show(k);
    return;
  }
  for (var j = step; j < k; j++) {
    var e = check(j);
    if (e) {
      show(j);
      $("err").textContent = e;
      return;
    }
    show(j + 1);
  }
}
