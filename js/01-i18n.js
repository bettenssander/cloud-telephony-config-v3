/*
 * Taalkeuze (NL / FR) en vertaalfunctie tx().
 *
 * Alle zichtbare tekst in de code staat als Nederlandse tekst in tx("..."). Bij Frans wordt de tekst opgezocht in
 * de woordenlijst FR (js/02-i18n-fr.js). Is er geen vertaling, dan blijft de Nederlandse tekst staan.
 * Variabele delen staan als {0}, {1}, ... en worden door de extra argumenten vervangen:
 *     tx("Nummer {0}: {1}", nr, melding)
 *
 * De taal wordt bepaald door (in deze volgorde): ?lang=nl of ?lang=fr in de link, de laatst gekozen taal in de
 * browser en de taal van de browser. Bij wisselen wordt de invoer bewaard en de pagina opnieuw geladen.
 */
window.VER = window.VER || {};
window.VER["01-i18n.js"] = "2026-10-21.1";

var LANG = (function () {
  var q = /[?&]lang=(nl|fr)\b/.exec(location.search),
    v = q ? q[1] : "";
  try {
    v = v || sessionStorage.getItem("ctcfg-lang") || localStorage.getItem("ctcfg-lang");
  } catch (e) {
    /* opslag niet beschikbaar: de taal van de browser wordt gebruikt */
  }
  if (v !== "nl" && v !== "fr") v = /^fr/i.test(navigator.language || "") ? "fr" : "nl";
  return v;
})();

var FR = {}; // woordenlijst Nederlands -> Frans (wordt gevuld in js/02-i18n-fr.js)

// Vertaalt een tekst en vult de plaatsen {0}, {1}, ... met de extra argumenten.
function tx(s) {
  if (typeof s !== "string") return s;
  var r = LANG === "fr" && Object.prototype.hasOwnProperty.call(FR, s) ? FR[s] : s,
    a = arguments;
  return r.replace(/\{(\d+)\}/g, function (m, i) {
    return +i + 1 < a.length ? String(a[+i + 1]) : m;
  });
}

// Wisselt van taal: invoer bewaren, taalkeuze onthouden en de pagina opnieuw laden.
function setLang(l) {
  if (l === LANG) return;
  var ok = false;
  try {
    sessionStorage.setItem("ctcfg-lang", l);
    ok = sessionStorage.getItem("ctcfg-lang") === l;
  } catch (e) {
    /* negeren */
  }
  try {
    localStorage.setItem("ctcfg-lang", l);
  } catch (e) {
    /* negeren */
  }
  if (typeof saveState === "function") saveState();
  if (!ok) {
    // zonder opslag in de browser: taal meegeven in de link (de invoer gaat dan verloren)
    location.href = location.pathname + "?lang=" + l;
    return;
  }
  if (/[?&]lang=/.test(location.search)) {
    try {
      history.replaceState(null, "", location.pathname + location.hash); // de taal uit de link mag de keuze niet blokkeren
    } catch (e) {
      /* negeren */
    }
  }
  location.reload();
}

// Taalknoppen rechtsboven.
["nl", "fr"].forEach(function (l) {
  var b = document.getElementById("lang-" + l);
  if (!b) return;
  b.classList.toggle("on", l === LANG);
  b.setAttribute("aria-pressed", l === LANG ? "true" : "false");
  b.onclick = function () {
    setLang(l);
  };
});
