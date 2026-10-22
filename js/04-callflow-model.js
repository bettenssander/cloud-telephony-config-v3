// Call-flow: gegevensmodel (blokken en aansluitpunten), instellingenformulieren per bloktype, beschrijving en controle.
// (Klassiek script: deelt de globale variabelen en functies met de andere bestanden in js/; laadvolgorde: zie index.html.)

// Versie van dit bestand (zie tools/stamp-version.py); de pagina controleert of alle bestanden dezelfde versie hebben.
window.VER = window.VER || {};
window.VER["04-callflow-model.js"] = "2026-10-21.1";

/* ======================================================================
 * STAP 5 – CALL-FLOW: gegevensmodel (blokken en aansluitpunten)
 * ====================================================================== */

var NAME = {
  nr: tx("Nummer"),
  oh: tx("Openingsuren"),
  grp: tx("Groep"),
  menu: tx("Keuzemenu"),
  ext: tx("Forward naar een nummer"),
  msg: tx("Boodschap afspelen"),
  rep: tx("Keuzemenu herhalen"),
  vm: tx("Voicemail"),
  hang: tx("Inhaken"),
};
var SHORT = {
  nr: tx("Nummer"),
  oh: tx("Openingsuren"),
  grp: tx("Groep"),
  menu: tx("Keuzemenu"),
  ext: tx("Forward"),
  msg: tx("Boodschap"),
  rep: tx("Herhaal menu"),
  vm: tx("Voicemail"),
  hang: tx("Inhaken"),
};
var IC = { nr: "📞", oh: "📅", grp: "👥", menu: "🔢", ext: "📲", msg: "🔊", rep: "🔁", vm: "🎙", hang: "📴" };
var COL = {
  nr: "#000",
  oh: "#0a7a5a",
  grp: "#ff7900",
  menu: "#1d5fd1",
  ext: "#8a2be2",
  msg: "#c0392b",
  rep: "#1d5fd1",
  vm: "#8d6e00",
  hang: "#6b6b6b",
};
var HELP = {
  nr: tx("Het telefoonnummer waarvoor u de call-flow instelt."),
  oh: tx("Bepaal wanneer u bereikbaar bent. Tijdens en buiten de openingsuren volgt een andere stap."),
  grp: tx("Laat meerdere collega's tegelijk of na elkaar rinkelen."),
  menu: tx("De beller kiest met een toets, bijvoorbeeld 1 voor verkoop."),
  ext: tx("Schakel de oproep door naar een nummer: een interne gebruiker of een van uw ingevulde nummers, of een extern nummer, bijvoorbeeld een GSM."),
  msg: tx("Speel een opgenomen boodschap af. Kies daarna altijd wat er gebeurt, bijvoorbeeld inhaken, voicemail of een groep."),
  rep: tx("De beller hoort het keuzemenu opnieuw."),
  vm: tx("De beller kan een bericht inspreken. U kiest wie de voicemailberichten ontvangt."),
  hang: tx("Het gesprek wordt beëindigd."),
};
// DAGEN: weekdagen; KEYS: toetsen van het keuzemenu (+ "Geen keuze"); ADD: blokken die als vervolgstap
// gekozen mogen worden.
var DAGEN = [tx("Maandag"), tx("Dinsdag"), tx("Woensdag"), tx("Donderdag"), tx("Vrijdag"), tx("Zaterdag"), tx("Zondag")],
  KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#", "Geen keuze"],
  ADD = ["oh", "grp", "menu", "ext", "msg", "vm", "hang"];
// Toestand van de call-flow: D (nummers/gebruikers), FL (schema per nummer), cur (gekozen nummer),
// root (startblok), SEL (blok met open instellingen), DEL (verwijderfunctie per blok).
var D = { nrs: [], users: [] },
  FL = {},
  cur = "",
  root,
  SEL = null,
  DEL = new WeakMap();
