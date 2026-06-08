# GC Schwäbisch Hall – Website TODO

## 🚀 Go-Live Vorbereitung

- [ ] Hosting klären (Empfehlung: All-Inkl.com oder Uberspace – Node.js-fähig, deutsch, DSGVO)
- [ ] Domain gc-sha.de auf neuen Server umzeigen
- [ ] `ADMIN_PASSWORD` als Umgebungsvariable setzen (nicht `golfclub2024` in Produktion!)
- [ ] SSL-Zertifikat einrichten (meist automatisch beim Hoster)
- [ ] Projekt auf GitHub pushen (Voraussetzung für Deployment)

## 📸 Inhalte noch zu befüllen

- [ ] Vorstandsfotos hochladen (Admin → Personen & Vorstand)
- [ ] Clubmeister-Fotos für aktuelle Titelträger hochladen (Admin → Clubmeister → 2025)
- [ ] Impressum-Seite anlegen (`/impressum`)
- [ ] Datenschutz-Seite anlegen (`/datenschutz`)
- [ ] Echte Turniere/Events eintragen (Admin → Veranstaltungen & Turniere)
- [ ] News-Beiträge anlegen (Admin → News & Aktuelles)
- [ ] Restaurant-Bilder ergänzen
- [ ] Hero-Bilder durch echte Platzfotos ersetzen (aktuell Unsplash-Platzhalter)
- [ ] Geschäftsstelle-Mitglieder anlegen (Admin → Personen & Vorstand)

## 🔧 Technische Todos

- [ ] Kontaktformular verdrahten (aktuell nur Ansicht, kein E-Mail-Versand)
- [ ] Google Maps / Anfahrt auf Kontaktseite einbinden
- [ ] Favicon mit echtem GC-Logo ersetzen
- [ ] Copyright-Jahr im Footer dynamisch machen

## 🔮 Später / Version 2

### CMS-Wechsel: Keystatic → Directus
**Warum:** Schönere UI, bessere Bildverwaltung, mehrere Redakteure gleichzeitig,
Versionierung, professioneller für langfristigen Betrieb.

**Was zu tun ist:**
- [ ] Directus auf eigenem Server/VPS aufsetzen (z.B. Hetzner CX22 ~4€/Monat)
- [ ] Datenstruktur in Directus nachbauen (Collections: team, clubmeister, events, news, platzstatus, settings)
- [ ] Alle bestehenden JSON-Inhalte nach Directus migrieren
- [ ] Astro-Datenabrufe von `import.meta.glob(*.json)` auf `fetch(directus-api)` umstellen
- [ ] Keystatic aus dem Projekt entfernen
- [ ] Middleware-Schutz auf Directus-eigenes Login umstellen

**Aufwand:** ca. 2–3 Tage

### User-Login / Mitgliederbereich
**Empfehlung:** Supabase (kostenlos, PostgreSQL, Auth fertig eingebaut)

- [ ] Anforderungen klären: Was sollen Mitglieder sehen/tun können?
- [ ] Supabase-Projekt anlegen
- [ ] Login-Flow in Astro einbauen (Middleware erweitern)
- [ ] Mitgliederbereich-Seiten bauen (z.B. Dokumente, Ergebnisse, interne News)

**Hinweis:** Lässt sich parallel zu Directus einbauen – beide nutzen eine Datenbank,
können aber unabhängig voneinander entwickelt werden.

### Weitere Ideen
- [ ] Turnierergebnisse automatisch von DGV/Golf Post importieren
- [ ] Wetter-Widget ausbauen (5-Tage-Vorschau auf Platzstatus-Seite)
- [ ] Mobile App (PWA) – Website als installierbare App
