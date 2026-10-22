/*
 * Cloud Telephony – configuratieformulier
 *
 * Formulier in 6 stappen (klant, nummers, randapparatuur,
 * nummerplan, call-flow, overzicht) met PDF-verslag.
 *
 * Afhankelijkheden: enkel jsPDF + jsPDF-AutoTable (globale variabele "jspdf").
 * Er is geen server: alle gegevens blijven in de browser (DOM + de objecten D en FL).
 *
 * Belangrijkste begrippen:
 *   D   – lijst met nummers (D.nrs) en gebruikers (D.users) waarvoor een call-flow kan gelden
 *   FL  – de call-flow per telefoonnummer: een boom van blokken ("nodes")
 *   cur – het nummer waarvoor nu een call-flow wordt ingesteld, root = het startblok ervan
 *   SEL – het blok waarvan het instellingenvenster openstaat
 *   Een blok ({t:"grp", ...}) heeft "slots" = aansluitpunten naar een volgend blok (zie slots())
 *
 * De code staat verdeeld over meerdere bestanden in js/ (zie index.html voor de volgorde):
 *   00-logo.js – het logo als data-URI
 *   01-i18n.js – taalkeuze (NL/FR) en vertaalfunctie tx()
 *   02-i18n-fr.js – Franse woordenlijst
 *   03-basis.js – hulpfuncties, stap 2 (nummers en nummerreeksen) en stap 4 (nummerplan)
 *   04-callflow-model.js – call-flow: gegevensmodel, instellingenformulieren, beschrijving en controle
 *   05-callflow-scherm.js – call-flow: het schema tekenen
 *   06-nummers.js – Belgische telefoonnummers, nummerreeksen, keuzelijsten met nummers
 *   07-gegevens.js – koppeling nummerplan en call-flow, verzamelen van invoer, validatie per stap
 *   08-pdf-en-overzicht.js – PDF-verslag en overzichtspagina
 *   09-navigatie.js – navigatie tussen de stappen en PDF-download
 *   10-opslag.js – tijdelijk bewaren van de invoer in dit browsertabblad (sessionStorage)
 *   11-start.js – opstarten: standaardrijen, bewaarde invoer terugzetten, eerste stap tonen
 */

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["03-basis.js"] = "2026-10-21.1";

// Teller voor unieke ID's van nummerrijen (zodat een nummer na hernoemen herkend blijft).
// Versie van het formulier (onderaan de pagina getoond): zo is te zien of alle bestanden op de website up-to-date zijn.
var APP_VERSION = "2026-10-21.1";
var NID = 0;
var $ = function (i) {
  return document.getElementById(i);
};
// Huidige stap (0-5) en totaal aantal stappen.
var step = 0,
  N = 6;

/* ======================================================================
 * ALGEMEEN: hulpfuncties en voorwaardelijke velden
 * ====================================================================== */

// Waarde van een invoerveld (getrimd) of "" als het veld niet bestaat.
function val(i) {
  var e = $(i);
  return e ? e.value.trim() : "";
}
// Toont/verbergt velden met data-if="veld=waarde" (vervolgvragen); geneste vragen verdwijnen mee.
function cond() {
  document.querySelectorAll(".cond").forEach(function (c) {
    var p = c.dataset.if.split("="),
      on = val(p[0]) === p[1];
    var par = c.parentElement.closest(".cond");
    if (par && !par.classList.contains("show")) on = false;
    c.classList.toggle("show", on);
  });
}
document.addEventListener("change", cond);

/* ======================================================================
 * STAP 2 – TELEFOONNUMMERS: nummers en nummerreeksen toevoegen
 * ====================================================================== */

// Standaardtekst onder een nummerreeks zolang er niets is ingevuld.
var RH =
  tx("Geef het eerste en het laatste nummer in. Bij het laatste nummer volstaan de laatste cijfers (bv. 49).");
