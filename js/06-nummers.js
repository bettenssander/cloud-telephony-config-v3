// Belgische telefoonnummers: notatie, nummerreeksen en keuzelijsten met nummers.
// (Klassiek script: deelt de globale variabelen en functies met de andere bestanden in js/; laadvolgorde: zie index.html.)

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["06-nummers.js"] = "2026-10-21.1";

/* ======================================================================
 * TELEFOONNUMMERS: Belgische notatie, nummerreeksen en keuzelijsten met nummers
 * ====================================================================== */

// NM: onthoudt per nummerrij het laatst bekende nummer (om call-flows mee te laten verhuizen bij wijziging).
// Z2: Belgische zones met een tweeciferig netnummer (de overige zones hebben één cijfer: 02, 03, 04, 09).
var NM = {},
  Z2 =
    "10,11,12,13,14,15,16,19,50,51,52,53,54,55,56,57,58,59,60,61,63,64,65,67,68,69,71,80,81,82,83,84,85,86,87,89".split(
      ",",
    );
// Controleert en formatteert een Belgisch nummer naar "+32 x xxx xx xx". Geeft {ok, txt, t}; t = "geo" of "gsm".
function fmtBE(v) {
  v = (v || "").trim();
  if (!v) return { ok: true, txt: "", t: "" };
  var d = v.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, ""),
    n;
  if (d.charAt(0) === "+") {
    if (d.indexOf("+32") !== 0) return { ok: false };
    n = d.slice(3);
  } else if (d.indexOf("0032") === 0) n = d.slice(4);
  else if (d.charAt(0) === "0") n = d.slice(1);
  else return { ok: false };
  n = n.replace(/^0/, "");
  if (/^[2349]\d{7}$/.test(n))
    return {
      ok: true,
      t: "geo",
      txt: "+32 " + n.charAt(0) + " " + n.slice(1, 4) + " " + n.slice(4, 6) + " " + n.slice(6),
    };
  if (/^\d{8}$/.test(n) && Z2.indexOf(n.slice(0, 2)) >= 0 && n.slice(0, 3) !== "800")
    return {
      ok: true,
      t: "geo",
      txt: "+32 " + n.slice(0, 2) + " " + n.slice(2, 4) + " " + n.slice(4, 6) + " " + n.slice(6),
    };
  if (/^4[5-9]\d{7}$/.test(n))
    return {
      ok: true,
      t: "gsm",
      txt: "+32 " + n.slice(0, 3) + " " + n.slice(3, 5) + " " + n.slice(5, 7) + " " + n.slice(7),
    };
  return { ok: false };
}
document.addEventListener("change", function (e) {
  var t = e.target;
  if (!t.classList || !t.classList.contains("be")) return;
  var r = (t.dataset.range ? fmtNr : fmtBE)(t.value);
  if (r.ok) t.value = r.txt;
  var bad = !r.ok || (t.dataset.t === "gsm" && r.txt && r.t !== "gsm");
  t.classList.toggle("bad", bad);
  t.title = bad
    ? t.dataset.t === "gsm"
      ? tx("Geen geldig Belgisch GSM-nummer")
      : tx("Geen geldig Belgisch telefoonnummer")
    : "";
});
// Zoals fmtBE, maar ook voor nummerreeksen ("02 334 88 40 - 49", "tot", "t/m"). Max. 1000 nummers, zelfde zone.
function fmtNr(v) {
  v = (v || "").trim();
  if (!v) return { ok: true, txt: "" };
  var one = fmtBE(v);
  if (one.ok) return one;
  // Scheidingsteken van de reeks: eerst duidelijke tekens (" - ", "–", "tot", "t/m"); anders het laatste koppelteken,
  // zodat ook "02-781-15-20-90" werkt (koppeltekens in het nummer zelf blijven dan behouden).
  var p = v.split(/\s+[-–—]\s+|\s*[–—]\s*|\s+(?:tot|t\/m|to)\s+/i);
  if (p.length !== 2) {
    var k = v.lastIndexOf("-");
    p = k > 0 ? [v.slice(0, k), v.slice(k + 1)] : [v];
  }
  if (p.length !== 2) return { ok: false };
  var a = fmtBE(p[0]);
  if (!a.ok || !a.txt) return { ok: false };
  var dg = a.txt.replace(/^\+32/, "").replace(/\s/g, ""),
    d2 = p[1].replace(/\D/g, ""),
    b;
  // Het laatste nummer mag volledig zijn, of enkel het eindstuk (bv. "49" of "782 00 10"): een volledig nummer
  // heeft minstens 8 cijfers, alles daaronder is een eindstuk dat het einde van het eerste nummer vervangt.
  if (d2.length && d2.length < 8) b = fmtBE("0" + dg.slice(0, dg.length - d2.length) + d2);
  else {
    b = fmtBE(p[1]);
    if (!b.ok) b = fmtBE("0" + d2); // volledig nummer zonder beginnul, bv. "2 781 15 90"
  }
  if (!b.ok || !b.txt || b.t !== a.t) return { ok: false };
  var S = a.txt.split(" "),
    E = b.txt.split(" "),
    de = b.txt.replace(/^\+32/, "").replace(/\s/g, "");
  if (S.length !== E.length || S[1] !== E[1] || de.length !== dg.length || +de <= +dg || +de - +dg >= 1000)
    return { ok: false };
  var i = 0;
  while (S[i] === E[i]) i++;
  return { ok: true, txt: a.txt + " – " + E.slice(i).join(" "), t: a.t, range: true };
}
// Klapt een reeks uit tot alle afzonderlijke nummers (een gewoon nummer geeft zichzelf terug).
function expandNums(t) {
  var q = t.split(" – ");
  if (q.length < 2) return [t];
  var S = q[0].split(" "),
    T = q[1].split(" "),
    E = S.slice(0, S.length - T.length).concat(T),
    a = +S.join("").replace(/^\+32/, ""),
    b = +E.join("").replace(/^\+32/, ""),
    o = [];
  for (var x = a; x <= b && o.length < 1000; x++) {
    var r = fmtBE("0" + x);
    o.push(r.ok ? r.txt : String(x));
  }
  return o;
}
// Alle afzonderlijke nummers uit de nummerlijst (reeksen uitgeklapt, zonder dubbels).
function allNums() {
  var o = [];
  nrsList().forEach(function (r) {
    expandNums(r[0]).forEach(function (n) {
      if (o.indexOf(n) < 0) o.push(n);
    });
  });
  return o;
}
// Vult de keuzelijsten "nummer uit uw lijst" bij fax en alarm (met optie "Ander nummer…").
function fillNrSel() {
  document.querySelectorAll(".nrsel").forEach(function (s) {
    var inp = $(s.dataset.for),
      c = inp.value,
      l = allNums();
    s.innerHTML =
      tx("<option value=\"\">– kies een nummer uit uw lijst –</option>{0}<option value=\"__other\">Ander nummer…</option>", l
        .map(function (n) {
          return "<option>" + esc(n) + "</option>";
        })
        .join(""));
    if (c && l.indexOf(c) >= 0) {
      s.value = c;
      inp.style.display = "none";
    } else if (c) {
      s.value = "__other";
      inp.style.display = "";
    } else {
      s.value = "";
      inp.style.display = "none";
    }
  });
}
document.addEventListener("change", function (e) {
  var s = e.target;
  if (!s.classList || !s.classList.contains("nrsel")) return;
  var inp = $(s.dataset.for);
  if (s.value === "__other") {
    inp.style.display = "";
    inp.value = "";
    inp.focus();
  } else {
    inp.style.display = "none";
    inp.classList.remove("bad");
    inp.value = s.value;
  }
});