// Maakt een nieuw blok van type t met standaardwaarden (nr, oh, grp, menu, ext, msg, vm, hang).
function mk(t) {
  var n = { t: t };
  if (t === "nr") {
    n.nr = "";
    n.kid = null;
  }
  if (t === "oh") {
    n.hrs = "Openingsuren instellen";
    n.da = "09:00";
    n.db = "17:00";
    n.days = DAGEN.map(function (x, i) {
      return { o: i < 5, a: "09:00", b: "17:00", p: false, pa: "12:00", pb: "13:00" };
    });
    n.open = null;
    n.closed = null;
    n.pause = null;
  }
  if (t === "grp") {
    n.name = "";
    n.sel = [];
    n.mode = "Simultaan";
    n.wacht = "Nee";
    n.noans = null;
  }
  if (t === "menu") {
    n.keys = [];
  }
  if (t === "ext") {
    n.kind = "";
    n.usr = ""; // intern: gebruiker uit het nummerplan ("r1", ...)
    n.int = ""; // intern: telefoonnummer uit de nummerlijst van stap 2 (leeg als er een gebruiker gekozen is)
    n.num = "";
  }
  if (t === "msg") n.next = null;
  if (t === "vm") n.vmu = [];
  return n;
}
// Soort forward: "intern" (gebruiker uit het nummerplan) of "extern" (ander nummer). Oudere bewaarde schema's
// met enkel een nummer tellen als extern.
function fkind(n) {
  return n.kind || (n.num ? "extern" : "");
}
// Bestemming van een forward als tekst, bv. "intern nummer 201 – Jan Peeters" of "extern nummer +32 470 12 34 56".
function ftxt(n) {
  var k = fkind(n);
  if (k === "intern") return tx("intern nummer {0}", n.usr && D.users.indexOf(n.usr) >= 0 ? ulab(n.usr) : n.int || "?");
  if (k === "extern") return tx("extern nummer {0}", n.num || "?");
  return tx("nummer (nog te kiezen)");
}
// Heeft minstens één open dag een middagpauze? (bepaalt of de aansluiting "Tijdens de middagpauze" bestaat)
function hasP(n) {
  return n.days.some(function (d) {
    return d.o && d.p;
  });
}
// Geeft de aansluitpunten van een blok: label, toegelaten vervolgblokken, verplicht ja/nee,
// en g()/s() om het gekoppelde blok te lezen/zetten. Alle boomfuncties werken via deze functie.
function slots(n) {
  var S = [];
  function sl(l, o, k, al, req, key) {
    S.push({
      l: l,
      al: al,
      req: req,
      key: key,
      g: function () {
        return o[k];
      },
      s: function (v) {
        o[k] = v;
      },
    });
  }
  if (n.t === "nr") sl(tx("Als iemand belt"), n, "kid", ADD, 1);
  if (n.t === "oh") {
    sl(n.hrs === "Altijd open" ? tx("Altijd bereikbaar") : tx("Tijdens de openingsuren"), n, "open", ADD, 1);
    if (n.hrs !== "Altijd open") {
      sl(tx("Buiten de openingsuren"), n, "closed", ADD, 1);
      if (hasP(n)) sl(tx("Tijdens de middagpauze"), n, "pause", ADD, 1);
    }
  }
  if (n.t === "grp") sl(tx("Als niemand opneemt"), n, "noans", ADD, 0);
  if (n.t === "msg") sl(tx("Daarna"), n, "next", ADD, 1);
  if (n.t === "menu") {
    var A = ADD.concat("rep"),
      ks = n.keys
        .filter(function (k) {
          return k.k !== "Geen keuze";
        })
        .concat(
          n.keys.filter(function (k) {
            return k.k === "Geen keuze";
          }),
        );
    ks.forEach(function (k) {
      sl(k.k === "Geen keuze" ? tx("Als de beller niets indrukt") : tx("Toets {0}", k.k), k, "c", A, 1);
    });
  }
  return S;
}

/* ======================================================================
 * CALL-FLOW: kleine UI-bouwstenen voor het instellingenvenster
 * ====================================================================== */

