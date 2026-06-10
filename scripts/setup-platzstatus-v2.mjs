/**
 * setup-platzstatus-v2.mjs
 *
 * Redesign des Platzstatus:
 * 1. platzstatus (Singleton): zeitsteuerung-JSON → einzelne Zeit-Felder + Select-Dropdowns
 * 2. platzstatus_kalender (Collection): Tages-Overrides als Kalender-Einträge
 * 3. Dashboard-Kalender-Panel für platzstatus_kalender anlegen
 *
 * node scripts/setup-platzstatus-v2.mjs
 */

const BASE  = process.env.DIRECTUS_URL ?? 'http://localhost:8055';
const EMAIL = 'admin@gc-sha.de';
const PASS  = 'golfclub2024';

const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
}).then(r => r.json());

const TOKEN = login.data?.access_token;
if (!TOKEN) { console.error('Login fehlgeschlagen:', login); process.exit(1); }
console.log('✅ Login OK');
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function createField(collection, field) {
  const res = await fetch(`${BASE}/fields/${collection}`, {
    method: 'POST', headers: H, body: JSON.stringify(field),
  }).then(r => r.json());
  if (res.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE')
    console.log(`    ⏭  "${field.field}" existiert bereits`);
  else if (res.errors)
    console.error(`    ❌ "${field.field}":`, JSON.stringify(res.errors));
  else
    console.log(`    ✅ "${field.field}"`);
}

async function updateField(collection, fieldName, meta) {
  const res = await fetch(`${BASE}/fields/${collection}/${fieldName}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ meta }),
  }).then(r => r.json());
  if (res.errors) console.error(`    ❌ Update "${fieldName}":`, res.errors);
  else console.log(`    ✅ "${fieldName}" aktualisiert`);
}

async function addReadPermission(collection) {
  const policies = await fetch(`${BASE}/policies?limit=20`, { headers: H }).then(r => r.json());
  const pub = policies.data?.find(p =>
    p.name?.toLowerCase().includes('public') || p.name?.includes('$t:public')
  );
  if (!pub) return;
  const res = await fetch(`${BASE}/permissions`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ policy: pub.id, collection, action: 'read', fields: ['*'] }),
  }).then(r => r.json());
  if (!res.errors || res.errors[0]?.message?.includes('unique'))
    console.log(`    ✅ Public-Read gesetzt`);
}

// ─── Status-Select Optionen ───────────────────────────────────────────────────
const statusOptionen = {
  choices: [
    { value: 'auto',    label: '🕐 Automatisch (nach Uhrzeit)' },
    { value: 'open',    label: '✅ Geöffnet' },
    { value: 'limited', label: '⚠️  Eingeschränkt' },
    { value: 'closed',  label: '🔴 Geschlossen' },
  ],
};

const statusOptioneKalender = {
  choices: [
    { value: 'open',    label: '✅ Geöffnet' },
    { value: 'limited', label: '⚠️  Eingeschränkt' },
    { value: 'closed',  label: '🔴 Geschlossen' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. platzstatus: Status-Felder auf Select umstellen + Zeitfelder hinzufügen
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n⛳ platzstatus: Interface aktualisieren...');

// Bestehende Status-Felder auf Select-Dropdown umstellen
for (const feldName of ['hauptplatz', 'kurzplatz', 'drivingRange', 'cafe', 'carts']) {
  await updateField('platzstatus', feldName, {
    interface: 'select-dropdown',
    display: 'labels',
    options: statusOptionen,
    display_options: {
      choices: [
        { value: 'auto',    label: 'Automatisch', foreground: '#6b7280', background: '#f3f4f6' },
        { value: 'open',    label: 'Geöffnet',    foreground: '#065f46', background: '#d1fae5' },
        { value: 'limited', label: 'Eingeschränkt', foreground: '#92400e', background: '#fef3c7' },
        { value: 'closed',  label: 'Geschlossen', foreground: '#991b1b', background: '#fee2e2' },
      ],
    },
    note: feldName === 'hauptplatz' ? 'Meisterschaftsplatz' :
          feldName === 'kurzplatz'  ? '6-Loch-Kurzplatz' :
          feldName === 'drivingRange' ? 'Driving Range' :
          feldName === 'cafe' ? 'Restaurant / Café' : 'Golf-Carts',
    width: 'half',
  });
}

// zeitsteuerung JSON verstecken (ersetzt durch einzelne Felder unten)
await updateField('platzstatus', 'zeitsteuerung', { hidden: true });

console.log('\n⏰ Öffnungszeiten-Felder anlegen...');

// Trennlinie / Divider
await createField('platzstatus', {
  field: 'divider_zeiten',
  type: 'alias',
  meta: { interface: 'presentation-divider', special: ['alias', 'no-data'], options: { title: 'Öffnungszeiten (Automatik-Modus)', icon: 'schedule' }, width: 'full' },
});

const zeitFelder = [
  { field: 'hauptplatz_oeffnet',      note: 'Meisterschaftsplatz öffnet', default: '07:00' },
  { field: 'hauptplatz_schliesst',    note: 'Meisterschaftsplatz schließt', default: '20:00' },
  { field: 'kurzplatz_oeffnet',       note: 'Kurzplatz öffnet', default: '07:00' },
  { field: 'kurzplatz_schliesst',     note: 'Kurzplatz schließt', default: '21:00' },
  { field: 'driving_range_oeffnet',   note: 'Driving Range öffnet', default: '07:00' },
  { field: 'driving_range_schliesst', note: 'Driving Range schließt', default: '21:00' },
  { field: 'cafe_oeffnet',            note: 'Restaurant öffnet', default: '09:00' },
  { field: 'cafe_schliesst',          note: 'Restaurant schließt', default: '21:00' },
];

for (const { field, note, default: def } of zeitFelder) {
  await createField('platzstatus', {
    field,
    type: 'string',
    schema: { is_nullable: true, default_value: def },
    meta: {
      interface: 'datetime',
      options: { type: 'time', use24: true },
      note,
      width: 'half',
    },
  });
}

// Aktuell gespeicherte zeitsteuerung-Werte migrieren
console.log('\n📦 Bestehende Öffnungszeiten migrieren...');
const current = await fetch(`${BASE}/items/platzstatus`, { headers: H }).then(r => r.json());
const zt = current.data?.zeitsteuerung ?? {};
if (Object.keys(zt).length > 0) {
  const migration = {
    hauptplatz_oeffnet:      zt.hauptplatzOeffnet      ?? '07:00',
    hauptplatz_schliesst:    zt.hauptplatzSchliesst    ?? '20:00',
    kurzplatz_oeffnet:       zt.kurzplatzOeffnet       ?? '07:00',
    kurzplatz_schliesst:     zt.kurzplatzSchliesst     ?? '21:00',
    driving_range_oeffnet:   zt.drivingRangeOeffnet    ?? '07:00',
    driving_range_schliesst: zt.drivingRangeSchliesst  ?? '21:00',
    cafe_oeffnet:            zt.cafeOeffnet            ?? '09:00',
    cafe_schliesst:          zt.cafeSchliesst          ?? '21:00',
  };
  const saveRes = await fetch(`${BASE}/items/platzstatus`, {
    method: 'PATCH', headers: H, body: JSON.stringify(migration),
  }).then(r => r.json());
  if (saveRes.errors) console.error('  ❌', saveRes.errors);
  else console.log('  ✅ Zeiten migriert:', JSON.stringify(migration));
} else {
  console.log('  ⏭  Keine zeitsteuerung-Daten zum Migrieren');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. platzstatus_kalender Collection
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n📅 platzstatus_kalender Collection anlegen...');

const colRes = await fetch(`${BASE}/collections`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    collection: 'platzstatus_kalender',
    meta: {
      singleton: false,
      icon: 'event',
      color: '#132e21',
      sort_field: 'datum',
      translations: [{ language: 'de-DE', translation: 'Platzstatus-Kalender' }],
    },
    schema: {},
  }),
}).then(r => r.json());

if (colRes.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE')
  console.log('  ⏭  Collection existiert bereits');
else if (colRes.errors)
  console.error('  ❌', colRes.errors);
else
  console.log('  ✅ Collection "platzstatus_kalender" angelegt');

// Felder
await createField('platzstatus_kalender', {
  field: 'datum',
  type: 'date',
  schema: { is_nullable: false },
  meta: { interface: 'datetime', options: { type: 'date' }, required: true, width: 'half', note: 'Für welchen Tag gilt dieser Eintrag?' },
});

await createField('platzstatus_kalender', {
  field: 'hinweis',
  type: 'string',
  schema: { is_nullable: true },
  meta: { interface: 'input', width: 'half', note: 'z.B. "Turniertag", "Aerifizierung"' },
});

// Trennlinie
await createField('platzstatus_kalender', {
  field: 'divider_status',
  type: 'alias',
  meta: {
    interface: 'presentation-divider',
    special: ['alias', 'no-data'],
    options: { title: 'Status für diesen Tag', icon: 'golf_course' },
    width: 'full',
  },
});

const kalenderAnlagen = [
  { field: 'hauptplatz',   note: 'Meisterschaftsplatz' },
  { field: 'kurzplatz',    note: '6-Loch-Kurzplatz' },
  { field: 'drivingRange', note: 'Driving Range' },
  { field: 'cafe',         note: 'Restaurant / Café' },
  { field: 'carts',        note: 'Golf-Carts' },
];

for (const { field, note } of kalenderAnlagen) {
  await createField('platzstatus_kalender', {
    field,
    type: 'string',
    schema: { is_nullable: true },
    meta: {
      interface: 'select-dropdown',
      display: 'labels',
      options: statusOptioneKalender,
      display_options: {
        choices: [
          { value: 'open',    label: 'Geöffnet',    foreground: '#065f46', background: '#d1fae5' },
          { value: 'limited', label: 'Eingeschränkt', foreground: '#92400e', background: '#fef3c7' },
          { value: 'closed',  label: 'Geschlossen', foreground: '#991b1b', background: '#fee2e2' },
        ],
      },
      note: `${note} — leer lassen = Standardwert gilt`,
      width: 'half',
    },
  });
}

await addReadPermission('platzstatus_kalender');

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Dashboard-Panel für platzstatus_kalender
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n📊 Dashboard-Panel für Platzstatus-Kalender...');

const dashboards = await fetch(`${BASE}/dashboards?limit=20`, { headers: H }).then(r => r.json());
const dashboard = dashboards.data?.find(d => d.name === 'GC SHA Übersicht');

if (dashboard?.id) {
  const panels = await fetch(`${BASE}/panels?filter[dashboard][_eq]=${dashboard.id}&limit=50`, { headers: H }).then(r => r.json());
  const hasPlatzKal = panels.data?.some(p => p.name === 'Platzstatus-Kalender');

  if (!hasPlatzKal) {
    const res = await fetch(`${BASE}/panels`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        dashboard: dashboard.id,
        name: 'Platzstatus-Kalender',
        type: 'calendar',
        position_x: 0,
        position_y: 26,
        width: 32,
        height: 16,
        options: {
          collection: 'platzstatus_kalender',
          startDateField: 'datum',
          endDateField: 'datum',
          titleField: 'hinweis',
        },
      }),
    }).then(r => r.json());
    if (res.data?.id) console.log('  ✅ Platzstatus-Kalender Panel angelegt');
    else console.log('  ⚠', JSON.stringify(res.errors ?? res));
  } else {
    console.log('  ⏭  Panel existiert bereits');
  }
}

console.log('\n🎉 Fertig! Platzstatus wurde neu gestaltet.');
console.log('  → Directus → Platzstatus: Status per Dropdown, Zeiten per Uhrzeit-Picker');
console.log('  → Directus → Platzstatus-Kalender: Tages-Overrides anlegen');
console.log('  → Dashboard → Platzstatus-Kalender Panel zeigt die Einträge');
