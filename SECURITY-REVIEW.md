# HopGlass: Sicherheitsprüfung und Patchset für Debian 13

Stand: 26. Oktober 2026. Repository: https://github.com/ffgtso/hopglass
Basiscommit: `c45a57b25176cd73cb546c73e5d1b27e4f89a2d2`.

## Ergebnis und Prüfgrenzen

Das vorhandene Yarn-v1-Lockfile enthält 327 unterschiedliche Paketnamen.
Der npm Bulk Advisory Endpoint meldete dazu 98 Advisory-Einträge für 44 Paketnamen
(6 critical, 54 high, 25 moderate, 13 low). Das sind Datenbankmeldungen, keine
98 nachgewiesenen Angriffe auf diese Installation. Mehrere Versionen desselben
Pakets sowie überlappende Advisories sind möglich; die genauen betroffenen
Versionsbereiche stehen in der Tabelle unten und im JSON-Nachweis.

Nach den Änderungen meldet `npm audit` für den neuen npm-Lockfile **0 bekannte
Schwachstellen** in allen erfassten Produktions- und Entwicklungsabhängigkeiten.
Das ist keine Garantie für Fehlerfreiheit. Die Prüfung umfasst den Quelltext,
die festgeschriebenen npm/Yarn-Abhängigkeiten, ausgewählte Eingabepfade und den
Build. Sie umfasst weder einen laufenden Zielserver noch HopGlass Server,
Gluon-Firmware, Administrator-Konfiguration, externe Kartendienste oder einen
vollständigen Browser-Penetrationstest. Eingebettete Bibliothekskopien werden von
npm audit nicht allgemein erkannt. Insbesondere wurden die HTML-Senken von
Leaflet.label und die Verwendung des virtual-dom-Bundles zusätzlich angesehen;
dies ersetzt keine vollständige Prüfung aller vendorten Bibliotheken.

## Konkrete Befunde

| Befund | Einordnung und Änderung |
| --- | --- |
| Knotennamen in Karten- und Link-Tooltips | **Hoch, eigener Codebefund, keine CVE-Zuweisung.** `bindLabel` reicht die Zeichenkette an `innerHTML` weiter. Ein übernommener manipulierter Hostname kann HTML/JavaScript unter dem Karten-Origin ausführen. Alle Knotennamen werden jetzt HTML-escaped; die festen Formatierungstags bleiben erhalten. |
| Knoten-Webseiten ohne Protokollprüfung | **Mittel, eigener Codebefund.** Daten aus `nodeinfo.pages` konnten `javascript:`-Links erzeugen. Jetzt sind nur gültige absolute HTTP(S)-URLs ohne Steuer-/Leerzeichen zugelassen. Andere Einträge werden verworfen; fehlerhafte Nicht-Array-Daten ebenfalls. |
| Moment 2.24.0 | Bekanntes ReDoS und Path Traversal; Aktualisierung auf **2.31.0**. Die neuere Version beseitigt zusätzlich GHSA-4p3w-j4w9-5jqw. Path Traversal betrifft Node.js-Nutzung, nicht unmittelbar das statische Browser-Frontend. |
| RequireJS 2.3.6 / 2.1.22 | GHSA-x3m3-4wpv-5vgc / CVE-2024-38999 (Prototype Pollution); jetzt **2.3.8** im Build. Im gebauten Frontend wird weiterhin Almond verwendet. Eine Angreiferkontrolle über RequireJS-Konfiguration wurde hier nicht nachgewiesen. |
| min-document 2.19.0 | GHSA-rx8g-88g5-qh64; neues Lockfile löst **2.19.2** auf. Im vorgefertigten virtual-dom-Browserbundle ist min-document als leeres Browser-Modul abgebildet; der verwundbare Namespace-Code ist dort nicht enthalten. |
| Grunt 1.0.4, alter Connect-Server und transitive Werkzeuge | Zahlreiche Meldungen zu Prototype Pollution, Code Injection, ReDoS und Pfadbehandlung. Die komplette Grunt-Plugin-Kette und der alte Entwicklungsserver werden entfernt. Diese Risiken betreffen überwiegend Build/Entwicklung und werden nicht pauschal als Remote-Code-Ausführung im ausgelieferten Frontend bewertet. |
| Externe Statistiklinks mit target=_blank | Ergänzung von `rel="noopener noreferrer"` als zusätzliche Absicherung. |

## Patchaufteilung