// Voegt een label + veld toe aan een instellingenpaneel.
function add(c, l, e) {
  var d = document.createElement("label");
  d.textContent = l;
  c.appendChild(d);
  c.appendChild(e);
}
function T(s) {
  return document.createTextNode(s);
}
// Maakt een knop met tekst, klikfunctie en optionele CSS-klasse.
function btn(t, f, cl) {
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = t;
  b.onclick = f;
  if (cl) b.className = cl;
  return b;
}
// Keuzelijst gekoppeld aan n[k]; re=true: schema opnieuw tekenen na wijziging.
function pick(c, n, k, l, o, re) {
  var s = document.createElement("select");
  o.forEach(function (x) {
    var e = document.createElement("option"),
      v = Array.isArray(x) ? x : [x, x];
    e.value = v[0];
    e.textContent = tx(v[1]); // waarde blijft Nederlands (code), de tekst is vertaald
    s.appendChild(e);
  });
  s.value = n[k];
  s.onchange = function () {
    n[k] = s.value;
    re ? render() : upd();
  };
  add(c, l, s);
}
// Tijdveld (HH:MM) gekoppeld aan n[k].
function tm(n, k) {
  var x = document.createElement("input");
  x.type = "time";
  x.value = n[k];
  x.oninput = function () {
    n[k] = x.value;
    upd();
  };
  return x;
}
// Twee tijdvelden ("van" – "tot") naast elkaar.
function pair(n, a, b) {
  var w = document.createElement("div");
  w.className = "tp";
  w.appendChild(tm(n, a));
  w.appendChild(T(tx("tot")));
  w.appendChild(tm(n, b));
  return w;
}
// HTML van <option>-elementen voor een lijst; ph=true voegt "– kies –" toe.
function opts(a, ph) {
  return (
    (ph ? tx('<option value="">– kies –</option>') : "") +
    a
      .map(function (u) {
        return "<option>" + esc(u) + "</option>";
      })
      .join("")
  );
}
// Aankruisvak met label; f(waarde) wordt aangeroepen bij wijziging.
function ckb(l, v, f) {
  var d = document.createElement("label"),
    x = document.createElement("input");
  d.className = "ck";
  x.type = "checkbox";
  x.checked = v;
  x.onchange = function () {
    f(x.checked);
  };
  d.appendChild(x);
  d.appendChild(T(l));
  return d;
}
// Maakt een formulierfunctie die enkel een uitlegtekst toont (voor blokken zonder instellingen).
function note(t) {
  return function (c) {
    var q = document.createElement("div");
    q.className = "help";
    q.textContent = t;
    c.appendChild(q);
  };
}

/* ======================================================================
 * CALL-FLOW: instellingenformulier per bloktype (F.nr, F.oh, F.grp, ...)
 * ====================================================================== */

