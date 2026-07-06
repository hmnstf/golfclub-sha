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

## Native Module kompilieren (isolated-vm, sqlite3)

**Warum:** Diese Pakete enthalten C++-Code, der bei `npm install` für die Zielplattform kompiliert wird. Der Plesk-Server hat keine Compiler und wir haben keinen Root/SSH-Zugriff, um welche nachzuinstallieren. Lösung: lokal (auch auf Apple-Silicon-Macs) in einem Docker-Container kompilieren, der Linux x64 emuliert — nur die fertige `.node`-Datei muss hochgeladen werden, nicht der ganze `node_modules`-Ordner.

```bash
# 1. Sauberen Build-Ordner anlegen
mkdir -p /tmp/native-build && cd /tmp/native-build
npm init -y

# 2. Im Linux/x64-Container kompilieren — Node-Version MUSS zur Server-Version passen!
docker run --rm --platform linux/amd64 \
  -v "$(pwd)":/build -w /build \
  node:26-bookworm bash -c "
    apt-get update && apt-get install -y python3 make g++ && \
    npm install isolated-vm sqlite3 --build-from-source
  "
```

Ergebnis liegt danach lokal in:
```
/tmp/native-build/node_modules/isolated-vm/out/isolated_vm.node
/tmp/native-build/node_modules/sqlite3/lib/binding/node-v147-linux-x64/node_sqlite3.node
```

Der Ordnername `node-v147-linux-x64` enthält die **Node-ABI-Version** (147 = Node.js 26.x). Falls sich die Server-Node-Version mal ändert, ABI neu prüfen mit:
```bash
docker run --rm --platform linux/amd64 node:26-bookworm node -e "console.log(process.version, process.versions.modules)"
```

### Hochladen auf den Server

Nur die zwei `.node`-Dateien hochladen, an exakt diesen Pfaden im Plesk File Manager:
- `directus/node_modules/isolated-vm/out/isolated_vm.node`
- `directus/node_modules/sqlite3/lib/binding/node-v147-linux-x64/node_sqlite3.node`
  (Ordner `binding/` und `node-v147-linux-x64/` müssen ggf. manuell im File Manager angelegt werden — Rechtsklick → Neuer Ordner)

**Wichtig:** Der restliche JS-Code der Pakete ist plattformunabhängig und wird ganz normal per `npm install` installiert — nur diese eine kompilierte Datei pro Paket ist Linux/x64/Node-26-spezifisch und muss manuell ersetzt werden.

---

## Bekannte Stolpersteine

| Problem | Ursache | Lösung |
|---|---|---|
| `/usr/bin/env: 'node': No such file or directory` | Plesk-Node nicht im PATH | PATH-Env-Var setzen (s.o.) |
| `npm install` bricht mit Exit 254 ab | Application Root zeigt auf falschen Ordner | Root auf `directus/`-Unterordner setzen |
| `Cannot find module './out/isolated_vm'` | Natives Modul nicht kompiliert/hochgeladen | Siehe "Native Module kompilieren" |
| `Cannot find package 'isolated-vm'` | Ordner wurde gelöscht, aber nicht neu installiert | `npm install` erneut ausführen, dann Binary wieder reinlegen |
| sqlite3-Bindings nicht gefunden | Binding-Ordner fehlt/falscher Pfad | `binding/node-v147-linux-x64/` Ordner manuell anlegen |
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
