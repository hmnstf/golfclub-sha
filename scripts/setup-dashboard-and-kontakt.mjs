/**
 * setup-dashboard-and-kontakt.mjs
 *
 * 1. Erstellt Directus-Dashboard mit Calendar Panel + Timeline Chart Panel
 * 2. Legt "kontakt" Singleton an mit Kontaktdaten + Anfahrts-Routen
 * 3. Befüllt die Daten aus der aktuellen kontakt.astro
 *
 * Ausführen: node scripts/setup-dashboard-and-kontakt.mjs
 */

const BASE  = process.env.DIRECTUS_URL ?? 'http://localhost:8055';
const EMAIL = 'admin@gc-sha.de';
const PASS  = 'golfclub2024';

const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
}).then(r => r.json());

const TOKEN = loginRes.data?.access_token;
if (!TOKEN) { console.error('Login fehlgeschlagen:', loginRes); process.exit(1); }
console.log('✅ Login OK');
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
async function createField(collection, field) {
  const res = await fetch(`${BASE}/fields/${collection}`, {
    method: 'POST', headers: H, body: JSON.stringify(field),
  }).then(r => r.json());
  if (res.errors) {
    if (res.errors[0]?.extensions?.code === 'RECORD_NOT_UNIQUE')
      console.log(`    ⏭  "${field.field}" existiert bereits`);
    else console.error(`    ❌ "${field.field}":`, JSON.stringify(res.errors));
  } else console.log(`    ✅ "${field.field}"`);
}

async function addReadPermission(collection) {
  const policies = await fetch(`${BASE}/policies?limit=20`, { headers: H }).then(r => r.json());
  const pub = policies.data?.find(p =>
    p.name?.toLowerCase().includes('public') || p.name?.includes('$t:public')
  );
  if (!pub) { console.log('  ⚠ Public Policy nicht gefunden'); return; }
  const res = await fetch(`${BASE}/permissions`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ policy: pub.id, collection, action: 'read', fields: ['*'] }),
  }).then(r => r.json());
  if (res.errors && !res.errors[0]?.message?.includes('unique'))
    console.error(`    ❌ Permission:`, res.errors);
  else console.log(`    ✅ Public-Read gesetzt`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DASHBOARD + PANELS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n📊 Dashboard anlegen...');

// Prüfen ob ein Dashboard namens "GC SHA Übersicht" bereits existiert
const dashboards = await fetch(`${BASE}/dashboards?limit=20`, { headers: H }).then(r => r.json());
let dashboard = dashboards.data?.find(d => d.name === 'GC SHA Übersicht');

if (!dashboard) {
  const res = await fetch(`${BASE}/dashboards`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ name: 'GC SHA Übersicht', icon: 'golf_course', color: '#132e21' }),
  }).then(r => r.json());
  dashboard = res.data;
  if (!dashboard?.id) { console.error('❌ Dashboard-Erstellung fehlgeschlagen:', res); }
  else console.log(`  ✅ Dashboard angelegt: ${dashboard.id}`);
} else {
  console.log(`  ⏭  Dashboard existiert bereits: ${dashboard.id}`);
}

