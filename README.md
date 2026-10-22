# Cloud Telephony – configuratieformulier

Een webformulier in 6 stappen waarmee een klant (of een consultant samen met de klant) de configuratie van
**Cloud Telephony** invult. Op het einde wordt een **PDF-verslag** gemaakt in de Orange Business-huisstijl, met
tabellen én een tekening van de call-flow per telefoonnummer.

Er is **geen server en geen database**: alles gebeurt in de browser. Het systeem werkt **enkel online**, omdat de
PDF-bibliotheken (jsPDF en AutoTable) van cdnjs geladen worden.

## Mappen en bestanden

```
index.html                  Structuur van de pagina (de 6 stappen, de taalknoppen) en de verwijzingen naar css/ en js/
css/style.css               Alle opmaak (huisstijl, donkere modus, mobiele weergave)
js/00-logo.js               Het logo als data-URI (koptekst + PDF)
js/01-i18n.js               Taalkeuze (NL/FR) en de vertaalfunctie tx()
js/02-i18n-fr.js            De Franse woordenlijst (Nederlands -> Frans)
js/03-basis.js              Hulpfuncties, stap 2 (nummers, nummerreeksen), stap 4 (nummerplan)
js/04-callflow-model.js     Call-flow: gegevensmodel, instellingenformulieren, beschrijving en controle
js/05-callflow-scherm.js    Call-flow: het schema tekenen (tegels, menu, instellingenvenster, keuzelijst met nummers)
js/06-nummers.js            Belgische nummers, nummerreeksen, keuzelijsten met nummers
js/07-gegevens.js           Koppeling nummerplan <-> call-flow, verzamelen van invoer, validatie per stap
js/08-pdf-en-overzicht.js   PDF-verslag en overzichtspagina
js/09-navigatie.js          Navigatie tussen stappen en PDF-download
js/10-opslag.js             Invoer tijdelijk bewaren in het browsertabblad
js/11-start.js              Opstarten
tools/stamp-version.py      Zet in alle bestanden dezelfde versie (tegen oude bestanden in de cache)
tools/check-i18n.py         Controleert of alle teksten een Franse vertaling hebben
tools/build-artifact.py     Maakt één samengevoegd bestand voor snelle tests in Claude
artifact/                   Gegenereerd door tools/build-artifact.py (niet zelf aanpassen)
```

De scripts zijn gewone (klassieke) scripts die samen één globale ruimte delen. De **volgorde in `index.html` is
belangrijk**: nieuwe bestanden toevoegen kan, maar zet ze op de juiste plaats.

## Gebruiken

Open `index.html` via de gehoste link. Vul de stappen in; de stappenbalk bovenaan laat toe om terug te gaan zonder
gegevens te verliezen. Vooruit springen controleert eerst de stappen ertussen.

1. **Klant** – bedrijfsnaam, adres, contactpersoon (verplicht).
2. **Nummers** – Belgische nummers of **nummerreeksen** (bv. `02 334 88 40` tot `49`, max. 1000 nummers).
   Nummers worden automatisch genoteerd als `+32 2 334 88 40`.
3. **Randapparatuur** – fax, parlofoon, alarm. Het nummer van fax en alarm kies je uit de lijst van stap 2.
4. **Nummerplan** – max. 3 gebruikers (intern nummer, rechtstreeks nummer, naam, PC/GSM-app, GSM, e-mail).
   Werkt als een Excel-tabel (pijltjes, Tab, Enter, plakken). Op een telefoon wordt elke rij een kaart.
