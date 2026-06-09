import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8055';
const EMAIL = 'admin@gc-sha.de';
const PASSWORD = 'golfclub2024';
const CONTENT_DIR = path.join(process.cwd(), 'src/content');

// ── Auth ──────────────────────────────────────────────────────────────────────
const { data: { access_token: TOKEN } } = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then(r => r.json());

const api = (path, opts = {}) => fetch(`${BASE_URL}${path}`, {
  ...opts,
  headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...opts.headers },
  body: opts.body ? JSON.stringify(opts.body) : undefined,
}).then(r => r.json());

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);

// ── Felder zu Singletons hinzufügen ──────────────────────────────────────────

log('🔧', 'Felder für Singletons anlegen...');

// Spielgebühren
const gebuehrenFields = [
  { field: 'saison', type: 'string', meta: { interface: 'input', display: 'raw', note: 'z.B. 2025' } },
  { field: 'hinweis', type: 'text', meta: { interface: 'input-multiline' } },
  { field: 'greenfee18', type: 'json', meta: { interface: 'list', options: { fields: [
    { field: 'kategorie', name: 'Kategorie', type: 'string', meta: { interface: 'input' } },
    { field: 'wochentag', name: 'Mo–Fr', type: 'string', meta: { interface: 'input' } },
    { field: 'wochenende', name: 'Sa/So/Feiertag', type: 'string', meta: { interface: 'input' } },
  ]}, note: '18-Loch Greenfee Preise' } },
  { field: 'greenfee9', type: 'json', meta: { interface: 'list', options: { fields: [
    { field: 'kategorie', name: 'Kategorie', type: 'string', meta: { interface: 'input' } },
    { field: 'wochentag', name: 'Mo–Fr', type: 'string', meta: { interface: 'input' } },
    { field: 'wochenende', name: 'Sa/So/Feiertag', type: 'string', meta: { interface: 'input' } },
  ]}, note: '9-Loch Greenfee Preise' } },
  { field: 'kurzplatz', type: 'json', meta: { interface: 'list', options: { fields: [
    { field: 'kategorie', name: 'Kategorie', type: 'string', meta: { interface: 'input' } },
    { field: 'wochentag', name: 'Mo–Fr', type: 'string', meta: { interface: 'input' } },
    { field: 'wochenende', name: 'Sa/So/Feiertag', type: 'string', meta: { interface: 'input' } },
  ]}, note: '6-Loch Kurzplatz Preise' } },
  { field: 'leihgebuehren', type: 'json', meta: { interface: 'list', options: { fields: [
    { field: 'item', name: 'Artikel', type: 'string', meta: { interface: 'input' } },
    { field: 'preis', name: 'Preis', type: 'string', meta: { interface: 'input' } },
  ]}, note: 'Leihgebühren' } },
];
for (const f of gebuehrenFields) {
  await api(`/fields/spielgebuehren`, { method: 'POST', body: f });
}
log('✅', 'spielgebuehren Felder angelegt');

// Spielgruppen
const spielgruppenFields = [
  { field: 'gruppen', type: 'json', meta: { interface: 'list', options: { fields: [
    { field: 'name', name: 'Gruppenname', type: 'string', meta: { interface: 'input' } },
    { field: 'beschreibung', name: 'Beschreibung', type: 'string', meta: { interface: 'input-multiline' } },
    { field: 'ansprechpartner_titel', name: 'Titel (z.B. Ansprechpartnerin)', type: 'string', meta: { interface: 'input' } },
    { field: 'ansprechpartner_name', name: 'Name', type: 'string', meta: { interface: 'input' } },
    { field: 'telefon', name: 'Telefon', type: 'string', meta: { interface: 'input' } },
    { field: 'email', name: 'E-Mail', type: 'string', meta: { interface: 'input' } },
    { field: 'termine', name: 'Spieltermine', type: 'json', meta: { interface: 'list', options: { fields: [
      { field: 'saison', name: 'Saison', type: 'string', meta: { interface: 'input' } },
      { field: 'uhrzeit', name: 'Uhrzeit', type: 'string', meta: { interface: 'input' } },
    ]}}},
  ]}, note: 'Spielgruppen (Ladies, Senioren etc.)' } },
];
for (const f of spielgruppenFields) {
  await api(`/fields/spielgruppen`, { method: 'POST', body: f });
}
log('✅', 'spielgruppen Felder angelegt');

