# Plesk Deployment — GC SHA Website

## Realität dieses Setups (wichtig, weicht vom "Idealfall" unten ab!)

- **Kein SSH-Zugriff** auf dem Server — nur der Plesk File Manager (ZIP hochladen/entpacken) und der "NPM install"-Button in der Node.js-App-Verwaltung. Kein freies Terminal, nur npm-Befehle über das Plesk-UI.
- Server hat **keine Build-Tools** (kein `gcc`/`make`) → native Node-Module (`isolated-vm`, `sqlite3`, von Directus benötigt) können auf dem Server **nicht** kompiliert werden. Lösung: lokal per Docker cross-kompilieren (siehe unten).
- Node.js-Version auf dem Server: **26.3.0** (Plesk-Pfad `/opt/plesk/node/26/bin`) — ist **nicht** automatisch im `PATH`, siehe Stolpersteine.
- **Phusion Passenger** (Plesks Node-Runner) managed Prozess & Port selbst → Konflikt mit Directus' eigenem PM2 + festem Port 8055. Lösung: Proxy-Skript `directus/server.mjs` (Directus läuft intern auf Port 18055, der Proxy nimmt Passengers dynamischen Port entgegen und leitet weiter).

---

## Directus deployen/updaten (Ist-Zustand)

1. Lokal `directus/package.json` anpassen (z.B. Directus-Version hochziehen).
2. Plesk → Node.js-App der `cms`-Subdomain → **Application Root** muss auf den `directus/`-Unterordner zeigen (nicht auf das Repo-Root!).
3. Environment Variable **PATH** setzen (einmalig, falls noch nicht gesetzt):
   ```
   PATH=/opt/plesk/node/26/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
   ```
4. Geänderte Dateien (`package.json`, `server.mjs`, ggf. `.env`) über den Plesk File Manager hochladen.
5. In Plesk auf **"NPM install"** klicken.
   - Falls Fehler wegen `isolated-vm`/`make not found`: einmalig `--ignore-scripts` als NPM-Install-Parameter setzen (Plesk Node.js-Einstellungen → NPM install command).
6. Native Binaries fehlen danach noch (isolated-vm, sqlite3) → Abschnitt **"Native Module kompilieren"** unten.
7. Migrationen ausführen: im Node.js-Dashboard das Feld für ein eigenes Skript nutzen und `npm run migrate` eintragen/ausführen (nur darüber sind Befehle möglich).
8. App neu starten (Passenger-Neustart-Button in Plesk).

---

## Native Module (isolated-vm, sqlite3)

**Warum überhaupt ein Problem:** Diese Pakete enthalten C++-Code. Der Plesk-Server hat keine Compiler (kein `gcc`/`make`) und wir haben keinen Root/SSH-Zugriff, um welche nachzuinstallieren. Der Plesk-"NPM install"-Button läuft außerdem mit `--ignore-scripts`, wodurch auch reguläre Install-Skripte (die z.B. fertige Binaries herunterladen würden) nie ausgeführt werden.

Verifiziert (Stand Directus 12.0.2/12.1.1, Server-Node 26.4.0, ABI 147):

### isolated-vm — braucht KEINEN manuellen Schritt mehr

Directus verlangt intern `isolated-vm@^5.0.0`, aber Version 5.0.3 lässt sich gegen Node.js 26 gar nicht mehr kompilieren (V8-API-Inkompatibilität — getestet, schlägt mit einem Compile-Error fehl). Version `7.0.0` dagegen bringt **fertige Prebuilds** für Linux x64 (glibc, ABI 147) direkt im npm-Paket mit und lädt diese zur Laufzeit selbst — funktioniert nachweislich auch mit `--ignore-scripts`, ganz ohne Kompilieren.

Deshalb steht in `directus/package.json` ein npm-`overrides`-Eintrag, der npm zwingt, überall `isolated-vm@7.0.0` zu verwenden statt der von Directus intern gewünschten (aber kaputten) 5.0.3:

```json
"overrides": {
  "isolated-vm": "7.0.0"
}
```

Das reicht — kein Docker, kein manuelles Hochladen einer `.node`-Datei nötig, auch nicht bei zukünftigen `npm install`-Läufen auf dem Server.

### sqlite3 — braucht weiterhin eine manuell kompilierte Binärdatei

