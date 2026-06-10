/**
 * setup-ui-improvements.mjs
 *
 * Verbessert die Directus UI für:
 * 1. Clubmeister: Name + Bild nebeneinander gruppiert
 * 2. Events: WYSIWYG Beschreibung, Uhrzeit, Ort-Dropdown
 * 3. Golf Erleben: Bessere Bild-Vorschauen + Beschriftungen
 *
 * node scripts/setup-ui-improvements.mjs
 */

const BASE = 'http://localhost:8055';
const login = await fetch(BASE+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@gc-sha.de',password:'golfclub2024'})}).then(r=>r.json());
const T = login.data.access_token;
if (!T) { console.error('Login fehlgeschlagen'); process.exit(1); }
const H = {Authorization:`Bearer ${T}`,'Content-Type':'application/json'};
console.log('✅ Login OK');

const patch = async (col, field, data) => {
  const res = await fetch(`${BASE}/fields/${col}/${field}`,{method:'PATCH',headers:H,body:JSON.stringify(data)}).then(r=>r.json());
  if (res.errors) console.error(`  ❌ ${col}/${field}:`, JSON.stringify(res.errors));
  else console.log(`  ✅ ${col}/${field}`);
};

const create = async (col, data) => {
  const res = await fetch(`${BASE}/fields/${col}`,{method:'POST',headers:H,body:JSON.stringify(data)}).then(r=>r.json());
  if (res.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') console.log(`  ⏭  "${data.field}" existiert`);
  else if (res.errors) console.error(`  ❌ ${data.field}:`, JSON.stringify(res.errors));
  else console.log(`  ✅ ${data.field} erstellt`);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CLUBMEISTER — Name + Bild nebeneinander, mit Gruppen-Trennern
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n🏆 Clubmeister: Felder neu sortieren + gruppieren');

// Divider anlegen
const dividers = [
  { field:'div_herren',      title:'Herren',      sort:3 },
  { field:'div_damen',       title:'Damen',       sort:6 },
  { field:'div_senioren',    title:'Senioren',    sort:9 },
  { field:'div_seniorinnen', title:'Seniorinnen', sort:12 },
  { field:'div_sonstige',    title:'Sonstige Kategorien', sort:15 },
];

for (const { field, title, sort } of dividers) {
  await create('clubmeister', {
    field,
    type: 'alias',
    meta: {
      interface: 'presentation-divider',
      special: ['alias','no-data'],
      options: { title, icon: 'person' },
      width: 'full',
      sort,
    },
  });
}

// Felder-Reihenfolge: Bild direkt nach dem Namen, beide half-width
const feldReihenfolge = [
  { field:'id',             sort:1,  width:'full',  hidden:true },
  { field:'jahr',           sort:2,  width:'full' },
  { field:'div_herren',     sort:3,  width:'full' },
  { field:'herren',         sort:4,  width:'half', note:'Name des Clubmeisters (Herren)' },
  { field:'herren_bild',    sort:5,  width:'half', note:'Foto des Herren-Clubmeisters' },
  { field:'div_damen',      sort:6,  width:'full' },
  { field:'damen',          sort:7,  width:'half', note:'Name der Clubmeisterin (Damen)' },
  { field:'damen_bild',     sort:8,  width:'half', note:'Foto der Damen-Clubmeisterin' },
  { field:'div_senioren',   sort:9,  width:'full' },
  { field:'senioren',       sort:10, width:'half', note:'Name des Senioren-Clubmeisters' },
  { field:'senioren_bild',  sort:11, width:'half', note:'Foto des Senioren-Clubmeisters' },
  { field:'div_seniorinnen',sort:12, width:'full' },
  { field:'seniorinnen',    sort:13, width:'half', note:'Name der Seniorinnen-Clubmeisterin' },
  { field:'seniorinnen_bild',sort:14, width:'half', note:'Foto der Seniorinnen-Clubmeisterin' },
  { field:'div_sonstige',   sort:15, width:'full' },
  { field:'jugend',         sort:16, width:'half', note:'Name des Jugend-Clubmeisters' },
  { field:'brutto',         sort:17, width:'half', note:'Name des Brutto-Clubmeisters' },
];

for (const { field, sort, width, note, hidden } of feldReihenfolge) {
  const meta = { sort, width };
  if (note !== undefined) meta.note = note;
  if (hidden) meta.hidden = true;
  await patch('clubmeister', field, { meta });
}

// Bild-Felder sicherstellen: file-image Interface mit Vorschau
for (const f of ['herren_bild','damen_bild','senioren_bild','seniorinnen_bild']) {
  await patch('clubmeister', f, {
    meta: { interface:'file-image', display:'image', special:['file'] },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EVENTS — WYSIWYG, Uhrzeit, Ort-Dropdown
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n📅 Events: Felder verbessern');

// Datum-Felder: Trennlinie
await create('events', {
  field: 'div_datum',
  type: 'alias',
  meta: {
    interface: 'presentation-divider',
    special: ['alias','no-data'],
    options: { title:'Datum & Uhrzeit', icon:'schedule' },
    width: 'full',
    sort: 2,
  },
});

// Uhrzeit-Felder hinzufügen
await create('events', {
  field: 'uhrzeit_von',
  type: 'string',
  schema: { is_nullable: true },
  meta: {
    interface: 'input',
    options: { placeholder:'z.B. 09:00' },
    note: 'Startzeit (optional)',
    width: 'half',
    sort: 5,
  },
});
await create('events', {
  field: 'uhrzeit_bis',
  type: 'string',
  schema: { is_nullable: true },
  meta: {
    interface: 'input',
    options: { placeholder:'z.B. 17:00' },
    note: 'Endzeit (optional)',
    width: 'half',
    sort: 6,
  },
});

// Ort: Dropdown mit eigenen Einträgen möglich
await patch('events', 'ort', {
  meta: {
    interface: 'select-dropdown',
    width: 'half',
    sort: 8,
    note: 'Veranstaltungsort',
    options: {
      allowOther: true,
      choices: [
        { text:'Golfanlage GC SHA', value:'Golfanlage GC SHA' },
        { text:'Clubhaus', value:'Clubhaus' },
        { text:'Restaurant Brassie', value:'Restaurant Brassie' },
        { text:'Driving Range', value:'Driving Range' },
        { text:'18-Loch-Platz', value:'18-Loch-Platz' },
        { text:'Kurzplatz', value:'Kurzplatz' },
      ],
    },
  },
});

// Beschreibung → WYSIWYG
await patch('events', 'beschreibung', {
  meta: {
    interface: 'flexible-editor-interface',
    options: {},
    width: 'full',
    sort: 10,
    note: 'Detaillierte Beschreibung (optional)',
  },
});

// Anmeldelink
await patch('events', 'anmeldelink', {
  meta: {
    interface: 'input',
    options: { placeholder:'https://...' },
    width: 'half',
    sort: 11,
    note: 'Link zur Anmeldung (optional)',
  },
});

// Typ: Dropdown mit deutschen Labels
await patch('events', 'typ', {
  meta: {
    interface: 'select-dropdown',
    width: 'half',
    sort: 9,
    note: 'Veranstaltungs-Kategorie',
    options: {
      choices: [
        { text:'Turnier', value:'turnier' },
        { text:'Clubveranstaltung', value:'club' },
        { text:'Golfschule / Kurs', value:'golfschule' },
        { text:'Restaurant', value:'restaurant' },
        { text:'Sonstiges', value:'sonstiges' },
      ],
    },
  },
});

// Highlight
await patch('events', 'highlight', {
  meta: { interface:'boolean', width:'half', sort:12, note:'Auf Startseite anzeigen?' },
});

// Felder sortieren
const eventSorts = [
  { field:'titel',      sort:1 },
  { field:'div_datum',  sort:2 },
  { field:'datum_von',  sort:3 },
  { field:'datum_bis',  sort:4 },
  { field:'uhrzeit_von',sort:5 },
  { field:'uhrzeit_bis',sort:6 },
  { field:'typ',        sort:7 },
  { field:'ort',        sort:8 },
  { field:'beschreibung',sort:9 },
  { field:'anmeldelink',sort:10 },
  { field:'highlight',  sort:11 },
];
for (const {field, sort} of eventSorts) {
  await patch('events', field, { meta:{ sort } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GOLF ERLEBEN — Beschriftungen mit Vorschau-Hinweis
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n⛳ Golf Erleben: Bild-Felder mit besseren Beschriftungen');

await patch('golf_erleben', 'hero_bild', {
  meta: {
    interface: 'file-image',
    display: 'image',
    special: ['file'],
    note: 'Header-Bild ganz oben auf der Seite (1920×600px empfohlen)',
    width: 'full',
    sort: 1,
  },
});

// Divider für die 3er-Galerie
await create('golf_erleben', {
  field: 'div_galerie',
  type: 'alias',
  meta: {
    interface: 'presentation-divider',
    special: ['alias','no-data'],
    options: { title:'Galerie (3 Bilder beim 18-Loch-Abschnitt)', icon:'photo_library' },
    width: 'full',
    sort: 2,
  },
});

await patch('golf_erleben', 'galerie_bild_1', {
  meta: {
    interface: 'file-image', display: 'image', special: ['file'],
    note: 'Großes Bild links (nimmt 2 Zeilen ein)',
    width: 'half', sort: 3,
  },
});
await patch('golf_erleben', 'galerie_bild_2', {
  meta: {
    interface: 'file-image', display: 'image', special: ['file'],
    note: 'Kleines Bild rechts oben',
    width: 'half', sort: 4,
  },
});
await patch('golf_erleben', 'galerie_bild_3', {
  meta: {
    interface: 'file-image', display: 'image', special: ['file'],
    note: 'Kleines Bild rechts unten',
    width: 'half', sort: 5,
  },
});

await create('golf_erleben', {
  field: 'div_sonstige_bilder',
  type: 'alias',
  meta: {
    interface: 'presentation-divider',
    special: ['alias','no-data'],
    options: { title:'Kurzplatz & Platzgrafik', icon:'map' },
    width: 'full',
    sort: 6,
  },
});

await patch('golf_erleben', 'kurzplatz_bild', {
  meta: {
    interface: 'file-image', display: 'image', special: ['file'],
    note: 'Hauptbild des Kurzplatz-Abschnitts',
    width: 'half', sort: 7,
  },
});
await patch('golf_erleben', 'platzgrafik', {
  meta: {
    interface: 'file-image', display: 'image', special: ['file'],
    note: 'Platzgrafik / Übersichtskarte (PNG oder JPG)',
    width: 'half', sort: 8,
  },
});

console.log('\n🎉 Fertig! Bitte Directus neu laden (Cmd+Shift+R).');