5. **Call-flow** *(optioneel per nummer)* – kies eerst in de **lijst** het nummer waarvoor je iets wilt instellen
   (alle ingevulde nummers, bij een reeks elk nummer apart, behalve de nummers die als rechtstreeks nummer bij een gebruiker staan; per nummer zie je
   of de call-flow volledig is). Bouw dan het schema met de `+`-knoppen: openingsuren, groep (met naam), keuzemenu
   (met "Geen keuze"), forward naar een nummer (**intern**: kies uit alle gebruikers van het nummerplan en alle ingevulde telefoonnummers, of **extern**),
   boodschap, voicemail, inhaken. Klik op een blok voor de instellingen. Is een call-flow volledig en zijn er nog
   nummers zonder call-flow, dan verschijnt de knop **"+ Call-flow voor een ander nummer instellen"**. Een gestart
   schema moet volledig zijn om verder te kunnen.
6. **Overzicht** – samenvatting en knop **PDF-verslag downloaden**.

### Talen (Nederlands en Frans)

Rechtsboven staan de knoppen **NL | FR**. De hele pagina, de meldingen, het schema en het **PDF-verslag** volgen de
gekozen taal. Bij het wisselen wordt de invoer bewaard en de pagina opnieuw geladen, dus er gaat niets verloren.

De taal wordt bepaald door (in deze volgorde): `?lang=fr` of `?lang=nl` achter de link (handig om een Franstalige klant
een link te sturen), de laatst gekozen taal in de browser en de taal van de browser (Frans -> Frans, anders Nederlands).
Interne waarden (zoals "Ja", "Nee", "Cascade") blijven altijd Nederlands in de code; enkel de weergave wordt vertaald.

**Een tekst toevoegen of wijzigen**

1. Schrijf de tekst in de code als `tx("Nederlandse tekst")`. Variabele delen komen als `{0}`, `{1}`… en worden door
   extra argumenten ingevuld: `tx("Nummer {0}: {1}", nr, melding)`. Vaste tekst in `index.html` hoeft niet aangepast
   te worden: die wordt automatisch vertaald (tekst, `placeholder`, `title`, `alt`, `aria-label`).
2. Voeg dezelfde Nederlandse tekst toe aan `js/02-i18n-fr.js` met de Franse vertaling (de `{0}`, `{1}`… moeten blijven
   staan, net als eventuele HTML-tags).
3. Controleer met `python3 tools/check-i18n.py`. Het script meldt ontbrekende vertalingen en vertalingen waarin
   invulplaatsen, tags of regeleinden niet overeenkomen.
4. Test de pagina in beide talen (`?lang=fr`). Het script kan enkel teksten vinden die letterlijk in `tx("...")` staan.

Een tekst zonder vertaling blijft gewoon Nederlands, de pagina werkt dus altijd.

### Invoer bewaren

De invoer wordt na elke wijziging bewaard in **`sessionStorage`** van het browsertabblad. Een herlaad of per ongeluk
vernieuwen kost dus niets. Sluit je het tabblad, dan is alles gewist; er wordt niets naar een server gestuurd.
Onderaan de pagina wist **"Alle gegevens wissen en opnieuw beginnen"** de bewaarde invoer meteen (met een tweede klik
ter bevestiging). Is de opslag in de browser geblokkeerd, dan werkt het formulier gewoon zonder bewaren.

Bewaard worden de vaste velden, de nummerlijst, het nummerplan, de call-flows en de huidige stap
(zie `js/10-opslag.js`). De gekozen taal wordt apart onthouden en blijft ook na "Alle gegevens wissen". Wijzig je de structuur van het formulier, verhoog dan `v` in `saveState`/`restoreState`
zodat oude bewaarde gegevens genegeerd worden.

## Versies: zorgen dat de website alle nieuwe bestanden gebruikt

Omdat de code over meerdere bestanden verdeeld is, kan een website per ongeluk een **mengeling van oude en nieuwe
bestanden** tonen (een bestand niet opnieuw geüpload, of een oud bestand dat de browser of server in de cache bewaart).
Dat geeft vreemd gedrag: de pagina is nieuw, maar een deel van de code oud. Daarom:

1. Voer na elke wijziging uit: `python3 tools/stamp-version.py`. Dat zet dezelfde versie in `index.html`
   (`<meta name="app-version">` en `?v=…` achter alle verwijzingen, zodat de browser de nieuwe bestanden ophaalt), in
   elk `js/`-bestand en in `APP_VERSION` (`js/03-basis.js`).