// Restaurant
const restaurantFields = [
  { field: 'oeffnungszeiten', type: 'json', meta: { interface: 'list', options: { fields: [
    { field: 'tag', name: 'Tag / Zeitraum', type: 'string', meta: { interface: 'input' } },
    { field: 'zeit', name: 'Uhrzeit', type: 'string', meta: { interface: 'input' } },
    { field: 'ruhetag', name: 'Ruhetag', type: 'boolean', meta: { interface: 'boolean' } },
  ]}, note: 'Öffnungszeiten' } },
  { field: 'hinweis', type: 'text', meta: { interface: 'input-multiline', note: 'Saisonaler Hinweis' } },
  { field: 'reservierungTelefon', type: 'string', meta: { interface: 'input' } },
  { field: 'reservierungEmail', type: 'string', meta: { interface: 'input' } },
];
for (const f of restaurantFields) {
  await api(`/fields/restaurant`, { method: 'POST', body: f });
}
log('✅', 'restaurant Felder angelegt');

// Platzstatus
const statusChoices = [
  { text: '✅ Geöffnet', value: 'open' },
  { text: '⚠️ Eingeschränkt', value: 'limited' },
  { text: '🚫 Geschlossen', value: 'closed' },
  { text: '🕐 Automatisch', value: 'auto' },
];
const platzstatusFields = [
  { field: 'hauptplatz', type: 'string', meta: { interface: 'select-dropdown', options: { choices: statusChoices }, default_value: 'auto' } },
  { field: 'kurzplatz', type: 'string', meta: { interface: 'select-dropdown', options: { choices: statusChoices }, default_value: 'auto' } },
  { field: 'drivingRange', type: 'string', meta: { interface: 'select-dropdown', options: { choices: statusChoices }, default_value: 'auto' } },
  { field: 'cafe', type: 'string', meta: { interface: 'select-dropdown', options: { choices: statusChoices }, default_value: 'auto' } },
  { field: 'carts', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
    { text: '✅ Verfügbar', value: 'open' },
    { text: '🚫 Nicht verfügbar', value: 'closed' },
  ]}, default_value: 'open' } },
  { field: 'hinweis', type: 'text', meta: { interface: 'input-multiline', note: 'Aktueller Hinweis (optional)' } },
  { field: 'zeitsteuerung', type: 'json', meta: { interface: 'input-code', options: { language: 'json' }, note: 'Öffnungs-/Schließzeiten für Auto-Modus' } },
  { field: 'sperrzeiten', type: 'json', meta: { interface: 'list', note: 'Sperrzeiten (Turniere etc.)' } },
];
for (const f of platzstatusFields) {
  await api(`/fields/platzstatus`, { method: 'POST', body: f });
}
log('✅', 'platzstatus Felder angelegt');

// Settings
const settingsFields = [
  { field: 'clubName', type: 'string', meta: { interface: 'input', default_value: 'Golfclub Schwäbisch Hall e.V.' } },
  { field: 'telefon', type: 'string', meta: { interface: 'input' } },
  { field: 'email', type: 'string', meta: { interface: 'input' } },
  { field: 'adresse', type: 'text', meta: { interface: 'input-multiline' } },
  { field: 'instagram', type: 'string', meta: { interface: 'input' } },
  { field: 'pccaddieUrl', type: 'string', meta: { interface: 'input', note: 'Link für Startzeiten-Buchung' } },
];
for (const f of settingsFields) {
  await api(`/fields/settings`, { method: 'POST', body: f });
}
log('✅', 'settings Felder angelegt');

// ── Daten importieren ─────────────────────────────────────────────────────────

log('📦', 'Starte Daten-Import...');

// Hilfsfunktion: alle JSON-Dateien eines Ordners lesen
function readJsonDir(dir) {
  const fullPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => JSON.parse(fs.readFileSync(path.join(fullPath, f), 'utf8')));
}