1. Eingabesicherheit: HTML-Escaping, HTTP(S)-Allowlist, Regressionstests.
2. Build: Grunt/Yarn durch npm-Lockfile, kleinen Node-Build, Sass, PostCSS,
   Autoprefixer, ESLint und RequireJS ersetzen. Moment aktualisieren.
3. Dokumentation, Debian-13-Buildrezept und angepasste CI.

Chroma wird auf 2.4.2 festgeschrieben, weil die bisherige AMD-Konfiguration die
Datei `chroma.min.js` voraussetzt; 2.6.0 hat einen anderen Paketaufbau. Das
Lockfile fixiert alle übrigen Versionen und Integritätswerte. Leaflet 0.7.7,
leaflet-label 0.2.1-0 und D3 3 bleiben wegen ihrer alten APIs bestehen. Ihr Alter
ist ein Wartungsrisiko, auch ohne aktuellen npm-Advisory-Treffer; eine Migration
ist ein eigenes Vorhaben mit visuellen und funktionalen Kartentests.

Build-Änderungen: `npm run build` ersetzt Grunt; kein Live Reload mehr.
`npm run serve` ist eine optionale Python-Vorschau nur auf 127.0.0.1.
`build/config.json` bleibt bei erneutem Build erhalten. Erzeugte CSS-Source-Maps
entfallen. Sass meldet noch veraltete `@import`-Anweisungen, der Build gelingt.
Die Lint-Konfiguration behält die bisherigen aktiven Fehlerregeln semi/curly/strict;
die bisherige no-use-before-define-Warnung wird nicht weitergeführt.

## Verifikation

- Saubere Installation per `npm ci --ignore-scripts`, Tests, Lint und kompletter
  CSS-/AMD-Build mit **Node.js 20.19.2 und npm 9** erfolgreich.
- Linkfrequenzen, VPN-Erkennung, Markerfarben, Auswahl und Datenaktualisierung
  durch vorhandene Tests abgedeckt.
- Neue Tests für manipulierte Marker- und Linknamen, HTML-Sonderzeichen,
  gefährliche URL-Protokolle, fehlerhafte Seitenlisten und tatsächlichen
  Infobox-Renderer erfolgreich.
- Abschließender npm-Audit über den neuen Lockfile ohne bekannte Treffer.
- Das Patchset wird zusätzlich gegen einen frischen Checkout des Basiscommits
  angewendet und mit dem erstellten Git-Baum verglichen.

Die Ausführung erfolgte auf Ubuntu, nicht in Debian. Node 20.19.2 ist dieselbe
Upstream-Versionsbasis wie Debians Paket; Debians Binärpakete und Sicherheits-
Backports wurden nicht lokal ausgeführt. `Dockerfile.debian13-test` liefert einen
wiederholbaren nativen Debian-Test, wurde mangels Docker/Podman hier **nicht**
ausgeführt. Ein Browser-Smoke-Test mit echten Netzdaten steht noch aus.

## Anwendung auf Debian 13

In einem sauberen Checkout des Basiscommits, nachdem das ZIP entpackt wurde:

```sh
git switch -c security/debian13 c45a57b25176cd73cb546c73e5d1b27e4f89a2d2
git am /pfad/zum/patchset/patches/*.patch
sudo apt-get update
sudo apt-get install nodejs npm git ca-certificates
npm ci --ignore-scripts
npm test
npm audit
npm run build
```

Anschließend die eigene Konfiguration nach `build/config.json` übernehmen und
nur `build/` mit einem gepflegten statischen Webserver veröffentlichen. Das
Repository, node_modules und den Vorschau-Server nicht öffentlich bereitstellen.
`trixie-security` aktiv halten. Für den späteren Rollout Knotenliste, Karte,
Topologie, Tooltips, Filter und Statistiklinks mit eigenen Daten prüfen.

Quellen: npm Registry Bulk Advisory API
`https://registry.npmjs.org/-/npm/v1/security/advisories/bulk`, npm audit,
https://github.com/advisories/GHSA-4p3w-j4w9-5jqw,
https://github.com/advisories/GHSA-x3m3-4wpv-5vgc,
https://github.com/advisories/GHSA-rx8g-88g5-qh64,
https://packages.debian.org/trixie/nodejs.
Debians Paketquelle nennt am Prüftag 20.19.2+dfsg-1+deb13u3 (security).

## Vollständiger Lockfile-Advisory-Abgleich vor dem Patch

