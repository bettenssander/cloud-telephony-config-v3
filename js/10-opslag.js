// Tijdelijk bewaren van de invoer in dit browsertabblad (sessionStorage), zodat een herlaad of per ongeluk
// vernieuwen niets kost. Sluit u het tabblad, dan is alles gewist. Er wordt niets naar een server gestuurd.
// Bewaard worden: de vaste velden, de nummerlijst, het nummerplan, de call-flows en de huidige stap.

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["10-opslag.js"] = "2026-10-21.1";

var STORE_KEY = "ctcfg-v1";
var STORE_OK = (function () {
  try {
    sessionStorage.setItem("__t", "1");
    sessionStorage.removeItem("__t");
    return true;
  } catch (e) {
    return false; // opslag niet beschikbaar (bv. geblokkeerd): het formulier werkt gewoon zonder
  }
})();
var wiping = false; // true tijdens "alles wissen": voorkomt dat de pagina zichzelf opnieuw bewaart

// Bewaart de volledige toestand van het formulier.
function saveState() {
  if (!STORE_OK || wiping) return;
  try {
    var S = { v: 1, step: step, cur: cur, nm: NM, fl: FL, f: {}, nrs: [], ppl: [] };
    // Vaste velden (de keuzelijsten "nummer uit uw lijst" worden afgeleid en niet bewaard)
    document.querySelectorAll(".card input[id], .card select[id]").forEach(function (e) {
      if (!e.classList.contains("nrsel")) S.f[e.id] = e.type === "checkbox" ? e.checked : e.value;
    });
    document.querySelectorAll("#nrs .row").forEach(function (r) {
      var q = function (c) {
        var e = r.querySelector(c);
        return e ? e.value : "";
      };
      S.nrs.push({ id: r.dataset.id, rng: r.classList.contains("rng"), nr: q(".nr"), rf: q(".rf"), rt: q(".rt"), nd: q(".nd") });
    });
    document.querySelectorAll("#ppl tr").forEach(function (r) {
      var q = function (c) {
        return r.querySelector(c).value;
      };
      S.ppl.push({ i: q(".in"), rn: q(".rn"), v: q(".vn"), f: q(".fn"), g: q(".gn"), m: q(".ml"), pc: r.querySelector(".pc").checked, gm: r.querySelector(".gm").checked });
    });
    sessionStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (e) {
    /* opslag vol of geblokkeerd: negeren */
  }
}

// Zet de bewaarde toestand terug. Ongeldige of onverwachte gegevens worden genegeerd en gewist.
function restoreState() {
  if (!STORE_OK) return;
  try {
    var raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return;
    var S = JSON.parse(raw);
    if (!S || S.v !== 1) throw new Error("onbekende versie");
    Object.keys(S.f || {}).forEach(function (id) {
      var e = $(id);
      if (!e) return;
      if (e.type === "checkbox") e.checked = !!S.f[id];
      else e.value = S.f[id];
    });
    if (S.nrs && S.nrs.length) {
      $("nrs").innerHTML = "";
      S.nrs.forEach(function (o) {
        addNr(!!o.rng);
        var r = $("nrs").lastChild;
        r.dataset.id = o.id;
        NID = Math.max(NID, +o.id || 0);
        if (o.rng) {
          r.querySelector(".rf").value = o.rf;
          r.querySelector(".rt").value = o.rt;
          syncRng(r);
        } else r.querySelector(".nr").value = o.nr;
        r.querySelector(".nd").value = o.nd;
      });
    }
    var rows = document.querySelectorAll("#ppl tr");
    fillRn(); // eerst de keuzelijsten vullen met de teruggezette nummers
    (S.ppl || []).forEach(function (o, i) {
      var r = rows[i];
      if (!r) return;
      r.querySelector(".in").value = o.i;
      r.querySelector(".vn").value = o.v;
      r.querySelector(".fn").value = o.f;
      r.querySelector(".gn").value = o.g;
      r.querySelector(".ml").value = o.m;
      r.querySelector(".pc").checked = !!o.pc;
      r.querySelector(".gm").checked = !!o.gm;
      r.querySelector(".rn").value = o.rn;
    });
    fillRn();
    NM = S.nm || {};
    FL = S.fl || {};
    cur = S.cur || "";
    step = Math.max(0, Math.min(N - 1, S.step | 0));
  } catch (e) {
    try {
      sessionStorage.removeItem(STORE_KEY);
    } catch (e2) {
      /* negeren */
    }
  }
}

// Bewaren na elke wijziging (met een korte vertraging), en bij het verlaten van de pagina.
var saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}
["input", "change", "click", "keyup"].forEach(function (ev) {
  document.addEventListener(ev, scheduleSave, true);
});
window.addEventListener("pagehide", saveState);

// "Alles wissen": eerst een tweede klik ter bevestiging, dan bewaarde gegevens wissen en de pagina herladen.
var WIPE_TXT = $("wipe").textContent;
$("wipe").onclick = function () {
  var b = this;
  if (!b.dataset.sure) {
    b.dataset.sure = "1";
    b.textContent = tx("Zeker? Klik nogmaals om alles te wissen");
    setTimeout(function () {
      delete b.dataset.sure;
      b.textContent = WIPE_TXT;
    }, 4000);
    return;
  }
  wiping = true;
  try {
    sessionStorage.removeItem(STORE_KEY);
  } catch (e) {
    /* negeren */
  }
  location.reload();
};