function readJsonFile(file) {
  const fullPath = path.join(CONTENT_DIR, file);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

// ── TEAM ──
const teamFiles = readJsonDir('team');
for (const t of teamFiles) {
  await api('/items/team', { method: 'POST', body: {
    name: t.name?.value ?? t.name,
    rolle: t.rolle,
    gruppe: t.gruppe,
    bild: t.bild,
    reihenfolge: t.reihenfolge ?? 99,
  }});
}
log('✅', `team: ${teamFiles.length} Personen importiert`);

// ── HOLE-IN-ONE ──
const hoiFiles = readJsonDir('holeinone');
for (const h of hoiFiles) {
  await api('/items/holeinone', { method: 'POST', body: {
    name: h.name?.value ?? h.name,
    datum: h.datum,
    bahn: h.bahn,
  }});
}
log('✅', `holeinone: ${hoiFiles.length} Einträge importiert`);

// ── MANNSCHAFTEN ──
const mannFiles = readJsonDir('mannschaften');
for (const m of mannFiles) {
  const slugToName = (slug) => slug
    .replace(/-\d+$/, '')
    .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    .replace(/Ak (\d+)/, 'AK $1');
  await api('/items/mannschaften', { method: 'POST', body: {
    name: slugToName(m.name?.value ?? m.name),
    ligen: m.ligen,
    beschreibung: m.beschreibung,
    reihenfolge: m.reihenfolge ?? 99,
  }});
}
log('✅', `mannschaften: ${mannFiles.length} Teams importiert`);

// ── CLUBMEISTER ──
const cmFiles = readJsonDir('clubmeister');
for (const c of cmFiles) {
  await api('/items/clubmeister', { method: 'POST', body: {
    jahr: parseInt(c.titel ?? c.jahr),
    herren: c.herren,
    damen: c.damen,
    senioren: c.senioren,
    seniorinnen: c.seniorinnen,
    jugend: c.jugend,
    brutto: c.brutto,
    herren_bild: c.herren_bild,
    damen_bild: c.damen_bild,
    senioren_bild: c.senioren_bild,
    seniorinnen_bild: c.seniorinnen_bild,
  }});
}
log('✅', `clubmeister: ${cmFiles.length} Jahre importiert`);

// ── EVENTS ──
const evtFiles = readJsonDir('events');
for (const e of evtFiles) {
  await api('/items/events', { method: 'POST', body: {
    titel: e.titel ?? e.title,
    datum_von: e.datum_von ?? e.startDate,
    datum_bis: e.datum_bis ?? e.endDate,
    typ: e.typ ?? e.type ?? 'turnier',
    beschreibung: e.beschreibung ?? e.description,
    ort: e.ort ?? e.location,
    anmeldelink: e.anmeldelink ?? e.registrationLink,
    highlight: e.highlight ?? e.featured ?? false,
  }});
}
log('✅', `events: ${evtFiles.length} Events importiert`);

// ── SINGLETONS ──

// Spielgebühren
const gebuehren = readJsonFile('spielgebuehren/index.json');
if (gebuehren) {
  await api('/items/spielgebuehren', { method: 'POST', body: gebuehren });
  log('✅', 'spielgebuehren importiert');
}

// Spielgruppen
const spielgruppen = readJsonFile('spielgruppen/index.json');
if (spielgruppen) {
  await api('/items/spielgruppen', { method: 'POST', body: spielgruppen });
  log('✅', 'spielgruppen importiert');
}

// Restaurant
const restaurant = readJsonFile('restaurant/index.json');
if (restaurant) {
  await api('/items/restaurant', { method: 'POST', body: restaurant });
  log('✅', 'restaurant importiert');
}

// Platzstatus
const platzstatus = readJsonFile('platzstatus/index.json');
if (platzstatus) {
  await api('/items/platzstatus', { method: 'POST', body: {
    hauptplatz: platzstatus.hauptplatz ?? 'auto',
    kurzplatz: platzstatus.kurzplatz ?? 'auto',
    drivingRange: platzstatus.drivingRange ?? 'auto',
    cafe: platzstatus.cafe ?? 'auto',
    carts: platzstatus.carts ?? 'open',
    hinweis: platzstatus.hinweis ?? '',
    zeitsteuerung: platzstatus.zeitsteuerung ?? {},
    sperrzeiten: platzstatus.sperrzeiten ?? [],
  }});
  log('✅', 'platzstatus importiert');
}

// Settings
await api('/items/settings', { method: 'POST', body: {
  clubName: 'Golfclub Schwäbisch Hall e.V.',
  telefon: '+49 7907 8190',
  email: 'info@gc-sha.de',
  adresse: 'Am Golfplatz 1\n74523 Schwäbisch Hall',
  instagram: 'https://www.instagram.com/gc.schwaebischhall/',
  pccaddieUrl: 'https://www.pccaddie.net/clubs/0497729/app.php?cat=tt_timetable_course',
}});
log('✅', 'settings importiert');

log('🎉', 'Migration abgeschlossen! Directus unter http://localhost:8055');