// F[type](paneel, blok) bouwt de instellingen van dat bloktype op.
var F = {
  nr: function (c, n) {
    var i = document.createElement("input");
    i.value = n.nr;
    i.readOnly = true;
    add(c, tx("Telefoonnummer (wijzig via de lijst boven het schema)"), i);
    var o = D.nrs.filter(function (x) {
      return x !== n.nr && FL[x] && FL[x].kid;
    });
    if (o.length) {
      var s = document.createElement("select");
      s.innerHTML = opts(o, 1);
      add(c, tx("Kopieer de call-flow van een ander nummer"), s);
      var b = btn(
        tx("Kopiëren"),
        function () {
          if (!s.value) return;
          if (n.kid && b.textContent === tx("Kopiëren")) {
            b.textContent = tx("Zeker? Dit overschrijft het huidige schema");
            return;
          }
          FL[cur] = JSON.parse(JSON.stringify(FL[s.value]));
          FL[cur].nr = cur;
          root = FL[cur];
          SEL = null;
          render();
        },
        "sm",
      );
      c.appendChild(b);
    }
  },
  oh: function (c, n) {
    pick(
      c,
      n,
      "hrs",
      tx("Wanneer bent u bereikbaar?"),
      [
        ["Altijd open", "Altijd open (geen openingsuren)"],
        ["Openingsuren instellen", "Openingsuren instellen"],
      ],
      true,
    );
    if (n.hrs === "Altijd open") return;
    var q = pair(n, "da", "db");
    q.appendChild(
      btn(
        tx("Toepassen op alle open dagen"),
        function () {
          n.days.forEach(function (d) {
            if (d.o) {
              d.a = n.da;
              d.b = n.db;
            }
          });
          render();
        },
        "sm",
      ),
    );
    add(c, tx("Snel invullen: dezelfde uren voor alle open dagen"), q);
    var t = document.createElement("div");
    n.days.forEach(function (d, i) {
      var r = document.createElement("div");
      r.className = "drow";
      r.appendChild(
        ckb(DAGEN[i], d.o, function (v) {
          d.o = v;
          if (!v) d.p = false;
          render();
        }),
      );
      if (!d.o) {
        var s = document.createElement("span");
        s.textContent = tx("gesloten");
        r.appendChild(s);
      } else {
        r.appendChild(pair(d, "a", "b"));
        r.appendChild(
          ckb(tx("Middagpauze"), d.p, function (v) {
            d.p = v;
            render();
          }),
        );
        if (d.p) r.appendChild(pair(d, "pa", "pb"));
      }
      t.appendChild(r);
    });
    add(c, tx("Uren per dag (vink een dag af als u dan gesloten bent)"), t);
  },
  grp: function (c, n) {
    var nm = document.createElement("input");
    nm.value = n.name || "";
    nm.placeholder = tx("Bijvoorbeeld Verkoop of Onthaal");
    nm.oninput = function () {
      n.name = nm.value;
      refreshTree();
    };
    add(c, tx("Naam van de groep *"), nm);
    var m = document.createElement("div");
    m.className = "mem";
    n.sel = n.sel.filter(function (u) {
      return D.users.indexOf(u) >= 0;
    });
    D.users.forEach(function (u) {
      m.appendChild(
        ckb(ulab(u), n.sel.indexOf(u) >= 0, function (v) {
          var p = n.sel.indexOf(u);
          if (v && p < 0) n.sel.push(u);
          if (!v && p >= 0) n.sel.splice(p, 1);
          render();
        }),
      );
    });
    add(c, tx("Wie moet er rinkelen?"), m);
    pick(
      c,
      n,
      "mode",
      tx("Hoe moeten de toestellen rinkelen?"),
      [
        ["Simultaan", "Allemaal tegelijk"],
        ["Cascade", "Eén voor één, in volgorde"],
      ],
      true,
    );
    if (n.mode === "Cascade") {
      var o = document.createElement("div");
      n.sel.forEach(function (u, j) {
        var r = document.createElement("div"),
          sp = document.createElement("span");
        r.className = "ord";
        sp.textContent = j + 1 + ". " + ulab(u);
        r.appendChild(sp);
        [
          ["↑", -1],
          ["↓", 1],
        ].forEach(function (a) {
          var b = btn(a[0], function () {
            var t = n.sel[j];
            n.sel[j] = n.sel[j + a[1]];
            n.sel[j + a[1]] = t;
            render();
          });
          b.disabled = j + a[1] < 0 || j + a[1] >= n.sel.length;
          r.appendChild(b);
        });
        o.appendChild(r);
      });
      add(c, tx("In welke volgorde?"), o);
    }
    pick(c, n, "wacht", tx("Wachtboodschap afspelen terwijl de beller wacht?"), ["Nee", "Ja"]);
  },
  menu: function (c, n) {
    var l = document.createElement("div");
    n.keys.forEach(function (k, i) {
      var r = document.createElement("div"),
        s = document.createElement("select");
      r.className = "ord";
      KEYS.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x;
        o.textContent = x === "Geen keuze" ? tx("Geen keuze (de beller drukt niets in)") : tx("Toets {0}", x);
        s.appendChild(o);
      });
      s.value = k.k;
      s.onchange = function () {
        k.k = s.value;
        render();
      };
      r.appendChild(s);
      var x = btn("✕", function () {
        n.keys.splice(i, 1);
        render();
      });
      x.title = tx("Toets verwijderen");
      r.appendChild(x);
      l.appendChild(r);
    });
    add(c, tx("Toetsen van het menu"), l);
    note(
      tx("Wilt u iets laten gebeuren wanneer de beller niets indrukt? Voeg dan een toets toe en kies ‘Geen keuze’."),
    )(c);
    c.appendChild(
      btn(
        tx("+ Toets toevoegen"),
        function () {
          var u = n.keys.map(function (k) {
            return k.k;
          });
          n.keys.push({
            k:
              KEYS.slice(0, 12).filter(function (k) {
                return u.indexOf(k) < 0;
              })[0] || "1",
            c: null,
          });
          render();
        },
        "sm",
      ),
    );
  },
  ext: function (c, n) {
    n.kind = fkind(n);
    var k = document.createElement("select");
    k.innerHTML =
      tx('<option value="">– kies –</option><option value="intern">Intern (een gebruiker of een ingevuld nummer)</option><option value="extern">Extern (een ander nummer, bv. een GSM)</option>');
    k.value = n.kind;
    k.onchange = function () {
      n.kind = k.value;
      render();
    };
    add(c, tx("Naar welk soort nummer?"), k);
    if (n.kind === "intern") {
      // Keuze uit alle gebruikers van het nummerplan en alle ingevulde telefoonnummers (reeksen uitgeklapt)
      var um = usedMap(),
        ds = {};
      nrsList().forEach(function (r) {
        expandNums(r[0]).forEach(function (x) {
          ds[x] = r[1];
        });
      });
      var nums = allNums(),
        u = document.createElement("select");
      u.innerHTML =
        tx("<option value=\"\">– kies –</option>{0}{1}", D.users.length
          ? '<optgroup label="Gebruikers uit het nummerplan">' +
            D.users
              .map(function (x) {
                return '<option value="u:' + x + '">' + esc(ulab(x)) + "</option>";
              })
              .join("") +
            "</optgroup>"
          : "", nums.length
          ? '<optgroup label="Ingevulde telefoonnummers">' +
            nums
              .map(function (x) {
                return (
                  '<option value="n:' +
                  esc(x) +
                  '">' +
                  esc(x + (ds[x] ? " – " + ds[x] : "") + (um[x] ? " (rechtstreeks nummer van " + um[x] + ")" : "")) +
                  "</option>"
                );
              })
              .join("") +
            "</optgroup>"
          : "");
      u.value = n.usr ? "u:" + n.usr : n.int ? "n:" + n.int : "";
      u.onchange = function () {
        n.usr = u.value.indexOf("u:") === 0 ? u.value.slice(2) : "";
        n.int = u.value.indexOf("n:") === 0 ? u.value.slice(2) : "";
        render();
      };
      add(c, tx("Welk intern nummer?"), u);
    }
    if (n.kind === "extern") {
      var i = document.createElement("input");
      i.value = n.num;
      i.placeholder = tx("Bijvoorbeeld 0470 12 34 56");
      i.oninput = function () {
        n.num = i.value.trim();
        upd();
      };
      i.onchange = function () {
        var r = fmtBE(i.value);
        if (r.ok && r.txt) i.value = r.txt;
        n.num = i.value.trim();
        render();
      };
      add(c, tx("Welk extern nummer?"), i);
    }
  },
  vm: function (c, n) {
    var m = document.createElement("div");
    m.className = "mem";
    n.vmu = (n.vmu || []).filter(function (u) {
      return D.users.indexOf(u) >= 0;
    });
    D.users.forEach(function (u) {
      m.appendChild(
        ckb(ulab(u), n.vmu.indexOf(u) >= 0, function (v) {
          var p = n.vmu.indexOf(u);
          if (v && p < 0) n.vmu.push(u);
          if (!v && p >= 0) n.vmu.splice(p, 1);
          render();
        }),
      );
    });
    add(c, tx("Wie ontvangt de voicemailberichten? (meerdere mogelijk)"), m);
  },
  msg: note(
    tx("Dit blok heeft geen instellingen. Kies rechts van het blok altijd wat er daarna gebeurt, bijvoorbeeld inhaken, voicemail of een groep."),
  ),
  hang: note(tx("Dit blok heeft geen instellingen. Het gesprek wordt beëindigd.")),
};