sqlite3 bringt keine fertigen Prebuilds im Paket mit, sondern lädt sie normalerweise per Install-Skript nach (`prebuild-install`) — genau das läuft aber wegen `--ignore-scripts` auf dem Server nie. Deshalb muss die kompilierte `.node`-Datei weiterhin lokal per Docker gebaut und manuell hochgeladen werden:

```bash
mkdir -p /tmp/native-build && cd /tmp/native-build
npm init -y

# Node-Version MUSS zur Server-Version passen! Aktuell: sqlite3@5.1.7 für Node 26 (ABI 147)
docker run --rm --platform linux/amd64 \
  -v "$(pwd)":/build -w /build \
  node:26-bookworm bash -c "
    apt-get update -qq && apt-get install -y -qq python3 make g++ && \
    npm install sqlite3@5.1.7 --build-from-source
  "
```

Ergebnis liegt danach lokal in:
```
/tmp/native-build/node_modules/sqlite3/build/Release/node_sqlite3.node
```

Node-ABI bei Bedarf neu prüfen (147 = Node.js 26.x):
```bash
docker run --rm --platform linux/amd64 node:26-bookworm node -e "console.log(process.version, process.versions.modules)"
```

### Hochladen auf den Server

Nur diese eine `.node`-Datei hochladen, an exakt diesem Pfad im Plesk File Manager:
- `directus/node_modules/sqlite3/lib/binding/node-v147-linux-x64/node_sqlite3.node`
  (Ordner `lib/binding/node-v147-linux-x64/` müssen ggf. manuell angelegt werden — Rechtsklick → Neuer Ordner)

**Wichtig:** Der restliche JS-Code des Pakets ist plattformunabhängig und wird ganz normal per `npm install` installiert — nur diese eine kompilierte Datei ist Linux/x64/Node-26-spezifisch und muss nach jedem frischen `npm install` erneut geprüft/hochgeladen werden (isolated-vm dagegen NICHT mehr, siehe oben).

---

## Bekannte Stolpersteine

| Problem | Ursache | Lösung |
|---|---|---|
| `/usr/bin/env: 'node': No such file or directory` | Plesk-Node nicht im PATH | PATH-Env-Var setzen (s.o.) |
| `npm install` bricht mit Exit 254 ab | Application Root zeigt auf falschen Ordner | Root auf `directus/`-Unterordner setzen |
| `Cannot find module './out/isolated_vm'` (ältere isolated-vm-Version) | isolated-vm 5.x lässt sich nicht gegen Node 26 kompilieren | `overrides` in `directus/package.json` auf `isolated-vm@7.0.0` (bringt Prebuilds mit, kein Kompilieren nötig) |
| sqlite3-Bindings nicht gefunden | Binding-Ordner fehlt/falscher Pfad, `--ignore-scripts` überspringt den Download | `lib/binding/node-v147-linux-x64/` Ordner manuell anlegen + kompilierte Binary hochladen (s.o.) |
| Port 8055 already in use | Directus + Passenger kämpfen um denselben Port, alte Prozesse bleiben hängen | Proxy-Pattern in `directus/server.mjs` (Directus intern auf Port 18055, Proxy übernimmt Passengers Port) |
| Datenbank-Fehler nach Directus-Versionsupdate | Migrationen nicht eingespielt | `npm run migrate` ausführen |
| SSL/HSTS-Fehler auf `*.plesk.page`-Domains | HSTS erzwingt HTTPS, kein gültiges Zertifikat | Let's Encrypt in Plesk aktivieren |

---

## Astro-Website Update-Flow (Ist-Zustand)

```bash
# Lokal:
npm run build            # baut nach dist/
zip -r dist.zip dist/    # zum Hochladen vorbereiten
```

In Plesk:
1. Alten `dist/`-Ordner im File Manager löschen
2. `dist.zip` hochladen und entpacken
3. Node.js-App neu starten (Passenger-Neustart-Button)

Startup file bleibt `dist/server/entry.mjs`.

---

## Übersicht (Ziel-/Wunschzustand, sobald echte Domain + SSH verfügbar sind)

- **Hauptdomain** `gc-sha.de` → Astro-Website (Node.js App in Plesk)
- **Subdomain** `cms.gc-sha.de` → Directus CMS (zweite Node.js App in Plesk)

### 1. MySQL/SQLite-Datenbank
Aktuell: SQLite-Datei (`directus/database/data.db`), kein separater DB-Server nötig.

### 2. Subdomain `cms.gc-sha.de` anlegen
Plesk → Subdomains → hinzufügen, Node.js-Version 26.x, Application Root auf `directus/`-Unterordner.

