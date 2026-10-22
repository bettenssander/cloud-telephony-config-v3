// Opstarten: standaardrijen aanmaken, eventueel bewaarde invoer terugzetten en de eerste stap tonen.

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["11-start.js"] = "2026-10-21.1";

$("ver").textContent = tx("Versie {0}", APP_VERSION);

// Controle bij het opstarten: zijn alle bestanden van dezelfde versie? Een oud, ontbrekend of in de cache bewaard
// bestand geeft anders vreemd gedrag (bv. een nieuwe pagina met oude code). Bij een verschil verschijnt een melding.
(function () {
  var want = document.querySelector('meta[name="app-version"]').content,
    got = window.VER || {},
    bad = [];
  document.querySelectorAll('script[src^="js/"]').forEach(function (s) {
    var f = s.getAttribute("src").replace(/^js\//, "").replace(/\?.*$/, "");
    if (got[f] !== want) bad.push(f + (got[f] ? tx(" (versie {0})", got[f]) : tx(" (oud, ontbreekt of niet geladen)")));
  });
  if (bad.length) {
    var b = document.createElement("div");
    b.className = "verwarn";
    b.textContent =
      tx("Let op: niet alle bestanden zijn van versie {0}. Upload deze bestanden opnieuw en ververs de pagina met Ctrl+F5: {1}", want, bad.join(", "));
    document.body.insertBefore(b, document.body.firstChild);
  }
})();

// Standaardrijen: één lege nummerrij en drie lege rijen in het nummerplan.
addNr();
addP();
addP();
addP();

// Bewaarde invoer uit dit tabblad terugzetten (overschrijft de lege standaardrijen; zie 10-opslag.js).
restoreState();

// Klikbare stappenbalk: terugspringen kan altijd, vooruit springen controleert de stappen ertussen.
document.querySelectorAll("#bar i").forEach(function (e, k) {
  e.title = k <= step ? tx("Ga naar deze stap") : tx("Ga naar deze stap (de stappen ertussen worden gecontroleerd)");
  e.onclick = function () {
    goto(k);
  };
});
show(step);