/* ======================================================================
 * CALL-FLOW: tekstuele beschrijving, controle en tekstschema van een blok
 * ====================================================================== */

// Korte tekst onder de naam van een blok (in de tegel en in de PDF-tekening).
function sub(n) {
  switch (n.t) {
    case "nr":
      return n.nr || tx("kies nummer");
    case "oh":
      return n.hrs === "Altijd open" ? tx("altijd open") : tx("uren per dag");
    case "grp":
      return (n.name || "").trim() || tx("naam ontbreekt");
    case "menu":
      return tx("{0} toetsen", n.keys.length);
    case "ext":
      if (fkind(n) === "intern") return n.usr && D.users.indexOf(n.usr) >= 0 ? ulab(n.usr) : n.int || tx("kies nummer");
      return n.num || tx("kies nummer");
    case "vm":
      return tx("{0} gebruikers", (n.vmu || []).length);
  }
  return "";
}
// Controle van het blok zelf (los van de vervolgstappen): geeft een lijst met meldingen.
function own(n) {
  var o = [];
  if (n.t === "nr" && !n.nr) o.push(tx("Kies een telefoonnummer"));
  if (n.t === "grp" && !(n.name || "").trim()) o.push(tx("Groep: geef de groep een naam"));
  if (n.t === "grp" && !n.sel.length) o.push(tx("Groep: kies wie er moet rinkelen"));
  if (n.t === "ext") {
    var fk = fkind(n);
    if (!fk) o.push(tx("Forward: kies intern of extern"));
    else if (fk === "intern" && !((n.usr && D.users.indexOf(n.usr) >= 0) || n.int)) o.push(tx("Forward: kies het interne nummer"));
    else if (fk === "extern" && !n.num) o.push(tx("Forward: vul het externe nummer in"));
    else if (fk === "extern" && n.num.replace(/\D/g, "").length < 7) o.push(tx("Forward: het externe nummer is niet geldig"));
  }
  if (n.t === "vm" && !(n.vmu || []).length) o.push(tx("Voicemail: kies wie de berichten ontvangt"));
  if (n.t === "menu") {
    if (!n.keys.length) o.push(tx("Keuzemenu: voeg minstens één toets toe"));
    var u = {};
    n.keys.forEach(function (k) {
      if (u[k.k])
        o.push(
          tx("Keuzemenu: {0} komt meer dan één keer voor", k.k === "Geen keuze" ? tx("‘Geen keuze’") : tx("toets {0}", k.k)),
        );
      u[k.k] = 1;
    });
  }
  if (n.t === "oh" && n.hrs !== "Altijd open") {
    if (
      !n.days.some(function (d) {
        return d.o;
      })
    )
      o.push(tx("Openingsuren: vink minstens één dag aan"));
    n.days.forEach(function (d, i) {
      if (!d.o) return;
      if (!d.a || !d.b || d.b <= d.a)
        o.push(tx("Openingsuren {0}: het einduur moet na het beginuur liggen", DAGEN[i].toLowerCase()));
      else if (d.p && (!d.pa || !d.pb || d.pb <= d.pa || d.pa <= d.a || d.pb >= d.b))
        o.push(tx("Middagpauze {0}: de pauze moet binnen de openingsuren vallen", DAGEN[i].toLowerCase()));
    });
  }
  return o;
}
// Verzamelt alle meldingen van een blok en alle blokken erna; leeg = call-flow volledig.
function issues(n, o) {
  own(n).forEach(function (x) {
    o.push(x);
  });
  slots(n).forEach(function (s) {
    var c = s.g();
    if (c) issues(c, o);
    else if (s.req) o.push(tx("{0}: nog niet ingesteld – {1}", NAME[n.t], s.l.toLowerCase()));
  });
  return o;
}
// Openingsuren als compacte tekst, dagen met dezelfde uren samengevoegd (bv. "Maandag tot vrijdag: 09:00–17:00").
function dagTxt(n) {
  var g = [];
  n.days.forEach(function (d, i) {
    var t = d.o ? d.a + "–" + d.b + (d.p ? tx(" (middagpauze {0}–{1})", d.pa, d.pb) : "") : tx("gesloten"),
      l = g[g.length - 1];
    if (l && l.t === t) l.e = i;
    else g.push({ s: i, e: i, t: t });
  });
  return g
    .map(function (x) {
      return DAGEN[x.s] + (x.e > x.s ? tx(" tot {0}", DAGEN[x.e].toLowerCase()) : "") + ": " + x.t;
    })
    .join("\n");
}
// Volledige beschrijving van een blok (tooltip, overzicht en PDF). Meerdere regels toegelaten.
function desc(n) {
  switch (n.t) {
    case "nr":
      return tx("Nummer {0}", n.nr || "?");
    case "oh":
      return n.hrs === "Altijd open" ? tx("Openingsuren: altijd open") : tx("Openingsuren:\n{0}", dagTxt(n));
    case "grp":
      return (
        tx("Groep \"{0}\"\nRinkelen: {1}\n{2}{3}\nWachtboodschap: {4}", (n.name || "").trim() || tx("naam ontbreekt"), n.mode === "Cascade" ? tx("één voor één, in volgorde") : tx("allemaal tegelijk"), n.mode === "Cascade" ? tx("Leden (in volgorde): ") : tx("Leden: "), n.sel.length
          ? n.sel
              .map(function (u, i) {
                return (n.mode === "Cascade" ? i + 1 + ". " : "") + ulab(u);
              })
              .join(n.mode === "Cascade" ? " > " : "; ")
          : tx("geen leden"), tx(n.wacht))
      );
    case "menu":
      return tx("Keuzemenu ({0} toetsen)", n.keys.length);
    case "ext":
      return tx("Forward naar {0}", ftxt(n));
    case "msg":
      return tx("Boodschap afspelen");
    case "vm":
      return tx("Voicemail naar: {0}", (n.vmu || []).map(ulab).join(", ") || "?");
    case "hang":
      return tx("Inhaken (gesprek beëindigen)");
  }
  return NAME[n.t];
}
// Het hele schema als ingesprongen tekst (voor overzicht en PDF).
function outline(n, i, l) {
  var p = new Array(i + 1).join(" "),
    o = [
      p +
        (l ? l + " > " : "") +
        desc(n)
          .split("\n")
          .join("\n" + p + "    "),
    ];
  slots(n).forEach(function (s) {
    var c = s.g();
    if (c) o.push(outline(c, i + 2, s.l));
    else o.push(tx("{0}  {1} > (leeg)", p, s.l));
  });
  return o.join("\n");
}
