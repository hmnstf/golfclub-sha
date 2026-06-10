/**
 * setup-page-images.mjs
 *
 * Legt alle Collections/Felder für Seiten-Bilder in Directus an:
 *  - seitenbilder (Singleton): Hero-Bilder für Homepage, Club, Clubmeister, Golf-Lernen, Turniere, Spielgruppen, Spielgebühren
 *  - golf_erleben (Singleton): Hero + 3 Gallery-Bilder + Kurzplatz-Bild + Platzgrafik
 *  - restaurant: hero_bild + bild_innen Felder hinzufügen
 *
 * Ausführen: node scripts/setup-page-images.mjs
 */

const BASE = process.env.DIRECTUS_URL ?? 'http://localhost:8055';
const EMAIL = 'admin@gc-sha.de';
const PASSWORD = 'golfclub2024';

// ─── Login ────────────────────────────────────────────────────────────────────
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then(r => r.json());

const TOKEN = loginRes.data?.access_token;
if (!TOKEN) { console.error('Login fehlgeschlagen:', loginRes); process.exit(1); }
console.log('✅ Login OK');

const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
async function createCollection(name, meta) {
  const res = await fetch(`${BASE}/collections`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ collection: name, meta, schema: {} }),
  }).then(r => r.json());
  if (res.errors) {
    if (res.errors[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
      console.log(`  ⏭ Collection "${name}" existiert bereits`);
    } else {
      console.error(`  ❌ Collection "${name}":`, res.errors);
    }
  } else {
    console.log(`  ✅ Collection "${name}" angelegt`);
  }
}

async function createField(collection, field) {
  const res = await fetch(`${BASE}/fields/${collection}`, {
    method: 'POST', headers: H,
    body: JSON.stringify(field),
  }).then(r => r.json());
  if (res.errors) {
    if (res.errors[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
      console.log(`    ⏭ Feld "${field.field}" existiert bereits`);
    } else {
      console.error(`    ❌ Feld "${field.field}":`, res.errors);
    }
  } else {
    console.log(`    ✅ Feld "${field.field}"`);
  }
}

async function addReadPermission(collection) {
  const policies = await fetch(`${BASE}/policies?filter[name][_contains]=public&limit=5`, { headers: H }).then(r => r.json());
  const pub = policies.data?.find(p =>
    p.name?.toLowerCase().includes('public') || p.name?.includes('$t:public')
  );
  if (!pub) { console.log('  ⚠ Public Policy nicht gefunden'); return; }
  const res = await fetch(`${BASE}/permissions`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ policy: pub.id, collection, action: 'read', fields: ['*'] }),
  }).then(r => r.json());
  if (res.errors && !res.errors[0]?.message?.includes('unique')) {
    console.error(`    ❌ Permission für "${collection}":`, res.errors);
  } else {
    console.log(`    ✅ Public-Read für "${collection}"`);
  }
}

// ─── 1. seitenbilder (Singleton) ─────────────────────────────────────────────
console.log('\n📁 seitenbilder (Singleton)');
await createCollection('seitenbilder', {
  singleton: true,
  icon: 'image',
  translations: [{ language: 'de-DE', translation: 'Seiten-Bilder' }],
});

const heroFelder = [
  { field: 'homepage_hero',     label: 'Homepage Hero' },
  { field: 'club_hero',         label: 'Club-Seite Hero' },
  { field: 'clubmeister_hero',  label: 'Clubmeister Hero' },
  { field: 'golf_lernen_hero',  label: 'Golf-Lernen Hero' },
  { field: 'turniere_hero',     label: 'Turniere Hero' },
  { field: 'spielgruppen_hero', label: 'Spielgruppen Hero' },
  { field: 'spielgebuehren_hero', label: 'Spielgebühren Hero' },
  { field: 'platzstatus_hero',  label: 'Platzstatus Hero' },
];

for (const { field, label } of heroFelder) {
  await createField('seitenbilder', {
    field,
    type: 'uuid',
    schema: { is_nullable: true },
    meta: {
      interface: 'file-image',
      display: 'image',
      note: label,
      special: ['file'],
    },
  });
}

await addReadPermission('seitenbilder');

// ─── 2. golf_erleben (Singleton) ─────────────────────────────────────────────
console.log('\n⛳ golf_erleben (Singleton)');
await createCollection('golf_erleben', {
  singleton: true,
  icon: 'golf_course',
  translations: [{ language: 'de-DE', translation: 'Golf Erleben' }],
});

const golfErlebenFelder = [
  { field: 'hero_bild',       label: 'Hero-Bild (oben)' },
  { field: 'galerie_bild_1',  label: 'Galerie Bild 1 (groß links)' },
  { field: 'galerie_bild_2',  label: 'Galerie Bild 2 (klein rechts oben)' },
  { field: 'galerie_bild_3',  label: 'Galerie Bild 3 (klein rechts unten)' },
  { field: 'kurzplatz_bild',  label: 'Kurzplatz-Bild' },
  { field: 'platzgrafik',     label: 'Platzgrafik' },
];

for (const { field, label } of golfErlebenFelder) {
  await createField('golf_erleben', {
    field,
    type: 'uuid',
    schema: { is_nullable: true },
    meta: {
      interface: 'file-image',
      display: 'image',
      note: label,
      special: ['file'],
    },
  });
}

await addReadPermission('golf_erleben');

// ─── 3. restaurant: hero + bild_innen ────────────────────────────────────────
console.log('\n🍽 restaurant — neue Bild-Felder');

await createField('restaurant', {
  field: 'hero_bild',
  type: 'uuid',
  schema: { is_nullable: true },
  meta: {
    interface: 'file-image',
    display: 'image',
    note: 'Hero-Banner (oben auf der Seite)',
    special: ['file'],
  },
});

await createField('restaurant', {
  field: 'bild_innen',
  type: 'uuid',
  schema: { is_nullable: true },
  meta: {
    interface: 'file-image',
    display: 'image',
    note: 'Restaurant-Innenbild (im Inhaltsbereich)',
    special: ['file'],
  },
});

// ─── Fertig ───────────────────────────────────────────────────────────────────
console.log('\n🎉 Fertig! Alle Collections und Felder sind angelegt.');
console.log('\n📌 Nächste Schritte:');
console.log('  1. Direktus öffnen → Seiten-Bilder / golf_erleben → Bilder hochladen (oder Unsplash nutzen)');
console.log('  2. Restaurant-Eintrag bearbeiten → hero_bild + bild_innen setzen');
console.log('  3. Astro-Seiten lesen Bilder jetzt automatisch aus Directus');