Die Tabelle enthält die vom Bulk-Endpoint gelieferten Einträge. Die Spalte
„Lockversionen“ kann neben betroffenen auch weitere Versionen desselben Pakets
enthalten; maßgeblich ist jeweils der betroffene Versionsbereich.

| Paket | Lockversionen | Schweregrad | Betroffener Bereich | Advisory |
| --- | --- | --- | --- | --- |
| basic-auth-connect | 1.0.0 | high | `<1.1.0` | [basic-auth-connect's callback uses time unsafe string comparison](https://github.com/advisories/GHSA-7p89-p6hx-q4fw) |
| body-parser | 1.3.1 | low | `<1.20.6` | [body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement](https://github.com/advisories/GHSA-v422-hmwv-36x6) |
| body-parser | 1.3.1 | high | `<1.20.3` | [body-parser vulnerable to denial of service when url encoding is enabled](https://github.com/advisories/GHSA-qwcr-r2fm-qrc7) |
| body-parser | 1.3.1 | high | `<1.20.9` | [body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body](https://github.com/advisories/GHSA-27r3-jxmh-p828) |
| brace-expansion | 1.1.11 | low | `>=1.0.0 <=1.1.11` | [brace-expansion Regular Expression Denial of Service vulnerability](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw) |
| brace-expansion | 1.1.11 | high | `<1.1.17` | [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) |
| brace-expansion | 1.1.11 | high | `<1.1.18` | [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) |
| brace-expansion | 1.1.11 | moderate | `<1.1.13` | [brace-expansion: Zero-step sequence causes process hang and memory exhaustion](https://github.com/advisories/GHSA-f886-m6hf-6m8v) |
| brace-expansion | 1.1.11 | high | `<1.1.16` | [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) |
| brace-expansion | 1.1.11 | high | `<1.1.19` | [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) |
| brace-expansion | 1.1.11 | moderate | `<1.1.21` | [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) |
| brace-expansion | 1.1.11 | high | `<1.1.20` | [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) |
| braces | 3.0.2 | high | `<3.0.3` | [Uncontrolled resource consumption in braces](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) |
| browserslist | 1.7.7 | high | `<=4.28.6` | [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) |
| browserslist | 1.7.7 | high | `<=4.28.6` | [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)](https://github.com/advisories/GHSA-73wf-gq98-2v4g) |
| clean-css | 3.4.28 | low | `<4.1.11` | [Regular Expression Denial of Service in clean-css](https://github.com/advisories/GHSA-wxhq-pm8v-cw75) |
| compression | 1.0.7 | high | `<1.8.2` | [compression vulnerable to Denial of Service via memory leak on premature response close](https://github.com/advisories/GHSA-vc2v-76pw-4v95) |
| cookie | 0.1.2 | low | `<0.7.0` | [cookie accepts cookie name, path, and domain with out of bounds characters](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) |
| cookie-signature | 1.0.3 | moderate | `<1.0.4` | [cookie-signature Timing Attack](https://github.com/advisories/GHSA-92vm-wfm5-mxvv) |
| cross-spawn | 7.0.1 | high | `>=7.0.0 <7.0.5` | [Regular Expression Denial of Service (ReDoS) in cross-spawn](https://github.com/advisories/GHSA-3xgq-45jj-v275) |
| debug | 0.7.4, 0.8.1, 1.0.2, 2.6.9 | high | `<2.6.9` | [debug Inefficient Regular Expression Complexity vulnerability](https://github.com/advisories/GHSA-9vvw-cc9w-f27h) |
| debug | 0.7.4, 0.8.1, 1.0.2, 2.6.9 | low | `<2.6.9` | [Regular Expression Denial of Service in debug](https://github.com/advisories/GHSA-gxpj-cx7g-858c) |
| diff | 2.2.3 | high | `<3.5.0` | [Regular Expression Denial of Service (ReDoS)](https://github.com/advisories/GHSA-h6ch-v84p-w6p9) |
| diff | 2.2.3 | low | `<3.5.1` | [jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch](https://github.com/advisories/GHSA-73rr-hh4g-fpgx) |
| es5-ext | 0.10.53 | low | `>=0.10.0 <0.10.63` | [es5-ext vulnerable to Regular Expression Denial of Service in `function#copy` and `function#toStringTokens`](https://github.com/advisories/GHSA-4gmj-3p3h-gm8h) |
| fresh | 0.2.2 | high | `<0.5.2` | [Regular Expression Denial of Service in fresh](https://github.com/advisories/GHSA-9qj9-36jm-prpv) |
| getobject | 0.1.0 | critical | `<1.0.0` | [Prototype pollution in getobject](https://github.com/advisories/GHSA-957j-59c2-j692) |
| glob-parent | 5.1.0 | high | `>=4.0.0 <5.1.2` | [glob-parent vulnerable to Regular Expression Denial of Service in enclosure regex](https://github.com/advisories/GHSA-ww39-953v-wcq6) |
| grunt | 1.0.4 | high | `<1.3.0` | [Arbitrary Code Execution in grunt](https://github.com/advisories/GHSA-m5pj-vjjf-4m3h) |
| grunt | 1.0.4 | high | `<1.5.3` | [Race Condition in Grunt](https://github.com/advisories/GHSA-rm36-94g8-835r) |
| grunt | 1.0.4 | moderate | `<1.5.2` | [Path Traversal in Grunt](https://github.com/advisories/GHSA-j383-35pm-c5h4) |
| grunt-util-property | 0.0.2 | high | `<=0.0.2` | [grunt-util-property 0.0.2 function call can add/modify properties of Object.prototype using a __proto__ payload](https://github.com/advisories/GHSA-4hq8-jgr8-mw9j) |
| hosted-git-info | 2.8.8 | moderate | `<2.8.9` | [Regular Expression Denial of Service in hosted-git-info](https://github.com/advisories/GHSA-43f8-2h32-f4cj) |
| js-yaml | 3.13.1 | moderate | `<3.14.2` | [js-yaml has prototype pollution in merge (<<)](https://github.com/advisories/GHSA-mh29-5h37-fv8m) |
| js-yaml | 3.13.1 | moderate | `<3.15.0` | [JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases](https://github.com/advisories/GHSA-h67p-54hq-rp68) |
| js-yaml | 3.13.1 | high | `>=3.0.0 <3.15.0` | [js-yaml: YAML merge-key chains can force quadratic CPU consumption](https://github.com/advisories/GHSA-52cp-r559-cp3m) |
| js-yaml | 3.13.1 | high | `>=3.0.0 <3.15.1` | [JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) |
| js-yaml | 3.13.1 | high | `>=3.0.0 <3.15.2` | [js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources](https://github.com/advisories/GHSA-2883-xcg3-v3hh) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | moderate | `<4.17.5` | [Prototype Pollution in lodash](https://github.com/advisories/GHSA-fvqr-27wr-82fm) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | high | `<4.17.21` | [Command Injection in lodash](https://github.com/advisories/GHSA-35jh-r3h4-6jhm) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | high | `<4.17.11` | [Prototype Pollution in lodash](https://github.com/advisories/GHSA-4xc9-xhrj-v574) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | critical | `<4.17.12` | [Prototype Pollution in lodash](https://github.com/advisories/GHSA-jf85-cpcp-j695) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | high | `>=3.7.0 <4.17.19` | [Prototype Pollution in lodash](https://github.com/advisories/GHSA-p6mc-m468-83gw) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | moderate | `>=4.0.0 <4.17.21` | [Regular Expression Denial of Service (ReDoS) in lodash](https://github.com/advisories/GHSA-29mw-wpgm-hmr9) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | moderate | `>=4.0.0 <=4.17.22` | [Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | high | `>=4.0.0 <=4.17.23` | [lodash vulnerable to Code Injection via `_.template` imports key names](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) |
| lodash | 1.0.2, 2.4.2, 4.17.15 | moderate | `<=4.17.23` | [lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit`](https://github.com/advisories/GHSA-f23m-r3pf-42rh) |
| method-override | 2.0.2 | high | `>=2.0.0 <2.3.10` | [method-override ReDoS when untrusted user input passed into X-HTTP-Method-Override header](https://github.com/advisories/GHSA-qx2f-477c-35rq) |
| mime | 1.2.11 | high | `<1.4.1` | [mime Regular Expression Denial of Service when MIME lookup performed on untrusted user input](https://github.com/advisories/GHSA-wrvr-8mpx-r7pp) |
| min-document | 2.19.0 | low | `<=2.19.0` | [min-document vulnerable to prototype pollution](https://github.com/advisories/GHSA-rx8g-88g5-qh64) |
| minimatch | 0.2.14, 0.3.0, 2.0.10, 3.0.4 | high | `<3.1.3` | [minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern](https://github.com/advisories/GHSA-3ppc-4f35-3m26) |
| minimatch | 0.2.14, 0.3.0, 2.0.10, 3.0.4 | high | `<3.1.3` | [minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments](https://github.com/advisories/GHSA-7r86-cg39-jmmj) |
| minimatch | 0.2.14, 0.3.0, 2.0.10, 3.0.4 | high | `<3.1.4` | [minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions](https://github.com/advisories/GHSA-23c5-xmqv-rm74) |
| minimatch | 0.2.14, 0.3.0, 2.0.10, 3.0.4 | high | `<3.0.2` | [Regular Expression Denial of Service in minimatch](https://github.com/advisories/GHSA-hxm2-r34f-qmc5) |
| minimatch | 0.2.14, 0.3.0, 2.0.10, 3.0.4 | high | `<3.0.5` | [minimatch ReDoS vulnerability](https://github.com/advisories/GHSA-f8q6-p94x-37v3) |
| minimist | 0.0.10, 0.0.8, 1.2.0 | critical | `<0.2.4` | [Prototype Pollution in minimist](https://github.com/advisories/GHSA-xvch-5gv4-984h) |
| minimist | 0.0.10, 0.0.8, 1.2.0 | critical | `>=1.0.0 <1.2.6` | [Prototype Pollution in minimist](https://github.com/advisories/GHSA-xvch-5gv4-984h) |
| minimist | 0.0.10, 0.0.8, 1.2.0 | moderate | `>=1.0.0 <1.2.3` | [Prototype Pollution in minimist](https://github.com/advisories/GHSA-vh95-rmgr-6w4m) |
| minimist | 0.0.10, 0.0.8, 1.2.0 | moderate | `<0.2.1` | [Prototype Pollution in minimist](https://github.com/advisories/GHSA-vh95-rmgr-6w4m) |
| moment | 2.24.0 | high | `<2.29.2` | [Path Traversal: 'dir/../../filename' in moment.locale](https://github.com/advisories/GHSA-8hfj-j24r-96c4) |
| moment | 2.24.0 | high | `>=2.18.0 <2.29.4` | [Moment.js vulnerable to Inefficient Regular Expression Complexity](https://github.com/advisories/GHSA-wc69-rhjr-hc9g) |
| morgan | 1.1.1 | critical | `<1.9.1` | [Code Injection in morgan](https://github.com/advisories/GHSA-gwg9-rgvj-4h5j) |
| morgan | 1.1.1 | moderate | `<1.12.0` | [morgan vulnerable to Log Forging via unescaped Unicode line separators](https://github.com/advisories/GHSA-jxfw-x594-9x9m) |
| morgan | 1.1.1 | moderate | `<1.12.1` | [morgan vulnerable to Log Injection via unescaped double quote in quoted log fields](https://github.com/advisories/GHSA-9f6g-j8ch-79g4) |
| mout | 0.9.1 | high | `<=1.2.3` | [Prototype Pollution in mout](https://github.com/advisories/GHSA-vvv8-xw5f-3f88) |
| mout | 0.9.1 | high | `<1.2.3` | [Prototype Pollution in mout](https://github.com/advisories/GHSA-pc58-wgmc-hfjr) |
| ms | 0.6.2, 2.0.0 | moderate | `<2.0.0` | [Vercel ms Inefficient Regular Expression Complexity vulnerability](https://github.com/advisories/GHSA-w9mr-4mfr-499f) |
| ms | 0.6.2, 2.0.0 | high | `<0.7.1` | [Regular Expression Denial of Service in ms](https://github.com/advisories/GHSA-3fx5-fwvr-xrjg) |
| multiparty | 3.2.8 | high | `<=4.2.3` | [multiparty vulnerable to ReDoS via filename parsing](https://github.com/advisories/GHSA-65x3-rw7q-gx94) |
| multiparty | 3.2.8 | high | `<=4.2.3` | [multiparty: Denial of Service via Prototype Pollution leads to Uncaught Exception](https://github.com/advisories/GHSA-qxch-whhj-8956) |
| multiparty | 3.2.8 | high | `<=4.2.3` | [multiparty vulnerable to Denial of Service via Uncaught Exception in filename* parameter parsing](https://github.com/advisories/GHSA-xh3c-6gcq-g4rv) |
| negotiator | 0.4.6 | high | `<0.6.1` | [Regular Expression Denial of Service in negotiator](https://github.com/advisories/GHSA-7mc5-chhp-fmc3) |
| on-headers | 0.0.0 | low | `<1.1.0` | [on-headers is vulnerable to http response header manipulation](https://github.com/advisories/GHSA-76c9-3jph-rj3q) |
| open | 0.0.5 | critical | `<6.0.0` | [Command Injection in open](https://github.com/advisories/GHSA-28xh-wpgr-7fm8) |
| path-parse | 1.0.6 | moderate | `<1.0.7` | [Regular Expression Denial of Service in path-parse](https://github.com/advisories/GHSA-hj48-42vr-x3v9) |
| picomatch | 2.2.1 | moderate | `<2.3.2` | [Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching](https://github.com/advisories/GHSA-3v7f-55p6-f55p) |
| picomatch | 2.2.1 | high | `<2.3.2` | [Picomatch has a ReDoS vulnerability via extglob quantifiers](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) |
| postcss | 5.2.18 | moderate | `<8.4.31` | [PostCSS line return parsing error](https://github.com/advisories/GHSA-7fh5-64p2-3v2j) |
| postcss | 5.2.18 | moderate | `<7.0.36` | [Regular Expression Denial of Service in postcss](https://github.com/advisories/GHSA-566m-qj78-rww5) |
| postcss | 5.2.18 | moderate | `<=8.5.22` | [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) |
| postcss | 5.2.18 | moderate | `<8.5.10` | [PostCSS has XSS via Unescaped </style> in its CSS Stringify Output](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) |
| postcss | 5.2.18 | high | `<=8.5.11` | [PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments](https://github.com/advisories/GHSA-6g55-p6wh-862q) |
| postcss | 5.2.18 | high | `<=8.5.17` | [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) |
| qs | 0.5.6, 0.6.6 | high | `<6.2.4` | [qs vulnerable to Prototype Pollution](https://github.com/advisories/GHSA-hrpp-h998-j3pp) |
| qs | 0.5.6, 0.6.6 | moderate | `<6.14.1` | [qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion](https://github.com/advisories/GHSA-6rw7-vpxm-498p) |
| qs | 0.5.6, 0.6.6 | high | `<6.0.4` | [Prototype Pollution Protection Bypass in qs](https://github.com/advisories/GHSA-gqgv-6jq5-jjj9) |
| qs | 0.5.6, 0.6.6 | high | `<1.0.0` | [Denial-of-Service Extended Event Loop Blocking in qs](https://github.com/advisories/GHSA-f9cm-p3w6-xvr3) |
| qs | 0.5.6, 0.6.6 | high | `<1.0.0` | [Denial-of-Service Memory Exhaustion in qs](https://github.com/advisories/GHSA-jjv7-qpx3-h62q) |
| requirejs | 2.1.22, 2.3.6 | high | `<=2.3.6` | [jrburke requirejs vulnerable to prototype pollution](https://github.com/advisories/GHSA-x3m3-4wpv-5vgc) |
| semver | 2.3.2 | high | `>=2.0.0-alpha <5.7.2` | [semver vulnerable to Regular Expression Denial of Service](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw) |
| semver | 2.3.2 | high | `>=1.0.4 <4.3.2` | [Regular Expression Denial of Service in semver](https://github.com/advisories/GHSA-x6fg-f45m-jf5q) |
| send | 0.4.3 | low | `<0.19.0` | [send vulnerable to template injection that can lead to XSS](https://github.com/advisories/GHSA-m6fv-jmcg-4jfg) |
| send | 0.4.3 | moderate | `<0.11.1` | [Root Path Disclosure in send](https://github.com/advisories/GHSA-jgqf-hwc5-hh37) |
| send | 0.4.3 | low | `<0.8.4` | [Directory Traversal in send](https://github.com/advisories/GHSA-xwg4-93c6-3h42) |
| serve-index | 1.1.1 | moderate | `<1.6.3` | [Cross-Site Scripting in serve-index](https://github.com/advisories/GHSA-v633-x5vv-hqwc) |
| serve-static | 1.2.3 | low | `<1.16.0` | [serve-static vulnerable to template injection that can lead to XSS](https://github.com/advisories/GHSA-cm22-4g7w-348p) |
| serve-static | 1.2.3 | low | `<1.6.5` | [Open Redirect in serve-static](https://github.com/advisories/GHSA-c3x7-gjmx-r2ff) |
| trim-newlines | 1.0.0 | high | `<3.0.1` | [Uncontrolled Resource Consumption in trim-newlines](https://github.com/advisories/GHSA-7p7h-4mm5-852v) |