if (dashboard?.id) {
  // Bestehende Panels des Dashboards abrufen
  const existingPanels = await fetch(
    `${BASE}/panels?filter[dashboard][_eq]=${dashboard.id}&limit=20`, { headers: H }
  ).then(r => r.json());
  const panelTypes = existingPanels.data?.map(p => p.type) ?? [];

  // Calendar Panel
  if (!panelTypes.includes('calendar')) {
    const res = await fetch(`${BASE}/panels`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        dashboard: dashboard.id,
        name: 'Events Kalender',
        type: 'calendar',
        position_x: 0,
        position_y: 0,
        width: 32,
        height: 16,
        options: {
          collection: 'events',
          startDateField: 'datum_von',
          endDateField: 'datum_bis',
          titleField: 'titel',
        },
      }),
    }).then(r => r.json());
    if (res.data?.id) console.log(`  ✅ Calendar Panel angelegt`);
    else console.log(`  ⚠ Calendar Panel: ${JSON.stringify(res.errors ?? res)}`);
  } else {
    console.log(`  ⏭  Calendar Panel existiert bereits`);
  }

  // Timeline Chart Panel
  if (!panelTypes.includes('timeline-chart')) {
    const res = await fetch(`${BASE}/panels`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        dashboard: dashboard.id,
        name: 'Events Timeline',
        type: 'timeline-chart',
        position_x: 0,
        position_y: 16,
        width: 32,
        height: 10,
        options: {
          collection: 'events',
          dateField: 'datum_von',
          titleField: 'titel',
          groupByField: 'typ',
        },
      }),
    }).then(r => r.json());
    if (res.data?.id) console.log(`  ✅ Timeline Panel angelegt`);
    else console.log(`  ⚠ Timeline Panel: ${JSON.stringify(res.errors ?? res)}`);
  } else {
    console.log(`  ⏭  Timeline Panel existiert bereits`);
  }

  // News Metric Panel (Anzahl veröffentlichter Artikel)
  if (!panelTypes.includes('metric')) {
    const res = await fetch(`${BASE}/panels`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        dashboard: dashboard.id,
        name: 'Veröffentlichte News',
        type: 'metric',
        position_x: 32,
        position_y: 0,
        width: 10,
        height: 5,
        options: {
          collection: 'news',
          field: 'id',
          function: 'count',
          filter: { status: { _eq: 'veroeffentlicht' } },
          prefix: '',
          suffix: ' Artikel',
        },
      }),
    }).then(r => r.json());
    if (res.data?.id) console.log(`  ✅ News Metric Panel angelegt`);
    else console.log(`  ⚠ News Metric: ${JSON.stringify(res.errors ?? res)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. KONTAKT COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n📬 kontakt (Singleton) anlegen...');

const colRes = await fetch(`${BASE}/collections`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    collection: 'kontakt',
    meta: {
      singleton: true,
      icon: 'contact_mail',
      translations: [{ language: 'de-DE', translation: 'Kontakt & Anfahrt' }],
    },
    schema: {},
  }),
}).then(r => r.json());

if (colRes.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE')
  console.log('  ⏭  Collection existiert bereits');
else if (colRes.errors)
  console.error('  ❌', colRes.errors);
else
  console.log('  ✅ Collection "kontakt" angelegt');

// Felder anlegen
const felder = [
  {
    field: 'adresse',
    type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input', note: 'Straße und Hausnummer', width: 'half' },
  },
  {
    field: 'ort',
    type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input', note: 'PLZ und Ort', width: 'half' },
  },
  {
    field: 'telefon_sekretariat',
    type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input', width: 'half' },
  },
  {
    field: 'telefon_restaurant',
    type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input', width: 'half' },
  },
  {
    field: 'email',
    type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input', width: 'half' },
  },
  {
    field: 'fax',
    type: 'string',
    schema: { is_nullable: true },
    meta: { interface: 'input', width: 'half' },
  },
  {
    field: 'google_maps_embed',
    type: 'text',
    schema: { is_nullable: true },
    meta: {
      interface: 'input-multiline',
      note: 'Google Maps Embed-URL (aus iframe src kopieren)',
    },
  },
  {
    field: 'anfahrt_routen',
    type: 'json',
    schema: { is_nullable: true },
    meta: {
      interface: 'list',
      note: 'Anfahrtsbeschreibungen (von verschiedenen Richtungen)',
      options: {
        fields: [
          {
            field: 'von',
            name: 'Von / Richtung',
            type: 'string',
            meta: { interface: 'input', width: 'half' },
          },
          {
            field: 'text',
            name: 'Beschreibung',
            type: 'text',
            meta: { interface: 'input-multiline', width: 'full' },
          },
        ],
      },
    },
  },
];

for (const f of felder) {
  await createField('kontakt', f);
}

await addReadPermission('kontakt');

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DATEN BEFÜLLEN
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n📝 Kontaktdaten eintragen...');

const kontaktDaten = {
  adresse: 'Am Golfplatz 1',
  ort: '74523 Schwäbisch Hall',
  telefon_sekretariat: '+49 7907 8190',
  telefon_restaurant: '+49 7907 94 02 42',
  email: 'info@gc-sha.de',
  google_maps_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2601.5!2d9.7404!3d49.1128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4798e6b0e9b1e1c7%3A0x1!2sGolfclub+Schw%C3%A4bisch+Hall!5e0!3m2!1sde!2sde!4v1',
  anfahrt_routen: [
    {
      von: 'B14 aus Richtung Stuttgart / Backnang',
      text: 'Durch Schwäbisch Hall bis Bausparkasse. Dort Richtung Vellberg/Ellwangen die L 1060. Nach ca. 11 km in Dörrenzimmern rechts zum Golfplatz.',
    },
    {
      von: 'A6 aus Richtung Heilbronn',
      text: 'Ausfahrt Schwäbisch Hall/Hessental. Auf der B19 Richtung Schwäbisch Hall. Links vor der Stadteinfahrt Richtung Vellberg über Erlach. Nach Vellberg rechts Richtung Schwäbisch Hall. Nach ca. 2 km links zum Golfplatz.',
    },
    {
      von: 'A6 aus Richtung Nürnberg',
      text: 'Ausfahrt Kirchberg nach Vellberg über Großaltdorf. Nach Vellberg rechts Richtung Schwäbisch Hall. Nach ca. 2 km links zum Golfplatz.',
    },
    {
      von: 'A7 aus Richtung Würzburg',
      text: 'Bis zum Autobahnkreuz Crailsheim/Feuchtwangen. Weiter wie Beschreibung „aus Richtung Nürnberg".',
    },
    {
      von: 'A7 aus Richtung Ulm',
      text: 'Ausfahrt Ellwangen. L 1060 in Richtung Schwäbisch Hall, über Rosenberg, Bühlertann und Vellberg. Nach ca. 2 km links zum Golfplatz.',
    },
  ],
};

// Singleton: erst prüfen ob Datensatz existiert
const existing = await fetch(`${BASE}/items/kontakt`, { headers: H }).then(r => r.json());
const method = existing.data?.id ? 'PATCH' : 'POST';

const saveRes = await fetch(`${BASE}/items/kontakt`, {
  method,
  headers: H,
  body: JSON.stringify(kontaktDaten),
}).then(r => r.json());

if (saveRes.errors) {
  console.error('  ❌ Daten speichern:', saveRes.errors);
} else {
  console.log('  ✅ Kontaktdaten gespeichert');
  console.log('  ✅ 5 Anfahrtsrouten eingetragen');
}

console.log('\n🎉 Fertig!');
console.log('  → Dashboard: Directus → Dashboards → "GC SHA Übersicht"');
console.log('  → Kontakt:   Directus → Kontakt & Anfahrt → bearbeiten');