// Voegt een rij toe in de nummerlijst: één nummer (rng=false) of een nummerreeks (rng=true).
// Bij een reeks bevat het verborgen veld ".nr" de samengestelde, genormaliseerde waarde.
function addNr(rng) {
  var d = document.createElement("div");
  d.className = "row" + (rng ? " rng" : "");
  d.dataset.id = ++NID;
  d.innerHTML = rng
    ? tx("<div class=\"tg\">Nummerreeks</div><div><label>Eerste nummer</label><input class=\"rf be\" inputmode=\"tel\" placeholder=\"bv. 02 334 88 40\"></div><div><label>Laatste nummer</label><input class=\"rt\" inputmode=\"tel\" placeholder=\"bv. 49\"></div><div class=\"n2\"><label>Omschrijving (optioneel)</label><input class=\"nd\"></div><button type=\"button\" class=\"x\" title=\"Verwijderen\">✕</button><div class=\"rp\">{0}</div><input class=\"nr\" type=\"hidden\">", RH)
    : tx('<div><label>Telefoonnummer</label><input class="nr be" data-range="1" inputmode="tel" placeholder="bv. 02 334 88 44"></div><div class="n2"><label>Omschrijving (optioneel)</label><input class="nd"></div><button type="button" class="x" title="Verwijderen">✕</button>');
  d.querySelector("button").onclick = function () {
    d.remove();
  };
  $("nrs").appendChild(d);
}
// Houdt het verborgen veld van een reeks gelijk met "eerste" + "laatste" nummer en toont de controle eronder.
function syncRng(d) {
  var f = d.querySelector(".rf"),
    t = d.querySelector(".rt"),
    n = d.querySelector(".nr"),
    p = d.querySelector(".rp"),
    a = f.value.trim(),
    b = t.value.trim();
  n.value = a || b ? a + " - " + b : "";
  p.className = "rp";
  f.classList.remove("bad");
  t.classList.remove("bad");
  if (!n.value) {
    p.textContent = RH;
    return;
  }
  var r = fmtNr(n.value);
  if (a && b && r.ok && r.range) {
    n.value = r.txt;
    p.textContent = tx("✔ {0} · {1} nummers", r.txt, expandNums(r.txt).length);
  } else if (a && b) {
    p.textContent =
      tx("✖ Ongeldige reeks: het eerste nummer moet lager zijn dan het laatste, in dezelfde zone, met maximaal 1000 nummers.");
    p.className = "rp bad";
    f.classList.add("bad");
    t.classList.add("bad");
  } else p.textContent = tx("Vul ook het {0} nummer in.", a ? tx("laatste") : tx("eerste"));
}
// Controle van een nummerreeks tijdens het typen.
$("nrs").addEventListener("input", function (e) {
  var d = e.target.closest && e.target.closest(".rng");
  if (d) syncRng(d);
});
$("nrs").addEventListener("change", function (e) {
  var d = e.target.closest && e.target.closest(".rng");
  if (d)
    setTimeout(function () {
      syncRng(d);
    }, 0);
});

/* ======================================================================
 * STAP 4 – NUMMERPLAN: tabel met gebruikers (max. 3), pijltjes/Tab/Enter en plakken uit Excel
 * ====================================================================== */