2. Upload daarna **alle** bestanden die gewijzigd zijn (na het stempelen is dat `index.html` en alle `js/`-bestanden).
3. De versie staat onderaan de pagina ("Versie …"). Heeft een bestand een andere versie, of ontbreekt het, dan toont
   de pagina bovenaan een oranje melding met de naam van dat bestand. Ververs dan met **Ctrl+F5** en upload dat bestand
   opnieuw.

## Publiceren (GitHub Pages)

1. Maak een publieke repository en upload `index.html`, de mappen `css/` en `js/` en eventueel `README.md`,
   `tools/` en `artifact/`.
2. *Settings → Pages → Deploy from a branch → `main` / `(root)`*.
3. De pagina staat op `https://<gebruiker>.github.io/<repository>/`.

Na elke wijziging: versie stempelen (zie hierboven) en de gewijzigde bestanden opnieuw uploaden. Er is geen bouwstap nodig.

## Snel testen in Claude

Claude toont één bestand per link. Voer na elke wijziging uit:

```
python3 tools/build-artifact.py
```

Dat plakt `css/` en `js/` in `index.html` en schrijft `artifact/cloud-telephony-configuratie.html`. Dat bestand kan
in Claude gepubliceerd worden voor een snelle test. Het is een afgeleid bestand: pas het niet zelf aan.

## Bibliotheken en beveiliging

De PDF-bibliotheken worden van cdnjs geladen met een **exacte versie** (jsPDF 2.5.1, AutoTable 3.8.2).

- **jsPDF** heeft een controlecode (`integrity="sha384-…"`): de browser weigert het bestand als het op cdnjs ooit
  zou wijzigen. De hash is berekend op het bestand uit de npm-release. De SHA-256 van dat bestand komt overeen met wat een externe scansite voor het bestand op cdnjs toont (niet rechtstreeks van cdnjs opgehaald).
- **AutoTable** heeft nog geen controlecode, omdat die hier niet tegen het bestand op cdnjs gecontroleerd kon worden
  en een foute code de PDF-knop volledig zou blokkeren. Toevoegen kan zo: haal het bestand op, bereken de hash en
  zet ze in de `<script>`-tag in `index.html`:

  ```
  curl -s https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js \
    | openssl dgst -sha384 -binary | openssl base64 -A
  ```

  Voeg dan `integrity="sha384-<resultaat>" crossorigin="anonymous"` toe aan de tag (of kopieer de volledige tag van
  cdnjs.com). Test daarna of de PDF nog gemaakt wordt.

Bij een update van een bibliotheek: nieuwe exacte versie kiezen, hash opnieuw berekenen en de PDF testen.

## Codeoverzicht

| Onderdeel | Belangrijkste functies |
|---|---|
| Taal (`01`, `02`) | `tx` (vertaalfunctie), `setLang`, woordenlijst `FR`, `i18nStatic` (vaste tekst van `index.html`) |
| Basis (`03`) | `val`, `cond` (vervolgvragen met `data-if="veld=waarde"`), `addNr`, `syncRng`, `addP`, `fillRn` |
| Call-flow model (`04`) | `mk` (nieuw blok), `slots` (aansluitpunten), constanten `NAME`, `SHORT`, `IC`, `COL`, `HELP`, object `F` (instellingen per bloktype), `sub`, `own`, `issues`, `desc`, `outline` |
| Call-flow scherm (`05`) | `tile`, `plus`, `openMenu`, `nodeEl`, `panel`, `render`, `fillPick` (keuzelijst met nummers), `nextNr` (volgend nummer) |
| Nummers (`06`) | `fmtBE`, `fmtNr`, `expandNums`, `allNums`, `fillNrSel` |
| Gegevens (`07`) | `initFlow`, `ppl`, `nrsList`, `gather`, `check` (validatie per stap) |
| PDF (`08`) | `pdfFlow` (tekening), overzicht (`summary`) |
| Navigatie (`09`) | `show`, `goto`, PDF-download |
| Opslag (`10`) | `saveState`, `restoreState`, wis-knop |

