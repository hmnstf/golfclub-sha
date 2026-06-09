# Plesk Deployment — GC SHA Website

## Übersicht
- **Hauptdomain** `gc-sha.de` → Astro-Website (Node.js App in Plesk)
- **Subdomain** `cms.gc-sha.de` → Directus CMS (zweite Node.js App in Plesk)

---

## 1. MySQL-Datenbank anlegen (Plesk)

Plesk → Datenbanken → Datenbank hinzufügen:
- Name: `gcsha_directus`
- User: `gcsha_user`
- Passwort: (sicheres Passwort notieren)

---

## 2. Subdomain cms.gc-sha.de anlegen (Plesk)

Plesk → Subdomains → `cms.gc-sha.de` hinzufügen  
Node.js-Version: **22.x** wählen  
Document Root: `/httpdocs/cms` (oder eigener Pfad)

---

## 3. Directus deployen

```bash
# Im Plesk SSH Terminal:
cd /var/www/vhosts/gc-sha.de/cms   # Pfad je nach Plesk-Setup

# Repo klonen oder nur den /directus Ordner hochladen
git clone https://github.com/dein-repo/golfclub-website.git .
cd directus

# .env anlegen (Vorlage verwenden)
cp .env.example .env
nano .env   # Datenbankdaten + SECRET eintragen

# Dependencies installieren (inkl. Extensions)
npm install

# Datenbank initialisieren
npx directus bootstrap

# Start (Plesk übernimmt das automatisch danach)
npm start
```

---

## 4. Astro-Website deployen

```bash
cd /var/www/vhosts/gc-sha.de/httpdocs

git clone https://github.com/dein-repo/golfclub-website.git .

# .env anlegen
echo "DIRECTUS_URL=https://cms.gc-sha.de" > .env
echo "DIRECTUS_TOKEN=dein-api-token" >> .env

npm install
npm run build

# Plesk Node.js App starten
# Startup file: dist/server/entry.mjs
```

---

## 5. Umgebungsvariablen in Plesk setzen

Plesk → Node.js App → Environment Variables:
```
DIRECTUS_URL = https://cms.gc-sha.de
DIRECTUS_TOKEN = (aus Directus: Einstellungen → API-Token)
```

---

## Updates einspielen

```bash
git pull
npm install   # falls neue Packages
npm run build  # Astro neu bauen
# Plesk: App neu starten
```

---

## Backups

- **Datenbank**: Plesk → Datenbanken → Export (automatische Backups empfohlen)
- **Uploads** (`directus/uploads/`): Plesk Backup oder eigenes Skript
- **Code**: liegt in Git → GitHub ist das Backup