### 3. Umgebungsvariablen in Plesk setzen (Node.js-App der Website)
```
DIRECTUS_URL = https://cms.gc-sha.de
DIRECTUS_TOKEN = (aus Directus: eigenes Profil → Token)
```

### 4. Public Read Permissions (einmalig nach Directus-Neuinstallation)
```bash
node -e "
const BASE='https://cms.gc-sha.de';
const r = await fetch(BASE+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@gc-sha.de',password:'DEIN_PASSWORT'})}).then(r=>r.json());
const T = r.data.access_token;
const h = {Authorization:'Bearer '+T,'Content-Type':'application/json'};
const P = (await fetch(BASE+'/policies',{headers:h}).then(r=>r.json())).data.find(p=>p.name.includes('public')||p.name.includes('Public'))?.id;
console.log('Public Policy:', P);
const cols = ['team','holeinone','mannschaften','clubmeister','events','news','spielgebuehren','spielgruppen','restaurant','platzstatus','settings','mitgliedschaft','directus_files'];
for(const col of cols){const res=await fetch(BASE+'/permissions',{method:'POST',headers:h,body:JSON.stringify({policy:P,collection:col,action:'read',fields:['*']})}).then(r=>r.json());console.log(res.data?.id?'✅':'❌',col);}
" --input-type=module
```

### Backups
- **Datenbank**: Plesk → Datenbanken → Export (automatische Backups empfohlen)
- **Uploads** (`directus/uploads/`): Plesk Backup oder eigenes Skript
- **Code**: liegt in Git → GitHub ist das Backup

---

## Admin-Passwort: Warum `.env` allein nicht reicht

`ADMIN_EMAIL`/`ADMIN_PASSWORD` in `directus/.env` werden **nur beim allerersten Start**
(`directus bootstrap`) verwendet, um den ersten Admin-Nutzer anzulegen. Das Passwort landet
danach gehasht in der Datenbank – ein späteres Ändern von `.env` hat **keinerlei Effekt** auf
das tatsächliche Login-Passwort, auch nicht nach einem Neustart.

Deshalb kann es passieren, dass `.env` ein anderes Passwort zeigt als das, was wirklich
funktioniert (z.B. weil beim ersten Bootstrap noch ein altes Passwort in `.env` stand und
später jemand die Datei geändert hat, ohne das Passwort auch im System zu ändern).

**Um das Passwort wirklich zu ändern:** In Directus einloggen → eigenes Profil (unten links) →
Passwort ändern. Nur so wird die Datenbank aktualisiert.

---

## Datei-Uploads einschränken (nur Bilder, PDFs, Videos)

**Wo wird überhaupt hochgeladen?** Jedes Bild-/Datei-Feld in einer Collection (z.B. `bild_turniere`)
lädt direkt in die zentrale **Datei-Mediathek** von Directus (Symbol in der linken Sidebar,
"Datei-Mediathek"/"File Library") hoch. Von dort aus kann grundsätzlich jeder mit Editor-Rechten
auch unabhängig von einem Feld beliebige Dateien hochladen.

Die erlaubten Dateitypen werden **nicht** über die Admin-Oberfläche gesteuert, sondern nur über
eine Umgebungsvariable in `directus/.env` auf dem Server:

```
FILES_MIME_TYPE_ALLOW_LIST=image/*,video/*,application/pdf
```

(`image/*` deckt auch GIFs mit ab.) Danach Directus-App neu starten.

---

## Rate-Limiting aktivieren

**Wofür:** Begrenzt, wie viele Anfragen eine einzelne IP-Adresse pro Sekunde an die Directus-API
stellen darf – schützt vor Brute-Force-Login-Versuchen, Scraping und Überlastung durch Bots.
Aktuell deaktiviert (`rateLimit: false` in `/server/info`).

In `directus/.env` ergänzen:
```
RATE_LIMITER_ENABLED=true
RATE_LIMITER_STORE=memory
RATE_LIMITER_POINTS=50
RATE_LIMITER_DURATION=1
```

Das ist Directus' eigener Standardwert: **50 Anfragen pro Sekunde pro IP**. Für eine kleine
Vereins-Website ist das großzügig genug für echte Besucher (eine normale Seitenladung braucht
selten mehr als ein paar API-Calls gleichzeitig), blockiert aber automatisierte Angriffe/Scraper.
Bei Bedarf später enger stellen. Danach Directus-App neu starten.