### Gegevensmodel van de call-flow

Een call-flow is een **boom van blokken**. Elk blok is een object met een type `t`:

```js
{ t: "nr",   nr: "+32 2 334 88 44", kid: <blok> }              // startblok
{ t: "oh",   hrs, days: [...], open: <blok>, closed: <blok>, pause: <blok> }
{ t: "grp",  name, sel: ["r1", "r2"], mode: "Simultaan"|"Cascade", wacht: "Ja"|"Nee", noans: <blok> }
{ t: "menu", keys: [{ k: "1"|…|"Geen keuze", c: <blok> }] }
{ t: "ext",  kind: "intern"|"extern", usr: "r1", int: "+32 2 334 88 44", num: "+32 470 12 34 56" }   // forward naar een nummer
{ t: "msg", next: <blok> }   { t: "vm", vmu: ["r1"] }   { t: "hang" }
```

`slots(blok)` geeft de aansluitpunten van een blok. Alle functies die door de boom lopen (tekenen, controleren,
tekstschema, PDF-tekening, bewaren) werken met deze gewone objecten. Gebruikers worden bijgehouden met een stabiel ID
(`"r" + rijnummer`), zodat een gewijzigde naam in het nummerplan automatisch in de call-flow doorwerkt.

### Een nieuw bloktype toevoegen

1. Voeg het type toe aan `NAME`, `SHORT`, `IC`, `COL` en `HELP` (teksten als `tx("...")`, met vertaling in
   `js/02-i18n-fr.js`), en aan `ADD` als het als vervolgstap gekozen mag worden.
2. Geef het startwaarden in `mk()` en eventuele aansluitpunten in `slots()`.
3. Maak het instellingenformulier in `F` (of voeg het toe aan `NOSET` als er geen instellingen zijn).
4. Vul `sub()`, `own()` (controle) en `desc()` (tekst voor overzicht en PDF) aan.

De tekening in de PDF en het tekstschema nemen het nieuwe blok automatisch mee.

## Belgische nummers

`fmtBE` herkent `+32…`, `0032…` en nationale nummers. Geldig zijn vaste nummers (zones 02, 03, 04, 09 en de
tweecijferige zones in `Z2`) en GSM-nummers (045x–049x). Nummers zoals `0800` worden geweigerd. Een nummerreeks
(`fmtNr`) moet in dezelfde zone liggen, oplopend zijn en maximaal 1000 nummers tellen.

## Bekende beperkingen

- Bewaarde invoer verdwijnt wanneer het tabblad gesloten wordt (bewust, het gaat om klantgegevens).
- De PDF gebruikt het standaardlettertype van jsPDF; daarom staat in het tekstschema `>` in plaats van een pijl.
- In Claude gebruikt de PDF-knop de download-functie van het artifact; in een gewone browser valt hij terug op een
  gewone download-link.
- Bij een nummerreeks krijgt elk nummer een eigen call-flow. Een reeks van 100 nummers apart instellen is veel werk;
  de functie "Kopieer de call-flow van een ander nummer" (bij het startblok) helpt daarbij.
- De Franse vertalingen zijn gemaakt met AI-hulp en nog niet nagelezen door een Franstalige. Laat ze nalezen vóór het
  formulier bij Franstalige klanten gebruikt wordt (alle teksten staan in `js/02-i18n-fr.js`).
- Er zijn geen geautomatiseerde tests in de map. De werking is lokaal getest met jsdom (laden, invullen, bewaren en
  herstellen, PDF) en de PDF is als afbeelding gecontroleerd. De opmaak is nog niet in een echte browser of op een
  telefoon gecontroleerd door de ontwikkelaar: doe dat zelf voor gebruik bij klanten.