// Maximaal aantal gebruikers in het nummerplan.
var MAX = 3;
// Voegt een lege rij toe aan het nummerplan (tot MAX). data-l = label voor de kaartweergave op mobiel.
function addP() {
  if (document.querySelectorAll("#ppl tr").length >= MAX) return;
  var t = document.createElement("tr");
  t.innerHTML =
    '<td data-l="Intern nummer *"><input class="in" inputmode="numeric"></td><td data-l="Rechtstreeks nummer (optioneel)"><select class="rn"></select></td><td data-l="Voornaam *"><input class="vn"></td><td data-l="Familienaam *"><input class="fn"></td><td data-l="PC"><input type="checkbox" class="pc"></td><td data-l="GSM-app"><input type="checkbox" class="gm"></td><td data-l="GSM-nummer"><input class="gn be" data-t="gsm" inputmode="tel" placeholder="bv. 0470 12 34 56"></td><td data-l="E-mail *"><input class="ml" type="email" inputmode="email"></td><td><button type="button" class="x" title="Verwijderen">✕</button></td>';
  t.querySelector(".x").title = tx("Rij leegmaken");
  t.querySelector(".x").onclick = function () {
    t.querySelectorAll("input").forEach(function (e) {
      if (e.type === "checkbox") e.checked = false;
      else e.value = "";
    });
    t.querySelector(".rn").value = "";
    fillRn();
  };
  $("ppl").appendChild(t);
  lim();
  fillRn();
}
// Vult de keuzelijsten "Rechtstreeks nummer": alle nummers (reeksen uitgeklapt); een nummer dat
// al bij een andere gebruiker staat, wordt uitgeschakeld en gemarkeerd.
function fillRn() {
  var n = allNums().map(function (x) {
      return [x];
    }),
    R = [].slice.call(document.querySelectorAll("#ppl .rn"));
  R.forEach(function (s) {
    var v = s.value;
    if (
      !n.some(function (r) {
        return r[0] === v;
      })
    )
      v = "";
    s.innerHTML = "";
    var o = document.createElement("option");
    o.value = "";
    o.textContent = tx("– geen –");
    s.appendChild(o);
    n.forEach(function (r) {
      var o = document.createElement("option"),
        x = R.some(function (t) {
          return t !== s && t.value === r[0];
        });
      o.value = r[0];
      o.textContent = r[0] + (x ? tx(" (reeds gebruikt)") : "");
      o.disabled = x;
      s.appendChild(o);
    });
    s.value = v;
  });
}
$("ppl").addEventListener("change", function (e) {
  if (e.target.classList.contains("rn")) fillRn();
});
// Excel-achtige navigatie: verplaatst de focus dr rijen en dc kolommen in het nummerplan.
function mv(t, dr, dc) {
  var td = t.closest("td"),
    rows = [].slice.call($("ppl").rows),
    r = rows[rows.indexOf(td.parentElement) + dr],
    c = r && r.cells[td.cellIndex + dc],
    x = c && c.querySelector("input,select,button");
  if (x) {
    x.focus();
    if (x.select && x.type !== "checkbox") x.select();
    return true;
  }
  return false;
}
// Toetsenbord in het nummerplan: Enter/pijl omlaag/omhoog = ander veld, pijl links/rechts aan de rand van een tekst.
$("ppl").addEventListener("keydown", function (e) {
  var t = e.target,
    k = e.key,
    sl = t.tagName === "SELECT",
    cb = t.type === "checkbox",
    tx = t.tagName === "INPUT" && !cb,
    ok = false;
  if (!sl && !cb && !tx) return;
  if (k === "Enter" && !sl) ok = mv(t, e.shiftKey ? -1 : 1, 0);
  else if ((k === "ArrowDown" || k === "ArrowUp") && !sl) ok = mv(t, k === "ArrowDown" ? 1 : -1, 0);
  else if (
    k === "ArrowRight" &&
    (cb || (tx && t.selectionStart === t.value.length && t.selectionEnd === t.value.length))
  )
    ok = mv(t, 0, 1);
  else if (k === "ArrowLeft" && (cb || (tx && t.selectionStart === 0 && t.selectionEnd === 0)))
    ok = mv(t, 0, -1);
  if (ok) e.preventDefault();
});
// Plakken uit Excel: tabgescheiden cellen worden over de rijen en kolommen verdeeld.
$("ppl").addEventListener("paste", function (e) {
  var t = e.target,
    td = t.closest && t.closest("td");
  if (!td) return;
  var txt = ((e.clipboardData || window.clipboardData).getData("text") || "")
    .replace(/\r/g, "")
    .replace(/\n+$/, "");
  if (txt.indexOf("\t") < 0 && txt.indexOf("\n") < 0) return;
  e.preventDefault();
  var rows = [].slice.call($("ppl").rows),
    r0 = rows.indexOf(td.parentElement),
    c0 = td.cellIndex;
  txt.split("\n").forEach(function (line, i) {
    var tr = rows[r0 + i];
    if (!tr) return;
    line.split("\t").forEach(function (v, j) {
      var c = tr.cells[c0 + j],
        x = c && c.querySelector("input,select");
      if (!x || c0 + j > 7) return;
      v = v.trim();
      if (x.type === "checkbox") x.checked = /^(x|ja|yes|true|1|v|✓)$/i.test(v);
      else if (x.tagName === "SELECT")
        x.value = [].some.call(x.options, function (o) {
          return o.value === v;
        })
          ? v
          : "";
      else x.value = v;
    });
  });
  fillRn();
});
// Schakelt de knop "Gebruiker toevoegen" uit zodra het maximum is bereikt.
function lim() {
  $("addP").disabled = document.querySelectorAll("#ppl tr").length >= MAX;
}
$("addNr").onclick = function () {
  addNr(false);
};
$("addRg").onclick = function () {
  addNr(true);
};
$("addP").onclick = addP;
